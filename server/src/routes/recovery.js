const express = require('express');
const pool = require('../db/pool');
const authenticate = require('../middleware/authenticate');

const router = express.Router();
router.use(authenticate);

// ─── Recovery Logs ────────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM recovery_logs WHERE user_id=$1 ORDER BY logged_date DESC LIMIT 30',
      [req.user.id]
    );
    res.json({ logs: rows });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch recovery logs' });
  }
});

router.get('/today', async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const { rows } = await pool.query(
      'SELECT * FROM recovery_logs WHERE user_id=$1 AND logged_date=$2',
      [req.user.id, today]
    );
    res.json({ log: rows[0] || null });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch today recovery log' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { sleep_quality, sleep_duration, body_feeling, stress_level, hrv_reading, resting_hr, notes } = req.body;
    const today = new Date().toISOString().split('T')[0];

    // Calculate recovery score
    const score = calcRecoveryScore({ sleep_quality, sleep_duration, body_feeling, stress_level });

    const { rows } = await pool.query(
      `INSERT INTO recovery_logs
        (user_id, logged_date, sleep_quality, sleep_duration, body_feeling, stress_level, recovery_score, hrv_reading, resting_hr, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       ON CONFLICT (user_id, logged_date) DO UPDATE SET
        sleep_quality=EXCLUDED.sleep_quality, sleep_duration=EXCLUDED.sleep_duration,
        body_feeling=EXCLUDED.body_feeling, stress_level=EXCLUDED.stress_level,
        recovery_score=EXCLUDED.recovery_score, hrv_reading=EXCLUDED.hrv_reading,
        resting_hr=EXCLUDED.resting_hr, notes=EXCLUDED.notes
       RETURNING *`,
      [req.user.id, today, sleep_quality, sleep_duration, body_feeling, stress_level, score, hrv_reading || null, resting_hr || null, notes || null]
    );
    res.status(201).json({ log: rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to save recovery log' });
  }
});

// ─── Equipment Profiles ───────────────────────────────────────────────────────
router.get('/equipment-profiles', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM equipment_profiles WHERE user_id=$1 ORDER BY is_default DESC, created_at ASC',
      [req.user.id]
    );
    res.json({ profiles: rows });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch equipment profiles' });
  }
});

router.post('/equipment-profiles', async (req, res) => {
  try {
    const { name, location_type, equipment, is_default } = req.body;
    if (!name) return res.status(400).json({ error: 'name required' });

    // Check limit
    const { rows: existing } = await pool.query(
      'SELECT COUNT(*) FROM equipment_profiles WHERE user_id=$1', [req.user.id]
    );
    if (parseInt(existing[0].count) >= 5) {
      return res.status(400).json({ error: 'Maximum 5 equipment profiles allowed' });
    }

    // If setting as default, unset others
    if (is_default) {
      await pool.query('UPDATE equipment_profiles SET is_default=FALSE WHERE user_id=$1', [req.user.id]);
    }

    const { rows } = await pool.query(
      `INSERT INTO equipment_profiles (user_id, name, location_type, equipment, is_default)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [req.user.id, name, location_type || null, equipment || [], !!is_default]
    );
    res.status(201).json({ profile: rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create equipment profile' });
  }
});

router.put('/equipment-profiles/:id', async (req, res) => {
  try {
    const { name, location_type, equipment, is_default } = req.body;

    if (is_default) {
      await pool.query('UPDATE equipment_profiles SET is_default=FALSE WHERE user_id=$1', [req.user.id]);
    }

    const { rows } = await pool.query(
      `UPDATE equipment_profiles SET name=$1, location_type=$2, equipment=$3, is_default=$4
       WHERE id=$5 AND user_id=$6 RETURNING *`,
      [name, location_type || null, equipment || [], !!is_default, req.params.id, req.user.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Profile not found' });
    res.json({ profile: rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update equipment profile' });
  }
});

router.delete('/equipment-profiles/:id', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'DELETE FROM equipment_profiles WHERE id=$1 AND user_id=$2 RETURNING id',
      [req.params.id, req.user.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Profile not found' });
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete equipment profile' });
  }
});

// ─── Achievements ─────────────────────────────────────────────────────────────
router.get('/achievements', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM user_achievements WHERE user_id=$1 ORDER BY unlocked_at DESC',
      [req.user.id]
    );
    res.json({ achievements: rows });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch achievements' });
  }
});

router.post('/achievements', async (req, res) => {
  try {
    const { achievement } = req.body;
    if (!achievement) return res.status(400).json({ error: 'achievement required' });
    const { rows } = await pool.query(
      'INSERT INTO user_achievements (user_id, achievement) VALUES ($1,$2) ON CONFLICT DO NOTHING RETURNING *',
      [req.user.id, achievement]
    );
    res.status(201).json({ achievement: rows[0] || null, already_unlocked: !rows.length });
  } catch (err) {
    res.status(500).json({ error: 'Failed to unlock achievement' });
  }
});

// ─── Helper: Score Calculation ────────────────────────────────────────────────
function calcRecoveryScore({ sleep_quality, sleep_duration, body_feeling, stress_level }) {
  let score = 0;
  const sq = { poor: 0, ok: 25, good: 35, great: 40 };
  const sd = { 'under-6': 0, '6-7': 10, '7-8': 20, '8+': 25 };
  const bf = { 'very-sore': 0, 'somewhat-sore': 5, fresh: 15, energised: 20 };
  const sl = { high: 0, moderate: 5, low: 15 };

  score += sq[sleep_quality] ?? 0;
  score += sd[sleep_duration] ?? 0;
  score += bf[body_feeling] ?? 0;
  score += sl[stress_level] ?? 0;

  return Math.min(100, Math.max(0, score));
}

module.exports = router;
