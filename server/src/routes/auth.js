const express = require('express');
const bcrypt = require('bcrypt');
const { body, validationResult } = require('express-validator');
const pool = require('../db/pool');
const tokenService = require('../services/tokenService');
const emailService = require('../services/emailService');
const authenticate = require('../middleware/authenticate');
const { authLimiter, strictLimiter, loginLimiter } = require('../middleware/rateLimiter');

const router = express.Router();
const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS || '12');
const LOCK_THRESHOLD = 5;
const LOCK_DURATION_MINS = 15;

// ─── Helpers ──────────────────────────────────────────────────────────────────
function safeUser(u) {
  const { password_hash, failed_login_attempts, locked_until, ...safe } = u;
  return safe;
}

async function issueTokenPair(user, { rememberMe = false, deviceLabel, ipAddress, userAgent }, client) {
  const db = client || pool;
  const rawRefresh = tokenService.generateRefreshToken();
  const refreshHash = tokenService.hashToken(rawRefresh);
  const expiryDays = rememberMe ? 30 : 7;
  const expiresAt = new Date(Date.now() + expiryDays * 86400000);

  await db.query(
    `INSERT INTO refresh_tokens (user_id, token_hash, device_label, ip_address, user_agent, expires_at)
     VALUES ($1,$2,$3,$4,$5,$6)`,
    [user.id, refreshHash, deviceLabel || null, ipAddress || null, userAgent || null, expiresAt]
  );

  const accessToken = tokenService.issueAccessToken(user);
  return { accessToken, refreshToken: rawRefresh };
}

async function revokeAllRefreshTokens(userId, client) {
  const db = client || pool;
  await db.query(
    `UPDATE refresh_tokens SET revoked_at = NOW()
     WHERE user_id = $1 AND revoked_at IS NULL`,
    [userId]
  );
}

const passwordRules = body('password')
  .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
  .matches(/[A-Z]/).withMessage('Password must contain an uppercase letter')
  .matches(/[0-9]/).withMessage('Password must contain a number')
  .matches(/[^A-Za-z0-9]/).withMessage('Password must contain a special character');

// ─── POST /register ───────────────────────────────────────────────────────────
router.post('/register',
  authLimiter,
  [
    body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
    body('full_name').trim().notEmpty().withMessage('Full name required'),
    passwordRules,
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

      const { email, password, full_name } = req.body;

      const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
      if (existing.rows.length) {
        return res.status(409).json({ error: 'An account with this email already exists.' });
      }

      const password_hash = await bcrypt.hash(password, BCRYPT_ROUNDS);
      const { rows } = await pool.query(
        `INSERT INTO users (email, password_hash, full_name) VALUES ($1,$2,$3) RETURNING *`,
        [email, password_hash, full_name]
      );
      const user = rows[0];

      // Create empty profile row
      await pool.query('INSERT INTO user_profiles (user_id) VALUES ($1) ON CONFLICT DO NOTHING', [user.id]);

      // Send verification email
      const rawToken = tokenService.generateOpaqueToken();
      const tokenHash = tokenService.hashOpaqueToken(rawToken);
      await pool.query(
        `INSERT INTO email_verification_tokens (user_id, token_hash, expires_at)
         VALUES ($1,$2, NOW() + INTERVAL '24 hours')`,
        [user.id, tokenHash]
      );
      await emailService.sendVerificationEmail(user, rawToken).catch(console.error);

      res.status(201).json({ message: 'Account created. Please check your email to verify your account.' });
    } catch (err) {
      console.error('Register error:', err);
      res.status(500).json({ error: 'Registration failed', detail: err.message });
    }
  }
);

// ─── POST /login ──────────────────────────────────────────────────────────────
router.post('/login',
  loginLimiter,
  [
    body('email').isEmail().normalizeEmail(),
    body('password').notEmpty(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { email, password, device_label, remember_me } = req.body;

    const { rows } = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = rows[0];

    if (!user || !user.is_active) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    // Check lock
    if (user.locked_until && new Date(user.locked_until) > new Date()) {
      const mins = Math.ceil((new Date(user.locked_until) - Date.now()) / 60000);
      return res.status(423).json({ error: `Account locked. Try again in ${mins} minute(s).`, code: 'ACCOUNT_LOCKED' });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      const attempts = user.failed_login_attempts + 1;
      if (attempts >= LOCK_THRESHOLD) {
        const lockedUntil = new Date(Date.now() + LOCK_DURATION_MINS * 60000);
        await pool.query(
          'UPDATE users SET failed_login_attempts=$1, locked_until=$2 WHERE id=$3',
          [attempts, lockedUntil, user.id]
        );
        await emailService.sendAccountLockedEmail(user, lockedUntil).catch(console.error);
        return res.status(423).json({ error: 'Account locked for 15 minutes due to too many failed attempts.', code: 'ACCOUNT_LOCKED' });
      }
      await pool.query('UPDATE users SET failed_login_attempts=$1 WHERE id=$2', [attempts, user.id]);
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    if (!user.email_verified) {
      return res.status(403).json({ error: 'Please verify your email before logging in.', code: 'EMAIL_NOT_VERIFIED' });
    }

    // Reset failed attempts, update last login
    await pool.query(
      'UPDATE users SET failed_login_attempts=0, locked_until=NULL, last_login_at=NOW() WHERE id=$1',
      [user.id]
    );

    const { accessToken, refreshToken } = await issueTokenPair(user, {
      rememberMe: !!remember_me,
      deviceLabel: device_label,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    res.json({ accessToken, refreshToken, user: safeUser(user) });
  }
);

// ─── POST /logout ─────────────────────────────────────────────────────────────
router.post('/logout', async (req, res) => {
  const { refreshToken } = req.body;
  if (refreshToken) {
    const hash = tokenService.hashToken(refreshToken);
    await pool.query(
      'UPDATE refresh_tokens SET revoked_at=NOW() WHERE token_hash=$1 AND revoked_at IS NULL',
      [hash]
    );
  }
  res.json({ message: 'Logged out.' });
});

// ─── POST /logout-all-devices ─────────────────────────────────────────────────
router.post('/logout-all-devices', authenticate, async (req, res) => {
  await revokeAllRefreshTokens(req.user.id);
  res.json({ message: 'All sessions revoked.' });
});

// ─── POST /refresh ────────────────────────────────────────────────────────────
router.post('/refresh', async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(400).json({ error: 'Refresh token required' });

  const tokenHash = tokenService.hashToken(refreshToken);
  const { rows } = await pool.query(
    `SELECT rt.*, u.id as uid, u.email, u.full_name, u.is_active
     FROM refresh_tokens rt
     JOIN users u ON u.id = rt.user_id
     WHERE rt.token_hash = $1`,
    [tokenHash]
  );

  const record = rows[0];
  if (!record) return res.status(401).json({ error: 'Invalid refresh token' });
  if (record.revoked_at) return res.status(401).json({ error: 'Refresh token revoked' });
  if (new Date(record.expires_at) < new Date()) return res.status(401).json({ error: 'Refresh token expired' });
  if (!record.is_active) return res.status(401).json({ error: 'Account deactivated' });

  // Rotate: revoke old, issue new
  await pool.query('UPDATE refresh_tokens SET revoked_at=NOW() WHERE id=$1', [record.id]);

  const user = { id: record.uid, email: record.email, full_name: record.full_name };
  const isRememberMe = (new Date(record.expires_at) - new Date(record.created_at)) > 10 * 86400000;
  const { accessToken, refreshToken: newRefresh } = await issueTokenPair(user, {
    rememberMe: isRememberMe,
    deviceLabel: record.device_label,
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
  });

  res.json({ accessToken, refreshToken: newRefresh });
});

// ─── POST /verify-email ───────────────────────────────────────────────────────
router.post('/verify-email', async (req, res) => {
  const { token } = req.body;
  if (!token) return res.status(400).json({ error: 'Token required' });

  const tokenHash = tokenService.hashOpaqueToken(token);
  const { rows } = await pool.query(
    `SELECT evt.*, u.id as uid, u.email, u.full_name, u.email_verified
     FROM email_verification_tokens evt
     JOIN users u ON u.id = evt.user_id
     WHERE evt.token_hash = $1`,
    [tokenHash]
  );

  const record = rows[0];
  if (!record) return res.status(400).json({ error: 'Invalid or expired verification link.', code: 'INVALID_TOKEN' });
  if (record.used_at) return res.status(400).json({ error: 'This link has already been used.', code: 'ALREADY_USED' });
  if (new Date(record.expires_at) < new Date()) return res.status(400).json({ error: 'Verification link expired.', code: 'EXPIRED' });

  await pool.query(
    'UPDATE users SET email_verified=TRUE, email_verified_at=NOW() WHERE id=$1',
    [record.uid]
  );
  await pool.query('UPDATE email_verification_tokens SET used_at=NOW() WHERE id=$1', [record.id]);

  const user = { id: record.uid, email: record.email, full_name: record.full_name };
  const { accessToken, refreshToken } = await issueTokenPair(user, { ipAddress: req.ip, userAgent: req.headers['user-agent'] });

  await emailService.sendEmailVerifiedConfirmation(user).catch(console.error);

  res.json({ message: 'Email verified.', accessToken, refreshToken, user: safeUser({ ...user, email_verified: true }) });
});

// ─── POST /resend-verification ────────────────────────────────────────────────
router.post('/resend-verification',
  strictLimiter,
  [body('email').isEmail().normalizeEmail()],
  async (req, res) => {
    // Always respond the same regardless
    res.json({ message: 'If that email exists and is unverified, a new link has been sent.' });

    const { email } = req.body;
    const { rows } = await pool.query('SELECT * FROM users WHERE email=$1', [email]);
    const user = rows[0];
    if (!user || user.email_verified) return;

    const rawToken = tokenService.generateOpaqueToken();
    const tokenHash = tokenService.hashOpaqueToken(rawToken);
    await pool.query(
      `INSERT INTO email_verification_tokens (user_id, token_hash, expires_at)
       VALUES ($1,$2, NOW() + INTERVAL '24 hours')`,
      [user.id, tokenHash]
    );
    await emailService.sendVerificationEmail(user, rawToken).catch(console.error);
  }
);

// ─── POST /forgot-password ────────────────────────────────────────────────────
router.post('/forgot-password',
  strictLimiter,
  [body('email').isEmail().normalizeEmail()],
  async (req, res) => {
    res.json({ message: 'If that email is registered, a reset link has been sent.' });

    const { email } = req.body;
    const { rows } = await pool.query('SELECT * FROM users WHERE email=$1 AND is_active=TRUE', [email]);
    const user = rows[0];
    if (!user) return;

    const rawToken = tokenService.generateOpaqueToken();
    const tokenHash = tokenService.hashOpaqueToken(rawToken);
    await pool.query(
      `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
       VALUES ($1,$2, NOW() + INTERVAL '1 hour')`,
      [user.id, tokenHash]
    );
    await emailService.sendPasswordResetEmail(user, rawToken).catch(console.error);
  }
);

// ─── POST /reset-password ─────────────────────────────────────────────────────
router.post('/reset-password',
  authLimiter,
  [
    body('token').notEmpty(),
    passwordRules.optional().withMessage('').bail()
      .isLength({ min: 8 }).matches(/[A-Z]/).matches(/[0-9]/).matches(/[^A-Za-z0-9]/),
  ],
  async (req, res) => {
    const { token, password } = req.body;
    if (!token || !password) return res.status(400).json({ error: 'Token and new password required' });

    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const tokenHash = tokenService.hashOpaqueToken(token);
    const { rows } = await pool.query(
      `SELECT prt.*, u.id as uid, u.email, u.full_name
       FROM password_reset_tokens prt
       JOIN users u ON u.id = prt.user_id
       WHERE prt.token_hash = $1`,
      [tokenHash]
    );

    const record = rows[0];
    if (!record) return res.status(400).json({ error: 'Invalid or expired reset link.', code: 'INVALID_TOKEN' });
    if (record.used_at) return res.status(400).json({ error: 'This reset link has already been used.', code: 'ALREADY_USED' });
    if (new Date(record.expires_at) < new Date()) return res.status(400).json({ error: 'Reset link expired.', code: 'EXPIRED' });

    const password_hash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    await pool.query('UPDATE users SET password_hash=$1, failed_login_attempts=0, locked_until=NULL WHERE id=$2', [password_hash, record.uid]);
    await pool.query('UPDATE password_reset_tokens SET used_at=NOW() WHERE id=$1', [record.id]);
    await revokeAllRefreshTokens(record.uid);

    const user = { id: record.uid, email: record.email, full_name: record.full_name };
    await emailService.sendPasswordChangedEmail(user).catch(console.error);

    res.json({ message: 'Password reset successfully. Please log in.' });
  }
);

// ─── GET /me ──────────────────────────────────────────────────────────────────
router.get('/me', authenticate, async (req, res) => {
  const { rows: profileRows } = await pool.query(
    'SELECT * FROM user_profiles WHERE user_id=$1', [req.user.id]
  );
  res.json({ user: safeUser(req.user), profile: profileRows[0] || null });
});

module.exports = router;
