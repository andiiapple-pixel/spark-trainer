require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const express    = require('express');
const helmet     = require('helmet');
const cors       = require('cors');
const compression = require('compression');

const authRoutes      = require('./routes/auth');
const accountRoutes   = require('./routes/account');
const dataRoutes      = require('./routes/data');
const exerciseRoutes  = require('./routes/exercises');
const recoveryRoutes  = require('./routes/recovery');
const aiRoutes        = require('./routes/ai');

const app = express();

// ─── Security Headers ─────────────────────────────────────────────────────────
app.use(helmet());

// ─── Compression ──────────────────────────────────────────────────────────────
app.use(compression());

// ─── CORS ─────────────────────────────────────────────────────────────────────
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
  methods: ['GET','POST','PUT','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization'],
}));

// ─── Body Parsing ─────────────────────────────────────────────────────────────
app.use(express.json({ limit: '2mb' }));

// ─── HTTPS redirect in production ────────────────────────────────────────────
if (process.env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    if (req.headers['x-forwarded-proto'] !== 'https') {
      return res.redirect(301, `https://${req.headers.host}${req.url}`);
    }
    next();
  });
}

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/auth',      authRoutes);
app.use('/api/account',   accountRoutes);
app.use('/api/data',      dataRoutes);
app.use('/api/exercises', exerciseRoutes);
app.use('/api/recovery',  recoveryRoutes);
app.use('/api/ai',        aiRoutes);

// ─── Health check ─────────────────────────────────────────────────────────────
app.get('/health', (req, res) => res.json({ ok: true }));

// ─── Run migrations on demand ────────────────────────────────────────────────
app.post('/migrate', async (req, res) => {
  const migrateKey = process.env.MIGRATE_SECRET || process.env.JWT_REFRESH_SECRET?.slice(0, 16);
  if (!migrateKey || req.headers['x-migrate-key'] !== migrateKey) {
    return res.status(403).json({ error: 'forbidden' });
  }
  try {
    const fs = require('fs');
    const path = require('path');
    const pool = require('./db/pool');
    const migrationsDir = path.join(__dirname, 'db/migrations');
    await pool.query(`CREATE TABLE IF NOT EXISTS _migrations (id SERIAL PRIMARY KEY, filename VARCHAR(255) UNIQUE NOT NULL, run_at TIMESTAMP DEFAULT NOW())`);
    const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();
    const results = [];
    for (const file of files) {
      const { rows } = await pool.query('SELECT id FROM _migrations WHERE filename = $1', [file]);
      if (rows.length > 0) { results.push({ file, status: 'skipped' }); continue; }
      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
      await pool.query(sql);
      await pool.query('INSERT INTO _migrations (filename) VALUES ($1)', [file]);
      results.push({ file, status: 'ran' });
    }
    res.json({ ok: true, migrations: results });
  } catch (err) {
    console.error('Migration error:', err);
    res.status(500).json({ error: 'Migration failed' });
  }
});

// ─── Temporary admin endpoint (remove after use) ────────────────────────────
app.post('/admin/reset', async (req, res) => {
  const migrateKey = process.env.MIGRATE_SECRET || process.env.JWT_REFRESH_SECRET?.slice(0, 16);
  const providedKey = req.headers['x-migrate-key'];
  if (!migrateKey || providedKey !== migrateKey) {
    return res.status(403).json({ error: 'forbidden', expected_length: migrateKey?.length, got_length: providedKey?.length, match: providedKey === migrateKey });
  }
  const pool = require('./db/pool');
  const action = req.body?.action;
  try {
    if (action === 'delete-users') {
      // Delete all user data (cascade handles related tables)
      const { rowCount } = await pool.query('DELETE FROM users');
      return res.json({ ok: true, deleted: rowCount });
    }
    if (action === 'test-email') {
      const emailService = require('./services/emailService');
      const to = req.body.to;
      // Check env vars first
      const envCheck = {
        SMTP_PASS: !!process.env.SMTP_PASS,
        SMTP_PASS_length: process.env.SMTP_PASS?.length || 0,
        EMAIL_FROM: process.env.EMAIL_FROM || 'NOT SET',
        APP_URL: process.env.APP_URL || 'NOT SET',
        APP_NAME: process.env.APP_NAME || 'NOT SET',
      };
      try {
        await emailService.sendVerificationEmail(
          { id: 'test', email: to, full_name: 'Test User' },
          'test-token-123'
        );
        return res.json({ ok: true, envCheck, message: 'Email sent successfully' });
      } catch (emailErr) {
        return res.json({ ok: false, envCheck, error: emailErr.message, stack: emailErr.stack });
      }
    }
    if (action === 'env-check') {
      return res.json({
        SMTP_PASS: process.env.SMTP_PASS ? `set (${process.env.SMTP_PASS.length} chars, starts: ${process.env.SMTP_PASS.slice(0, 6)})` : 'NOT SET',
        EMAIL_FROM: process.env.EMAIL_FROM || 'NOT SET',
        APP_URL: process.env.APP_URL || 'NOT SET',
        APP_NAME: process.env.APP_NAME || 'NOT SET',
        NODE_VERSION: process.version,
      });
    }
    res.status(400).json({ error: 'Unknown action. Use: delete-users, test-email, env-check' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Error handler ────────────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

module.exports = app;
