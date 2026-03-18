-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─── Users ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email                 VARCHAR(255) UNIQUE NOT NULL,
  password_hash         VARCHAR(255) NOT NULL,
  full_name             VARCHAR(255),
  created_at            TIMESTAMP DEFAULT NOW(),
  updated_at            TIMESTAMP DEFAULT NOW(),
  last_login_at         TIMESTAMP,
  email_verified        BOOLEAN DEFAULT FALSE,
  email_verified_at     TIMESTAMP,
  is_active             BOOLEAN DEFAULT TRUE,
  failed_login_attempts INTEGER DEFAULT 0,
  locked_until          TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- ─── Refresh Tokens ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID REFERENCES users(id) ON DELETE CASCADE,
  token_hash   VARCHAR(255) NOT NULL,
  device_label VARCHAR(255),
  ip_address   VARCHAR(45),
  user_agent   TEXT,
  created_at   TIMESTAMP DEFAULT NOW(),
  last_used_at TIMESTAMP DEFAULT NOW(),
  expires_at   TIMESTAMP NOT NULL,
  revoked_at   TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token_hash ON refresh_tokens(token_hash);

-- ─── Password Reset Tokens ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID REFERENCES users(id) ON DELETE CASCADE,
  token_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP NOT NULL,
  used_at    TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_prt_user_id ON password_reset_tokens(user_id);

-- ─── Email Verification Tokens ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS email_verification_tokens (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID REFERENCES users(id) ON DELETE CASCADE,
  token_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP NOT NULL,
  used_at    TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_evt_user_id ON email_verification_tokens(user_id);

-- ─── User Profiles ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_profiles (
  user_id                UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  age                    INTEGER,
  biological_sex         VARCHAR(20),
  height_cm              DECIMAL(5,2),
  weight_kg              DECIMAL(5,2),
  fitness_goal           VARCHAR(100),
  experience_level       VARCHAR(100),
  injuries               TEXT,
  equipment_access       VARCHAR(100),
  training_days_per_week INTEGER,
  preferred_session_mins INTEGER,
  diet_style             VARCHAR(100),
  sleep_quality          VARCHAR(50),
  stress_level           VARCHAR(50),
  units_preference       VARCHAR(10) DEFAULT 'metric',
  extra_data             JSONB DEFAULT '{}',
  updated_at             TIMESTAMP DEFAULT NOW()
);

-- ─── Workout History ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS workout_history (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID REFERENCES users(id) ON DELETE CASCADE,
  completed_at        TIMESTAMP DEFAULT NOW(),
  workout_type        VARCHAR(100),
  focus               VARCHAR(100),
  location            VARCHAR(100),
  duration_mins       INTEGER,
  total_volume_kg     DECIMAL(10,2),
  estimated_calories  INTEGER,
  energy_rating       INTEGER,
  user_notes_today    TEXT,
  workout_data        JSONB,
  trainer_feedback    TEXT,
  programme_id        UUID,
  programme_week      INTEGER,
  programme_day       INTEGER
);

CREATE INDEX IF NOT EXISTS idx_workout_history_user_id ON workout_history(user_id);
CREATE INDEX IF NOT EXISTS idx_workout_history_completed_at ON workout_history(completed_at DESC);

-- ─── Programmes ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS programmes (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID REFERENCES users(id) ON DELETE CASCADE,
  name                VARCHAR(255),
  goal                VARCHAR(100),
  duration_weeks      INTEGER,
  days_per_week       INTEGER,
  split_structure     JSONB,
  progression_model   VARCHAR(50),
  overview_text       TEXT,
  created_at          TIMESTAMP DEFAULT NOW(),
  activated_at        TIMESTAMP,
  completed_at        TIMESTAMP,
  is_active           BOOLEAN DEFAULT FALSE,
  current_week        INTEGER DEFAULT 1,
  current_day_index   INTEGER DEFAULT 0,
  last_session_at     TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_programmes_user_id ON programmes(user_id);

-- ─── Health Metrics ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS health_metrics (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES users(id) ON DELETE CASCADE,
  logged_at   DATE NOT NULL,
  weight_kg   DECIMAL(5,2),
  chest_cm    DECIMAL(5,2),
  waist_cm    DECIMAL(5,2),
  hips_cm     DECIMAL(5,2),
  arms_cm     DECIMAL(5,2),
  thighs_cm   DECIMAL(5,2),
  resting_hr  INTEGER,
  mood_rating INTEGER,
  sleep_hours DECIMAL(4,2),
  notes       TEXT
);

CREATE INDEX IF NOT EXISTS idx_health_metrics_user_id ON health_metrics(user_id);
CREATE INDEX IF NOT EXISTS idx_health_metrics_logged_at ON health_metrics(logged_at DESC);

-- ─── Personal Records ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS personal_records (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID REFERENCES users(id) ON DELETE CASCADE,
  exercise_name VARCHAR(255) NOT NULL,
  weight_kg     DECIMAL(7,2),
  reps          INTEGER,
  set_at        TIMESTAMP DEFAULT NOW(),
  workout_id    UUID REFERENCES workout_history(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_personal_records_user_id ON personal_records(user_id);

-- ─── Coach Chat History ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS coach_chat_history (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID REFERENCES users(id) ON DELETE CASCADE,
  role       VARCHAR(20) NOT NULL,
  content    TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_coach_chat_user_id ON coach_chat_history(user_id);
CREATE INDEX IF NOT EXISTS idx_coach_chat_created_at ON coach_chat_history(created_at);

-- ─── updated_at trigger ───────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
