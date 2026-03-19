const express = require('express');
const pool = require('../db/pool');
const authenticate = require('../middleware/authenticate');

const router = express.Router();
router.use(authenticate);

// ─── Profile ──────────────────────────────────────────────────────────────────
router.get('/profile', async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM user_profiles WHERE user_id=$1', [req.user.id]);
  const { rows: userRows } = await pool.query(
    'SELECT id, email, full_name, created_at, email_verified FROM users WHERE id=$1', [req.user.id]
  );
  res.json({ profile: rows[0] || null, user: userRows[0] });
});

router.put('/profile', async (req, res) => {
  const allowed = [
    'age','biological_sex','height_cm','weight_kg','fitness_goal','experience_level',
    'injuries','equipment_access','training_days_per_week','preferred_session_mins',
    'diet_style','sleep_quality','stress_level','units_preference','extra_data'
  ];
  const updates = {};
  for (const key of allowed) {
    if (req.body[key] !== undefined) updates[key] = req.body[key];
  }

  // Also allow updating full_name on users table
  if (req.body.full_name !== undefined) {
    await pool.query('UPDATE users SET full_name=$1 WHERE id=$2', [req.body.full_name, req.user.id]);
  }

  if (Object.keys(updates).length === 0) {
    const { rows } = await pool.query('SELECT * FROM user_profiles WHERE user_id=$1', [req.user.id]);
    return res.json({ profile: rows[0] || null });
  }

  const setClauses = Object.keys(updates).map((k, i) => `${k}=$${i + 1}`);
  const values = [...Object.values(updates), req.user.id];

  await pool.query('INSERT INTO user_profiles (user_id) VALUES ($1) ON CONFLICT DO NOTHING', [req.user.id]);
  const { rows } = await pool.query(
    `UPDATE user_profiles SET ${setClauses.join(',')}, updated_at=NOW()
     WHERE user_id=$${values.length} RETURNING *`,
    values
  );
  res.json({ profile: rows[0] });
});

// ─── Workouts ─────────────────────────────────────────────────────────────────
router.get('/workouts', async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page || '1'));
  const limit = Math.min(100, parseInt(req.query.limit || '20'));
  const offset = (page - 1) * limit;

  let where = ['user_id=$1'];
  const params = [req.user.id];

  if (req.query.type) { params.push(req.query.type); where.push(`workout_type=$${params.length}`); }
  if (req.query.date_from) { params.push(req.query.date_from); where.push(`completed_at>=$${params.length}`); }
  if (req.query.date_to) { params.push(req.query.date_to); where.push(`completed_at<=$${params.length}`); }

  const { rows } = await pool.query(
    `SELECT * FROM workout_history WHERE ${where.join(' AND ')}
     ORDER BY completed_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, limit, offset]
  );

  const { rows: countRows } = await pool.query(
    `SELECT COUNT(*) FROM workout_history WHERE ${where.join(' AND ')}`, params
  );

  res.json({ workouts: rows, total: parseInt(countRows[0].count), page, limit });
});

router.post('/workouts', async (req, res) => {
  const {
    completed_at, workout_type, focus, location, duration_mins,
    total_volume_kg, estimated_calories, energy_rating, user_notes_today,
    workout_data, trainer_feedback, programme_id, programme_week, programme_day
  } = req.body;

  const { rows } = await pool.query(
    `INSERT INTO workout_history
      (user_id, completed_at, workout_type, focus, location, duration_mins,
       total_volume_kg, estimated_calories, energy_rating, user_notes_today,
       workout_data, trainer_feedback, programme_id, programme_week, programme_day)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
     RETURNING *`,
    [
      req.user.id, completed_at || new Date(), workout_type, focus, location, duration_mins,
      total_volume_kg, estimated_calories, energy_rating, user_notes_today,
      workout_data ? JSON.stringify(workout_data) : null, trainer_feedback,
      programme_id || null, programme_week || null, programme_day || null
    ]
  );
  res.status(201).json({ workout: rows[0] });
});

router.get('/workouts/:id', async (req, res) => {
  const { rows } = await pool.query(
    'SELECT * FROM workout_history WHERE id=$1 AND user_id=$2', [req.params.id, req.user.id]
  );
  if (!rows.length) return res.status(404).json({ error: 'Workout not found' });
  res.json({ workout: rows[0] });
});

router.delete('/workouts/:id', async (req, res) => {
  const { rows } = await pool.query(
    'DELETE FROM workout_history WHERE id=$1 AND user_id=$2 RETURNING id', [req.params.id, req.user.id]
  );
  if (!rows.length) return res.status(404).json({ error: 'Workout not found' });
  res.json({ message: 'Workout deleted.' });
});

// ─── Programmes ───────────────────────────────────────────────────────────────
router.get('/programmes', async (req, res) => {
  const { rows } = await pool.query(
    'SELECT * FROM programmes WHERE user_id=$1 ORDER BY created_at DESC', [req.user.id]
  );
  res.json({ programmes: rows });
});

router.post('/programmes', async (req, res) => {
  const {
    name, goal, duration_weeks, days_per_week, split_structure,
    progression_model, overview_text
  } = req.body;

  const { rows } = await pool.query(
    `INSERT INTO programmes
      (user_id, name, goal, duration_weeks, days_per_week, split_structure, progression_model, overview_text)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
    [req.user.id, name, goal, duration_weeks, days_per_week,
     split_structure ? JSON.stringify(split_structure) : null, progression_model, overview_text]
  );
  res.status(201).json({ programme: rows[0] });
});

router.get('/programmes/active', async (req, res) => {
  const { rows } = await pool.query(
    'SELECT * FROM programmes WHERE user_id=$1 AND is_active=TRUE ORDER BY activated_at DESC LIMIT 1',
    [req.user.id]
  );
  res.json({ programme: rows[0] || null });
});

router.put('/programmes/:id', async (req, res) => {
  const allowed = [
    'name','goal','duration_weeks','days_per_week','split_structure','progression_model',
    'overview_text','is_active','current_week','current_day_index','last_session_at',
    'activated_at','completed_at'
  ];
  const updates = {};
  for (const key of allowed) {
    if (req.body[key] !== undefined) updates[key] = req.body[key];
  }
  if (!Object.keys(updates).length) return res.status(400).json({ error: 'No fields to update' });

  const setClauses = Object.keys(updates).map((k, i) => `${k}=$${i + 1}`);
  const values = [...Object.values(updates), req.params.id, req.user.id];

  const { rows } = await pool.query(
    `UPDATE programmes SET ${setClauses.join(',')}
     WHERE id=$${values.length - 1} AND user_id=$${values.length} RETURNING *`,
    values
  );
  if (!rows.length) return res.status(404).json({ error: 'Programme not found' });
  res.json({ programme: rows[0] });
});

router.delete('/programmes/:id', async (req, res) => {
  const { rows } = await pool.query(
    'DELETE FROM programmes WHERE id=$1 AND user_id=$2 RETURNING id', [req.params.id, req.user.id]
  );
  if (!rows.length) return res.status(404).json({ error: 'Programme not found' });
  res.json({ message: 'Programme deleted.' });
});

// ─── Health Metrics ───────────────────────────────────────────────────────────
router.get('/health-metrics', async (req, res) => {
  const { rows } = await pool.query(
    'SELECT * FROM health_metrics WHERE user_id=$1 ORDER BY logged_at DESC', [req.user.id]
  );
  res.json({ metrics: rows });
});

router.post('/health-metrics', async (req, res) => {
  const { logged_at, weight_kg, chest_cm, waist_cm, hips_cm, arms_cm, thighs_cm, resting_hr, mood_rating, sleep_hours, notes } = req.body;
  const { rows } = await pool.query(
    `INSERT INTO health_metrics
      (user_id, logged_at, weight_kg, chest_cm, waist_cm, hips_cm, arms_cm, thighs_cm, resting_hr, mood_rating, sleep_hours, notes)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
    [req.user.id, logged_at || new Date(), weight_kg, chest_cm, waist_cm, hips_cm, arms_cm, thighs_cm, resting_hr, mood_rating, sleep_hours, notes]
  );
  res.status(201).json({ metric: rows[0] });
});

router.put('/health-metrics/:id', async (req, res) => {
  const allowed = ['logged_at','weight_kg','chest_cm','waist_cm','hips_cm','arms_cm','thighs_cm','resting_hr','mood_rating','sleep_hours','notes'];
  const updates = {};
  for (const key of allowed) { if (req.body[key] !== undefined) updates[key] = req.body[key]; }
  if (!Object.keys(updates).length) return res.status(400).json({ error: 'No fields to update' });

  const setClauses = Object.keys(updates).map((k, i) => `${k}=$${i + 1}`);
  const values = [...Object.values(updates), req.params.id, req.user.id];
  const { rows } = await pool.query(
    `UPDATE health_metrics SET ${setClauses.join(',')} WHERE id=$${values.length - 1} AND user_id=$${values.length} RETURNING *`,
    values
  );
  if (!rows.length) return res.status(404).json({ error: 'Metric not found' });
  res.json({ metric: rows[0] });
});

router.delete('/health-metrics/:id', async (req, res) => {
  const { rows } = await pool.query(
    'DELETE FROM health_metrics WHERE id=$1 AND user_id=$2 RETURNING id', [req.params.id, req.user.id]
  );
  if (!rows.length) return res.status(404).json({ error: 'Metric not found' });
  res.json({ message: 'Metric deleted.' });
});

// ─── Personal Records ─────────────────────────────────────────────────────────
router.get('/personal-records', async (req, res) => {
  const { rows } = await pool.query(
    'SELECT * FROM personal_records WHERE user_id=$1 ORDER BY exercise_name', [req.user.id]
  );
  res.json({ records: rows });
});

router.post('/personal-records', async (req, res) => {
  const { exercise_name, weight_kg, reps, workout_id } = req.body;
  if (!exercise_name) return res.status(400).json({ error: 'exercise_name required' });

  // Upsert: keep only best (highest weight, then most reps)
  const existing = await pool.query(
    'SELECT * FROM personal_records WHERE user_id=$1 AND LOWER(exercise_name)=LOWER($2)',
    [req.user.id, exercise_name]
  );

  if (existing.rows.length) {
    const cur = existing.rows[0];
    const isBetter = weight_kg > cur.weight_kg || (weight_kg === cur.weight_kg && reps > cur.reps);
    if (!isBetter) return res.json({ record: cur, improved: false });

    const { rows } = await pool.query(
      'UPDATE personal_records SET weight_kg=$1, reps=$2, set_at=NOW(), workout_id=$3 WHERE id=$4 RETURNING *',
      [weight_kg, reps, workout_id || null, cur.id]
    );
    return res.json({ record: rows[0], improved: true });
  }

  const { rows } = await pool.query(
    'INSERT INTO personal_records (user_id, exercise_name, weight_kg, reps, workout_id) VALUES ($1,$2,$3,$4,$5) RETURNING *',
    [req.user.id, exercise_name, weight_kg, reps, workout_id || null]
  );
  res.status(201).json({ record: rows[0], improved: true });
});

// ─── Coach Chat ───────────────────────────────────────────────────────────────
router.get('/coach-chat', async (req, res) => {
  const { rows } = await pool.query(
    'SELECT * FROM coach_chat_history WHERE user_id=$1 ORDER BY created_at DESC LIMIT 50',
    [req.user.id]
  );
  res.json({ messages: rows.reverse() });
});

router.post('/coach-chat', async (req, res) => {
  const messages = Array.isArray(req.body) ? req.body : [req.body];
  const inserted = [];
  for (const msg of messages) {
    const { role, content } = msg;
    if (!role || !content) continue;
    const { rows } = await pool.query(
      'INSERT INTO coach_chat_history (user_id, role, content) VALUES ($1,$2,$3) RETURNING *',
      [req.user.id, role, content]
    );
    inserted.push(rows[0]);
  }
  res.status(201).json({ messages: inserted });
});

router.delete('/coach-chat', async (req, res) => {
  await pool.query('DELETE FROM coach_chat_history WHERE user_id=$1', [req.user.id]);
  res.json({ message: 'Chat history cleared.' });
});

// ─── Import from localStorage ─────────────────────────────────────────────────
router.post('/import', async (req, res) => {
  const {
    profile, workouts, healthMetrics, activeProgramme,
    programmeLibrary, personalRecords, coachChat
  } = req.body;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Profile
    if (profile) {
      const p = profile;
      await client.query(
        `INSERT INTO user_profiles
          (user_id, age, biological_sex, height_cm, weight_kg, fitness_goal, experience_level,
           injuries, equipment_access, training_days_per_week, preferred_session_mins,
           diet_style, sleep_quality, stress_level, extra_data)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
         ON CONFLICT (user_id) DO UPDATE SET
          age=EXCLUDED.age, biological_sex=EXCLUDED.biological_sex,
          height_cm=EXCLUDED.height_cm, weight_kg=EXCLUDED.weight_kg,
          fitness_goal=EXCLUDED.fitness_goal, experience_level=EXCLUDED.experience_level,
          injuries=EXCLUDED.injuries, equipment_access=EXCLUDED.equipment_access,
          training_days_per_week=EXCLUDED.training_days_per_week,
          preferred_session_mins=EXCLUDED.preferred_session_mins,
          diet_style=EXCLUDED.diet_style, sleep_quality=EXCLUDED.sleep_quality,
          stress_level=EXCLUDED.stress_level, extra_data=EXCLUDED.extra_data`,
        [
          req.user.id, p.age || null, p.sex || null, p.heightCm || null, p.weightKg || null,
          p.goal || null, p.experience || null,
          p.injuries ? JSON.stringify(p.injuries) : null,
          p.equipment || null, p.daysPerWeek || null, p.sessionLength || null,
          p.diet || null, p.sleep || null, p.stress || null,
          JSON.stringify({ name: p.name, createdAt: p.createdAt, homeEquipment: p.homeEquipment })
        ]
      );
      // Update full_name from profile
      if (p.name) {
        await client.query('UPDATE users SET full_name=$1 WHERE id=$2', [p.name, req.user.id]);
      }
    }

    // Workouts
    if (Array.isArray(workouts)) {
      for (const w of workouts) {
        await client.query(
          `INSERT INTO workout_history
            (user_id, completed_at, workout_type, duration_mins, total_volume_kg,
             estimated_calories, energy_rating, user_notes_today, workout_data, trainer_feedback)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
          [
            req.user.id, w.savedAt || new Date(), w.type || null, w.duration_mins || null,
            w.total_volume || null, w.estimated_calories || null, w.rating || null,
            w.user_notes_today || null, JSON.stringify(w), w.trainer_feedback || null
          ]
        );
      }
    }

    // Health metrics
    if (Array.isArray(healthMetrics)) {
      for (const m of healthMetrics) {
        await client.query(
          `INSERT INTO health_metrics (user_id, logged_at, weight_kg, notes)
           VALUES ($1,$2,$3,$4)`,
          [req.user.id, m.date || new Date(), m.weight || null, m.notes || null]
        );
      }
    }

    // Programmes (active + library)
    const allProgrammes = [];
    if (activeProgramme) allProgrammes.push({ ...activeProgramme, is_active: true });
    if (Array.isArray(programmeLibrary)) {
      for (const p of programmeLibrary) {
        if (!activeProgramme || p.id !== activeProgramme.id) {
          allProgrammes.push({ ...p, is_active: false });
        }
      }
    }
    for (const p of allProgrammes) {
      await client.query(
        `INSERT INTO programmes
          (user_id, name, goal, duration_weeks, days_per_week, split_structure, progression_model, overview_text, is_active, current_week, current_day_index)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
        [
          req.user.id, p.name || null, p.goal || null, p.weeks || null, p.daysPerWeek || null,
          JSON.stringify(p.split || []), p.progression || null, p.overview || null,
          !!p.is_active, p.currentWeek || 1, p.lastCompletedDayIndex || 0
        ]
      );
    }

    // Personal records
    if (personalRecords && typeof personalRecords === 'object') {
      for (const [key, pr] of Object.entries(personalRecords)) {
        await client.query(
          `INSERT INTO personal_records (user_id, exercise_name, weight_kg, reps, set_at)
           VALUES ($1,$2,$3,$4,$5)
           ON CONFLICT DO NOTHING`,
          [req.user.id, pr.exerciseName || key, pr.weight || null, pr.reps || null, pr.date || new Date()]
        );
      }
    }

    // Coach chat
    if (Array.isArray(coachChat)) {
      for (const msg of coachChat.slice(-50)) {
        await client.query(
          'INSERT INTO coach_chat_history (user_id, role, content, created_at) VALUES ($1,$2,$3,$4)',
          [req.user.id, msg.role, msg.content, msg.timestamp || new Date()]
        );
      }
    }

    await client.query('COMMIT');
    res.json({ message: 'Import complete.' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Import error:', err);
    res.status(500).json({ error: 'Import failed.' });
  } finally {
    client.release();
  }
});

// ─── Data Export ──────────────────────────────────────────────────────────────
router.get('/export/json', async (req, res) => {
  try {
    const uid = req.user.id;
    const [profile, workouts, programmes, metrics, records, coachChat] = await Promise.all([
      pool.query('SELECT * FROM user_profiles WHERE user_id=$1', [uid]),
      pool.query('SELECT * FROM workout_history WHERE user_id=$1 ORDER BY completed_at DESC', [uid]),
      pool.query('SELECT * FROM programmes WHERE user_id=$1 ORDER BY created_at DESC', [uid]),
      pool.query('SELECT * FROM health_metrics WHERE user_id=$1 ORDER BY logged_at DESC', [uid]),
      pool.query('SELECT * FROM personal_records WHERE user_id=$1 ORDER BY exercise_name', [uid]),
      pool.query('SELECT * FROM coach_chat_history WHERE user_id=$1 ORDER BY created_at', [uid]),
    ]);
    const exported = {
      exported_at: new Date().toISOString(),
      profile: profile.rows[0] || null,
      workouts: workouts.rows,
      programmes: programmes.rows,
      health_metrics: metrics.rows,
      personal_records: records.rows,
      coach_chat: coachChat.rows,
    };
    res.setHeader('Content-Disposition', 'attachment; filename="spark-trainer-export.json"');
    res.setHeader('Content-Type', 'application/json');
    res.json(exported);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Export failed' });
  }
});

router.get('/export/csv', async (req, res) => {
  try {
    const uid = req.user.id;
    const { rows } = await pool.query(
      'SELECT * FROM workout_history WHERE user_id=$1 ORDER BY completed_at DESC', [uid]
    );
    const lines = ['date,workout_type,focus,duration_mins,total_volume_kg,energy_rating,notes'];
    for (const w of rows) {
      const d = [
        w.completed_at ? w.completed_at.toISOString().split('T')[0] : '',
        w.workout_type || '',
        w.focus || '',
        w.duration_mins || '',
        w.total_volume_kg || '',
        w.energy_rating || '',
        (w.user_notes_today || '').replace(/,/g, ';'),
      ];
      lines.push(d.join(','));
    }
    res.setHeader('Content-Disposition', 'attachment; filename="spark-trainer-workouts.csv"');
    res.setHeader('Content-Type', 'text/csv');
    res.send(lines.join('\n'));
  } catch (err) {
    res.status(500).json({ error: 'Export failed' });
  }
});

// ─── Import from competitor CSV ────────────────────────────────────────────────
router.post('/import-csv', async (req, res) => {
  try {
    const { format, rows: csvRows } = req.body;
    if (!Array.isArray(csvRows) || !csvRows.length) {
      return res.status(400).json({ error: 'No rows provided' });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      let imported = 0;

      for (const row of csvRows) {
        // Support Strong and Hevy export formats
        const date = row.Date || row.date || row.start_time || new Date().toISOString();
        const exerciseName = row['Exercise Name'] || row.exercise_name || row.title || '';
        const weight = parseFloat(row['Weight'] || row.weight_kg || row.weight || 0) || null;
        const reps = parseInt(row['Reps'] || row.reps || 0) || null;
        const sets = parseInt(row['Sets'] || row.sets || 1) || 1;

        if (!exerciseName) continue;

        await client.query(
          `INSERT INTO workout_history (user_id, completed_at, workout_type, focus, workout_data, user_notes_today)
           VALUES ($1,$2,'imported','Imported from ${format}', $3, $4)`,
          [
            req.user.id,
            new Date(date),
            JSON.stringify({ exercises: [{ name: exerciseName, sets: [{ weight_kg: weight, reps }] }] }),
            `Imported from ${format}`
          ]
        );
        imported++;
      }

      await client.query('COMMIT');
      res.json({ message: `Imported ${imported} entries`, count: imported });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Import failed' });
  }
});

module.exports = router;
