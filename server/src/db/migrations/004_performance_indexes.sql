-- Composite index for workout_history queries (user + time ordering)
CREATE INDEX IF NOT EXISTS idx_workout_history_user_completed
  ON workout_history(user_id, completed_at DESC);

-- Composite index for personal records lookups (user + exercise name)
CREATE INDEX IF NOT EXISTS idx_personal_records_user_exercise
  ON personal_records(user_id, LOWER(exercise_name));

-- Composite index for coach chat queries (user + ordering)
CREATE INDEX IF NOT EXISTS idx_coach_chat_user_created
  ON coach_chat_history(user_id, created_at DESC);

-- Composite index for recovery logs (user + date ordering)
CREATE INDEX IF NOT EXISTS idx_recovery_logs_user_date
  ON recovery_logs(user_id, logged_date DESC);

-- Composite index for health metrics (user + date ordering)
CREATE INDEX IF NOT EXISTS idx_health_metrics_user_logged
  ON health_metrics(user_id, logged_at DESC);
