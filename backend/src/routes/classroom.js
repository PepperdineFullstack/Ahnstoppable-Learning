// src/routes/classroom.js
// POST /api/classes/:classId/understand  – submit a 👍 / 👋 / 👎 response
// GET  /api/classes/:classId/understand  – get current-session tally (professor)
// GET  /api/classes/:classId/talents     – get sorted talent leaderboard

import express from 'express';
import pool    from '../db/pool.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router({ mergeParams: true });

// ── Submit understanding check ────────────────────────────────────────────────
router.post('/understand', requireAuth, async (req, res) => {
  const { classId } = req.params;
  const { response } = req.body; // 'thumbs_up' | 'hand' | 'thumbs_down'

  const valid = ['thumbs_up', 'hand', 'thumbs_down'];
  if (!valid.includes(response)) {
    return res.status(400).json({ error: `response must be one of: ${valid.join(', ')}` });
  }

  try {
    await pool.query(
      `INSERT INTO understand_checks (class_id, user_id, response)
       VALUES ($1, $2, $3)`,
      [classId, req.user.id, response]
    );

    // Broadcast the updated tally to everyone in the class room
    const { rows } = await pool.query(
      `SELECT response, COUNT(*)::int AS count
       FROM   understand_checks
       WHERE  class_id = $1
         AND  checked_at >= NOW() - INTERVAL '1 hour'
       GROUP  BY response`,
      [classId]
    );

    const io = req.app.get('io');
    io.to(`class:${classId}`).emit('understand:update', rows);

    return res.status(201).json({ message: 'Response recorded.', tally: rows });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error.' });
  }
});

// ── Get understanding tally ───────────────────────────────────────────────────
router.get('/understand', requireAuth, async (req, res) => {
  const { classId } = req.params;
  try {
    const { rows } = await pool.query(
      `SELECT response, COUNT(*)::int AS count
       FROM   understand_checks
       WHERE  class_id = $1
         AND  checked_at >= NOW() - INTERVAL '1 hour'
       GROUP  BY response`,
      [classId]
    );
    return res.json(rows);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error.' });
  }
});

// ── Talent leaderboard ────────────────────────────────────────────────────────
router.get('/talents', requireAuth, async (req, res) => {
  const { classId } = req.params;
  try {
    const { rows } = await pool.query(
      `SELECT u.id, u.name, u.talents
       FROM   users u
       JOIN   class_members cm ON cm.user_id = u.id
       WHERE  cm.class_id = $1
       ORDER  BY u.talents DESC`,
      [classId]
    );
    return res.json(rows);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error.' });
  }
});

export default router;