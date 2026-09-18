// src/routes/classroom.js
// POST /api/classes/:classId/understand  – member: submit a 👍 / 👋 / 👎 response
// GET  /api/classes/:classId/understand  – professor: get the current tally
// GET  /api/classes/:classId/talents     – member: sorted talent leaderboard

import express from 'express';
import pool from '../db/pool.js';
import { requireAuth, requireProfessor, requireClassMember } from '../middleware/auth.js';

const router = express.Router({ mergeParams: true });

const VALID_RESPONSES = ['thumbs_up', 'hand', 'thumbs_down'];

// Count each member's current response within the window. (The unique
// constraint already guarantees one row per user; DISTINCT ON keeps this
// correct on databases created before that constraint existed.)
async function getTally(classId) {
  const { rows } = await pool.query(
    `SELECT response, COUNT(*)::int AS count
     FROM (
       SELECT DISTINCT ON (user_id) user_id, response
       FROM   understand_checks
       WHERE  class_id = $1
         AND  checked_at >= NOW() - INTERVAL '1 hour'
       ORDER  BY user_id, checked_at DESC
     ) latest
     GROUP BY response`,
    [classId]
  );
  return rows;
}

// ── Submit understanding check ────────────────────────────────────────────────
router.post('/understand', requireAuth, requireClassMember, async (req, res) => {
  const { response } = req.body;
  if (!VALID_RESPONSES.includes(response)) {
    return res.status(400).json({ error: `response must be one of: ${VALID_RESPONSES.join(', ')}` });
  }

  try {
    // One row per (class, user): a repeat submission replaces the earlier vote.
    await pool.query(
      `INSERT INTO understand_checks (class_id, user_id, response)
       VALUES ($1, $2, $3)
       ON CONFLICT (class_id, user_id)
       DO UPDATE SET response = EXCLUDED.response, checked_at = NOW()`,
      [req.classId, req.user.id, response]
    );

    // Only professors render the tally, so only their room gets the update.
    const tally = await getTally(req.classId);
    req.app.get('io').to(`class:${req.classId}:professor`).emit('understand:update', tally);

    return res.status(201).json({ message: 'Response recorded.', tally });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error.' });
  }
});

// ── Get understanding tally (professor only) ──────────────────────────────────
router.get('/understand', requireAuth, requireProfessor, requireClassMember, async (req, res) => {
  try {
    return res.json(await getTally(req.classId));
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error.' });
  }
});

// ── Talent leaderboard ────────────────────────────────────────────────────────
router.get('/talents', requireAuth, requireClassMember, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT u.id, u.name, u.talents
       FROM   users u
       JOIN   class_members cm ON cm.user_id = u.id
       WHERE  cm.class_id = $1
       ORDER  BY u.talents DESC`,
      [req.classId]
    );
    return res.json(rows);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error.' });
  }
});

export default router;
