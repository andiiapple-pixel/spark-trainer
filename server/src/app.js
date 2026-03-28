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

// ─── Temporary diagnostic (remove after debugging) ───────────────────────────
app.get('/diag', async (req, res) => {
  if (req.headers['x-migrate-key'] !== process.env.JWT_REFRESH_SECRET?.slice(0, 16)) {
    return res.status(403).json({ error: 'forbidden' });
  }
  const results = {};
  try {
    const pool = require('./db/pool');
    const { rows } = await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name");
    results.tables = rows.map(r => r.table_name);
    const { rows: cols } = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name='users' ORDER BY ordinal_position");
    results.usersColumns = cols.map(r => r.column_name);
    // Test insert/rollback
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query("INSERT INTO users (email, password_hash, full_name) VALUES ('__diag_test__', '__hash__', 'Diag')");
      await client.query('ROLLBACK');
      results.insertTest = 'ok';
    } catch (e) {
      await client.query('ROLLBACK').catch(() => {});
      results.insertTest = e.message;
    } finally { client.release(); }
  } catch (e) {
    results.error = e.message;
  }
  res.json(results);
});

// ─── Run migrations on demand ────────────────────────────────────────────────
app.post('/migrate', async (req, res) => {
  if (req.headers['x-migrate-key'] !== process.env.JWT_REFRESH_SECRET?.slice(0, 16)) {
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
    res.status(500).json({ error: err.message });
  }
});

// ─── Error handler ────────────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('Global error handler:', err.message, err.stack?.split('\n').slice(0, 3).join('\n'));
  res.status(500).json({ error: 'Internal server error', _debug: err.message, _path: req.path });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

module.exports = app;
