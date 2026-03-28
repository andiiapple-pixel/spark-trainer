const express = require('express');
const bcrypt = require('bcrypt');
const { body, validationResult } = require('express-validator');
const pool = require('../db/pool');
const tokenService = require('../services/tokenService');
const emailService = require('../services/emailService');
const authenticate = require('../middleware/authenticate');
const { authLimiter } = require('../middleware/rateLimiter');

const router = express.Router();
const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS || '12');

function safeUser(u) {
  const { password_hash, failed_login_attempts, locked_until, ...safe } = u;
  return safe;
}

async function issueTokenPair(user, opts) {
  const rawRefresh = tokenService.generateRefreshToken();
  const refreshHash = tokenService.hashToken(rawRefresh);
  const expiresAt = new Date(Date.now() + 7 * 86400000);
  await pool.query(
    `INSERT INTO refresh_tokens (user_id, token_hash, device_label, ip_address, user_agent, expires_at)
     VALUES ($1,$2,$3,$4,$5,$6)`,
    [user.id, refreshHash, opts?.deviceLabel || null, opts?.ipAddress || null, opts?.userAgent || null, expiresAt]
  );
  return { accessToken: tokenService.issueAccessToken(user), refreshToken: rawRefresh };
}

// All routes require authentication
router.use(authenticate);

// ─── PUT /profile ─────────────────────────────────────────────────────────────
router.put('/profile', async (req, res) => {
  const allowed = [
    'age','biological_sex','height_cm','weight_kg','fitness_goal','experience_level',
    'injuries','equipment_access','training_days_per_week','preferred_session_mins',
    'diet_style','sleep_quality','stress_level','units_preference','extra_data'
  ];
  const updates = {};
  for (const key of allowed) {
    if (req.body[key] !== undefined) updates[key] = req.body[key];
  }

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ error: 'No valid fields provided' });
  }

  const setClauses = Object.keys(updates).map((k, i) => `${k}=$${i + 1}`);
  const values = [...Object.values(updates), req.user.id];

  const { rows } = await pool.query(
    `UPDATE user_profiles SET ${setClauses.join(',')}, updated_at=NOW()
     WHERE user_id=$${values.length} RETURNING *`,
    values
  );

  if (!rows.length) {
    // Insert if doesn't exist
    await pool.query('INSERT INTO user_profiles (user_id) VALUES ($1) ON CONFLICT DO NOTHING', [req.user.id]);
    return res.json({ profile: { user_id: req.user.id, ...updates } });
  }

  res.json({ profile: rows[0] });
});

// ─── PUT /change-password ─────────────────────────────────────────────────────
router.put('/change-password',
  authLimiter,
  [
    body('current_password').notEmpty(),
    body('new_password')
      .isLength({ min: 8 })
      .matches(/[A-Z]/).matches(/[0-9]/).matches(/[^A-Za-z0-9]/),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { current_password, new_password } = req.body;

    const { rows } = await pool.query('SELECT * FROM users WHERE id=$1', [req.user.id]);
    const user = rows[0];

    const valid = await bcrypt.compare(current_password, user.password_hash);
    if (!valid) return res.status(400).json({ error: 'Current password is incorrect.' });

    const password_hash = await bcrypt.hash(new_password, BCRYPT_ROUNDS);
    await pool.query('UPDATE users SET password_hash=$1 WHERE id=$2', [password_hash, user.id]);

    // Revoke all OTHER refresh tokens
    const currentRefreshToken = req.body.current_refresh_token;
    if (currentRefreshToken) {
      const currentHash = tokenService.hashToken(currentRefreshToken);
      await pool.query(
        `UPDATE refresh_tokens SET revoked_at=NOW()
         WHERE user_id=$1 AND revoked_at IS NULL AND token_hash != $2`,
        [user.id, currentHash]
      );
    } else {
      await pool.query(
        'UPDATE refresh_tokens SET revoked_at=NOW() WHERE user_id=$1 AND revoked_at IS NULL',
        [user.id]
      );
    }

    await emailService.sendPasswordChangedEmail(user).catch(console.error);

    // Issue fresh tokens for this session
    const tokens = await issueTokenPair(user, { ipAddress: req.ip, userAgent: req.headers['user-agent'] });
    res.json({ message: 'Password changed successfully.', ...tokens });
  }
);

// ─── PUT /change-email ────────────────────────────────────────────────────────
router.put('/change-email',
  authLimiter,
  [
    body('new_email').isEmail().normalizeEmail(),
    body('password').notEmpty(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { new_email, password } = req.body;
    const { rows } = await pool.query('SELECT * FROM users WHERE id=$1', [req.user.id]);
    const user = rows[0];

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(400).json({ error: 'Password is incorrect.' });

    const existing = await pool.query('SELECT id FROM users WHERE email=$1', [new_email]);
    if (existing.rows.length) return res.status(409).json({ error: 'That email is already in use.' });

    const rawToken = tokenService.generateOpaqueToken();
    const tokenHash = tokenService.hashOpaqueToken(rawToken);

    // Store new email in token record via a temp table approach — we'll embed new_email in token extra
    // Simple: store as a JSON-encoded token_hash keying the new email in Redis/DB
    // For simplicity without Redis dependency here, store in email_verification_tokens with user_id
    // and look up new_email from request at verify time — we'll encode new_email in a separate column
    // Since schema doesn't have extra column, we'll embed it as base64 in the raw token itself

    // Encode: rawToken|newEmail → base64
    const combined = Buffer.from(`${rawToken}|${new_email}`).toString('base64url');
    const combinedHash = tokenService.hashOpaqueToken(combined);

    await pool.query(
      `INSERT INTO email_verification_tokens (user_id, token_hash, expires_at)
       VALUES ($1,$2, NOW() + INTERVAL '24 hours')`,
      [user.id, combinedHash]
    );

    await emailService.sendEmailChangeVerification(user, new_email, combined).catch(console.error);

    res.json({ message: 'Verification email sent to your new address. Your email will change once confirmed.' });
  }
);

// ─── POST /verify-email-change ────────────────────────────────────────────────
router.post('/verify-email-change', async (req, res) => {
  const { token } = req.body;
  if (!token) return res.status(400).json({ error: 'Token required' });

  let rawToken, newEmail;
  try {
    const decoded = Buffer.from(token, 'base64url').toString('utf8');
    [rawToken, newEmail] = decoded.split('|');
  } catch {
    return res.status(400).json({ error: 'Invalid token format' });
  }

  const tokenHash = tokenService.hashOpaqueToken(token);
  const { rows } = await pool.query(
    `SELECT evt.* FROM email_verification_tokens evt
     WHERE evt.token_hash = $1`,
    [tokenHash]
  );

  const record = rows[0];
  if (!record) return res.status(400).json({ error: 'Invalid or expired link.' });
  if (record.used_at) return res.status(400).json({ error: 'This link has already been used.' });
  if (new Date(record.expires_at) < new Date()) return res.status(400).json({ error: 'Link expired.' });
  if (record.user_id !== req.user.id) return res.status(403).json({ error: 'Forbidden' });

  const existing = await pool.query('SELECT id FROM users WHERE email=$1', [newEmail]);
  if (existing.rows.length) return res.status(409).json({ error: 'That email is now taken by another account.' });

  await pool.query('UPDATE users SET email=$1 WHERE id=$2', [newEmail, record.user_id]);
  await pool.query('UPDATE email_verification_tokens SET used_at=NOW() WHERE id=$1', [record.id]);

  res.json({ message: 'Email address updated successfully.' });
});

// ─── GET /sessions ────────────────────────────────────────────────────────────
router.get('/sessions', async (req, res) => {
  const { rows } = await pool.query(
    `SELECT id, device_label, ip_address, last_used_at, created_at, expires_at
     FROM refresh_tokens
     WHERE user_id=$1 AND revoked_at IS NULL AND expires_at > NOW()
     ORDER BY last_used_at DESC`,
    [req.user.id]
  );
  res.json({ sessions: rows });
});

// ─── DELETE /sessions/:id ─────────────────────────────────────────────────────
router.delete('/sessions/:id', async (req, res) => {
  const { rows } = await pool.query(
    'UPDATE refresh_tokens SET revoked_at=NOW() WHERE id=$1 AND user_id=$2 RETURNING id',
    [req.params.id, req.user.id]
  );
  if (!rows.length) return res.status(404).json({ error: 'Session not found.' });
  res.json({ message: 'Session revoked.' });
});

// ─── POST /delete-account ─────────────────────────────────────────────────────
router.post('/delete-account',
  authLimiter,
  [body('password').notEmpty()],
  async (req, res) => {
    const { password } = req.body;
    const { rows } = await pool.query('SELECT * FROM users WHERE id=$1', [req.user.id]);
    const user = rows[0];

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(400).json({ error: 'Password is incorrect.' });

    // Soft delete: anonymise PII, deactivate
    const anonymisedEmail = `deleted_${user.id}@deleted.invalid`;
    await pool.query(
      `UPDATE users SET
        is_active=FALSE,
        email=$1,
        full_name='Deleted User',
        password_hash='deleted'
       WHERE id=$2`,
      [anonymisedEmail, user.id]
    );

    // Revoke all tokens
    await pool.query('UPDATE refresh_tokens SET revoked_at=NOW() WHERE user_id=$1 AND revoked_at IS NULL', [user.id]);

    await emailService.sendAccountDeletedEmail(user).catch(console.error);

    res.json({ message: 'Account deleted.' });
  }
);

module.exports = router;
