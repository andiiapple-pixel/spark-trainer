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

// ─── Error handler ────────────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

module.exports = app;
