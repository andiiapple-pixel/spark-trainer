const express = require('express');
const pool = require('../db/pool');
const authenticate = require('../middleware/authenticate');

const router = express.Router();

// ─── Public: Exercise Library (no auth required for browsing) ─────────────────
router.get('/', async (req, res) => {
  try {
    const { muscle_group, equipment, difficulty, movement_pattern, search, page = 1, limit = 50 } = req.query;
    const offset = (Math.max(1, parseInt(page)) - 1) * Math.min(100, parseInt(limit));
    const params = [];
    const conditions = [];

    if (muscle_group) {
      params.push(muscle_group.toLowerCase());
      conditions.push(`($${params.length} = ANY(muscle_groups) OR primary_muscle ILIKE $${params.length})`);
    }
    if (difficulty) {
      params.push(difficulty);
      conditions.push(`difficulty = $${params.length}`);
    }
    if (movement_pattern) {
      params.push(movement_pattern);
      conditions.push(`movement_pattern = $${params.length}`);
    }
    if (equipment) {
      params.push(equipment.toLowerCase());
      conditions.push(`$${params.length} = ANY(equipment)`);
    }
    if (search) {
      params.push(`%${search}%`);
      conditions.push(`name ILIKE $${params.length}`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const { rows } = await pool.query(
      `SELECT * FROM exercises ${where} ORDER BY name ASC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, Math.min(100, parseInt(limit)), offset]
    );
    const { rows: countRows } = await pool.query(
      `SELECT COUNT(*) FROM exercises ${where}`, params
    );

    res.set('Cache-Control', 'public, max-age=86400, stale-while-revalidate=3600');
    res.json({ exercises: rows, total: parseInt(countRows[0].count), page: parseInt(page) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch exercises' });
  }
});

router.get('/search', async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) return res.json({ exercises: [] });
    const { rows } = await pool.query(
      `SELECT id, name, slug, primary_muscle, muscle_groups, difficulty, is_compound, equipment
       FROM exercises WHERE name ILIKE $1 ORDER BY name ASC LIMIT 20`,
      [`%${q}%`]
    );
    res.json({ exercises: rows });
  } catch (err) {
    res.status(500).json({ error: 'Search failed' });
  }
});

// ─── Authenticated: Favourites (must be above /:slug to avoid shadowing) ─────
router.get('/user/favourites', authenticate, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT e.* FROM exercises e
       JOIN exercise_favourites f ON f.exercise_id = e.id
       WHERE f.user_id = $1 ORDER BY e.name`,
      [req.user.id]
    );
    res.json({ exercises: rows });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch favourites' });
  }
});

router.get('/:slug', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM exercises WHERE slug=$1', [req.params.slug]);
    if (!rows.length) return res.status(404).json({ error: 'Exercise not found' });
    res.set('Cache-Control', 'public, max-age=86400, stale-while-revalidate=3600');
    res.json({ exercise: rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch exercise' });
  }
});

router.post('/:id/favourite', authenticate, async (req, res) => {
  try {
    await pool.query(
      'INSERT INTO exercise_favourites (user_id, exercise_id) VALUES ($1,$2) ON CONFLICT DO NOTHING',
      [req.user.id, req.params.id]
    );
    res.json({ favourited: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to favourite' });
  }
});

router.delete('/:id/favourite', authenticate, async (req, res) => {
  try {
    await pool.query(
      'DELETE FROM exercise_favourites WHERE user_id=$1 AND exercise_id=$2',
      [req.user.id, req.params.id]
    );
    res.json({ favourited: false });
  } catch (err) {
    res.status(500).json({ error: 'Failed to unfavourite' });
  }
});

module.exports = router;
