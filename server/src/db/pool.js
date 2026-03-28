const { Pool } = require('pg');

// Render internal URLs (dpg-xxx without domain) don't need SSL
// External URLs and those with sslmode=require do
const dbUrl = process.env.DATABASE_URL || '';
const useSSL = dbUrl.includes('.render.com') || dbUrl.includes('sslmode=require');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: useSSL ? { rejectUnauthorized: false } : false,
  max: 10,
  min: 2,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  allowExitOnIdle: true,
});

pool.on('error', (err) => {
  console.error('Unexpected PostgreSQL pool error', err);
});

// Health check on startup
pool.connect()
  .then(client => {
    console.log('Database connected successfully');
    client.release();
  })
  .catch(err => console.error('Database connection failed on startup:', err.message));

module.exports = pool;
