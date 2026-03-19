-- ─── Part 1A: Exercise Library ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS exercises (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                  VARCHAR(255) NOT NULL,
  slug                  VARCHAR(255) UNIQUE NOT NULL,
  muscle_groups         TEXT[] NOT NULL,
  primary_muscle        VARCHAR(100) NOT NULL,
  secondary_muscles     TEXT[],
  equipment             TEXT[],
  movement_pattern      VARCHAR(100),
  difficulty            VARCHAR(20),
  exercise_type         VARCHAR(50),
  instructions          TEXT[],
  form_cues             TEXT[],
  common_mistakes       TEXT[],
  beginner_modification TEXT,
  advanced_progression  TEXT,
  video_search_query    VARCHAR(255),
  is_compound           BOOLEAN DEFAULT FALSE,
  created_at            TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_exercises_slug ON exercises(slug);
CREATE INDEX IF NOT EXISTS idx_exercises_primary_muscle ON exercises(primary_muscle);
CREATE INDEX IF NOT EXISTS idx_exercises_difficulty ON exercises(difficulty);

-- User exercise favourites
CREATE TABLE IF NOT EXISTS exercise_favourites (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES users(id) ON DELETE CASCADE,
  exercise_id UUID REFERENCES exercises(id) ON DELETE CASCADE,
  created_at  TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, exercise_id)
);

CREATE INDEX IF NOT EXISTS idx_exercise_favs_user ON exercise_favourites(user_id);

-- ─── Part 1B: Equipment Profiles ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS equipment_profiles (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID REFERENCES users(id) ON DELETE CASCADE,
  name          VARCHAR(100) NOT NULL,
  location_type VARCHAR(50),
  equipment     TEXT[],
  is_default    BOOLEAN DEFAULT FALSE,
  created_at    TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_equipment_profiles_user ON equipment_profiles(user_id);

-- ─── Part 2A: Recovery Logs ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS recovery_logs (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID REFERENCES users(id) ON DELETE CASCADE,
  logged_date    DATE NOT NULL,
  sleep_quality  VARCHAR(20),
  sleep_duration VARCHAR(20),
  body_feeling   VARCHAR(20),
  stress_level   VARCHAR(20),
  recovery_score INTEGER,
  hrv_reading    DECIMAL(6,2),
  resting_hr     INTEGER,
  notes          TEXT,
  created_at     TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, logged_date)
);

CREATE INDEX IF NOT EXISTS idx_recovery_logs_user ON recovery_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_recovery_logs_date ON recovery_logs(logged_date DESC);

-- ─── Part 3C: Personal Records with estimated 1RM ────────────────────────────
-- Add estimated_1rm to personal_records if not exists
ALTER TABLE personal_records ADD COLUMN IF NOT EXISTS estimated_1rm DECIMAL(7,2);
ALTER TABLE personal_records ADD COLUMN IF NOT EXISTS notes TEXT;

-- ─── Part 4C: Friend Challenges ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS friend_challenges (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id       UUID REFERENCES users(id) ON DELETE CASCADE,
  participant_id   UUID REFERENCES users(id) ON DELETE CASCADE,
  challenge_type   VARCHAR(50),
  start_date       DATE,
  end_date         DATE,
  status           VARCHAR(20) DEFAULT 'pending',
  invite_token     VARCHAR(100) UNIQUE,
  created_at       TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_friend_challenges_creator ON friend_challenges(creator_id);
CREATE INDEX IF NOT EXISTS idx_friend_challenges_token ON friend_challenges(invite_token);

-- ─── Part 4B: Achievements ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_achievements (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID REFERENCES users(id) ON DELETE CASCADE,
  achievement  VARCHAR(100) NOT NULL,
  unlocked_at  TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, achievement)
);

CREATE INDEX IF NOT EXISTS idx_achievements_user ON user_achievements(user_id);
