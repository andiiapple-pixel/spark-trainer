const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const PRIVATE_KEY = (process.env.JWT_PRIVATE_KEY || '').replace(/\\n/g, '\n');
const PUBLIC_KEY  = (process.env.JWT_PUBLIC_KEY  || '').replace(/\\n/g, '\n');
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;

// ─── Access Token (RS256, 15 min) ─────────────────────────────────────────────
function issueAccessToken(user) {
  return jwt.sign(
    { sub: user.id, email: user.email, name: user.full_name },
    PRIVATE_KEY,
    { algorithm: 'RS256', expiresIn: '15m' }
  );
}

function verifyAccessToken(token) {
  return jwt.verify(token, PUBLIC_KEY, { algorithms: ['RS256'] });
}

// ─── Refresh Token (HMAC, opaque raw value) ───────────────────────────────────
function generateRefreshToken() {
  return crypto.randomBytes(64).toString('hex');
}

function hashToken(rawToken) {
  return crypto.createHmac('sha256', REFRESH_SECRET).update(rawToken).digest('hex');
}

// ─── One-time tokens (email verification / password reset) ────────────────────
function generateOpaqueToken() {
  return crypto.randomBytes(32).toString('hex');
}

function hashOpaqueToken(raw) {
  return crypto.createHash('sha256').update(raw).digest('hex');
}

module.exports = {
  issueAccessToken,
  verifyAccessToken,
  generateRefreshToken,
  hashToken,
  generateOpaqueToken,
  hashOpaqueToken,
};
