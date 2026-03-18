# Pocket Trainer

A complete AI-powered personal training app with full cloud authentication and data sync. Built with React + Vite, Express, PostgreSQL, and the Anthropic Claude API.

## Features

- **Authentication** — Register, login, email verification, password reset, "remember me", account lockout
- **Cloud sync** — All data tied to your account; log in from any device and get full history
- **Onboarding** — 8-step profile builder (name, stats, goal, experience, injuries, equipment, schedule, lifestyle)
- **New Workout** — AI-generated custom sessions via Claude
- **Programmes** — Multi-week training plans with progress tracking
- **Active Workout Mode** — Set logging, rest timer, form cues
- **Coach Chat** — Conversational AI trainer with your profile context
- **Progress** — Weight trends, volume by muscle group, personal records
- **Workout History** — Full log with trainer feedback and notes
- **localStorage migration** — Import existing device data to your account on first login

---

## Prerequisites

- Node.js 18+
- PostgreSQL 14+
- Redis 6+ (optional — currently used for rate limiting state; can omit for local dev)
- An Anthropic API key

---

## Setup

### 1. Clone and install dependencies

```bash
# Client
npm install

# Server
cd server
npm install
```

### 2. Configure environment variables

**Client** (root `.env`):
```bash
cp .env.example .env
```
```env
VITE_ANTHROPIC_API_KEY=sk-ant-...
VITE_API_URL=http://localhost:3001
```

**Server** (`server/.env`):
```bash
cp server/.env.example server/.env
```
Fill in:
```env
DATABASE_URL=postgresql://user:password@localhost:5432/trainer_db
JWT_PRIVATE_KEY=...   # see RS256 key generation below
JWT_PUBLIC_KEY=...
JWT_REFRESH_SECRET=...
SMTP_HOST=...         # any SMTP provider
SMTP_USER=...
SMTP_PASS=...
APP_URL=http://localhost:5173
```

### 3. Generate RS256 keys

```bash
openssl genrsa -out private.pem 2048
openssl rsa -in private.pem -pubout -out public.pem
```

Convert to single-line for `.env` (replace newlines with `\n`):
```bash
awk 'NF {sub(/\r/, ""); printf "%s\\n",$0;}' private.pem
awk 'NF {sub(/\r/, ""); printf "%s\\n",$0;}' public.pem
```
Paste the outputs as `JWT_PRIVATE_KEY` and `JWT_PUBLIC_KEY`.

Generate a refresh token secret:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### 4. Create the database

```bash
createdb trainer_db
```

### 5. Run migrations

```bash
cd server
npm run migrate
```

### 6. Start both servers

**Terminal 1 — API server:**
```bash
cd server
npm run dev
# Runs on http://localhost:3001
```

**Terminal 2 — React client:**
```bash
npm run dev
# Runs on http://localhost:5173
```

---

## Project Structure

```
/
├── src/                        ← React client (existing app)
│   ├── auth/
│   │   ├── AuthContext.jsx     ← Auth state, login/logout
│   │   ├── ProtectedRoute.jsx  ← Route guard
│   │   └── LocalStorageMigration.jsx
│   ├── screens/                ← Auth screens
│   │   ├── LoginScreen.jsx
│   │   ├── RegisterScreen.jsx
│   │   ├── VerifyEmailScreen.jsx
│   │   ├── ForgotPasswordScreen.jsx
│   │   ├── ResetPasswordScreen.jsx
│   │   └── AccountSettingsScreen.jsx
│   ├── services/
│   │   └── api.js              ← Unified API layer (replaces localStorage)
│   └── components/             ← Existing app components (unchanged)
│
└── server/
    ├── src/
    │   ├── app.js              ← Express entry point
    │   ├── routes/
    │   │   ├── auth.js         ← /api/auth/*
    │   │   ├── account.js      ← /api/account/*
    │   │   └── data.js         ← /api/data/*
    │   ├── middleware/
    │   │   ├── authenticate.js ← JWT verification
    │   │   └── rateLimiter.js
    │   ├── services/
    │   │   ├── tokenService.js ← JWT + HMAC token utilities
    │   │   └── emailService.js ← All 7 email templates
    │   └── db/
    │       ├── pool.js         ← PostgreSQL connection pool
    │       ├── migrate.js      ← Migration runner
    │       └── migrations/
    │           └── 001_initial_schema.sql
    └── .env.example
```

---

## API Reference

### Auth (`/api/auth`)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/register` | Create account, send verification email |
| POST | `/login` | Login, returns access + refresh tokens |
| POST | `/logout` | Revoke current refresh token |
| POST | `/logout-all-devices` | Revoke all sessions |
| POST | `/refresh` | Rotate refresh token, get new access token |
| POST | `/verify-email` | Verify email with token from link |
| POST | `/resend-verification` | Re-send verification email |
| POST | `/forgot-password` | Send password reset email |
| POST | `/reset-password` | Reset password with token |
| GET  | `/me` | Get current user + profile |

### Account (`/api/account`) — requires auth

| Method | Path | Description |
|--------|------|-------------|
| PUT | `/profile` | Update profile fields |
| PUT | `/change-password` | Change password |
| PUT | `/change-email` | Request email change |
| GET | `/sessions` | List active sessions |
| DELETE | `/sessions/:id` | Revoke a session |
| POST | `/delete-account` | Soft-delete account |

### Data (`/api/data`) — requires auth

| Method | Path | Description |
|--------|------|-------------|
| GET/PUT | `/profile` | User profile |
| GET/POST/DELETE | `/workouts`, `/workouts/:id` | Workout history |
| GET/POST/PUT/DELETE | `/programmes`, `/programmes/:id` | Training programmes |
| GET | `/programmes/active` | Active programme |
| GET/POST/PUT/DELETE | `/health-metrics`, `/health-metrics/:id` | Body metrics |
| GET/POST | `/personal-records` | PRs (upserts best) |
| GET/POST/DELETE | `/coach-chat` | Chat history |
| POST | `/import` | Bulk import from localStorage |

---

## Security Notes

- Access tokens are RS256 JWTs, 15-minute expiry, stored **in memory only** (not localStorage)
- Refresh tokens stored as HMAC-SHA256 hashes in the database, rotated on every use
- Passwords hashed with bcrypt (12 rounds minimum)
- Account locks after 5 failed login attempts for 15 minutes
- Rate limiting on all auth endpoints
- CORS restricted to client origin
- Helmet.js security headers on all responses
- All DB queries use parameterised statements (no string concatenation)

---

## Email Templates

Seven responsive HTML email templates are built into `emailService.js`:

1. **Welcome / Verify Email** — 24-hour tokenised link
2. **Email Verified** — Confirmation + login CTA
3. **Password Reset** — 1-hour tokenised link
4. **Password Changed** — Confirmation + "not you?" link
5. **Email Change Verification** — Confirm new address
6. **Account Locked** — Explains why + unlock time
7. **Account Deleted** — Farewell + data deletion confirmation

---

## Production Checklist

- [ ] Set `NODE_ENV=production` in server env
- [ ] Use a proper secret manager for `JWT_PRIVATE_KEY` and credentials
- [ ] Set `APP_URL` and `CLIENT_URL` to your production domain
- [ ] Enable SSL on PostgreSQL and Redis
- [ ] Configure SMTP with a transactional email provider (SendGrid, Postmark, SES)
- [ ] Set up a reverse proxy (nginx/Caddy) with HTTPS
- [ ] Consider a Redis instance for distributed rate limiting across multiple server instances
