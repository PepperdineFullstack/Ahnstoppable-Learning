// src/routes/posts.js
// GET    /api/classes/:classId/posts          – get all posts for a date (default: today, DB-local)
// GET    /api/classes/:classId/posts/dates    – per-day post/comment counts for a year (calendar markers)
// POST   /api/classes/:classId/posts          – professor: create a post
// DELETE /api/classes/:classId/posts/:postId  – professor: delete own post

import express from 'express';
import pool from '../db/pool.js';
import { requireAuth, requireProfessor, requireClassMember } from '../middleware/auth.js';
import { emitToClass } from '../socket/emit.js';

const router = express.Router({ mergeParams: true });

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

// ── Get posts for a date ──────────────────────────────────────────────────────
router.get('/', requireAuth, requireClassMember, async (req, res) => {
  const date = typeof req.query.date === 'string' ? req.query.date : null;
  if (date !== null && !ISO_DATE.test(date)) {
    return res.status(400).json({ error: 'date must be YYYY-MM-DD.' });
  }

  try {
    const { rows } = await pool.query(
      `SELECT p.id, p.title, p.content, p.post_date, p.created_at,
              u.id AS author_id, u.name AS author_name, u.role AS author_role
       FROM   posts p
       JOIN   users u ON u.id = p.author_id
       WHERE  p.class_id = $1 AND p.post_date = COALESCE($2::date, CURRENT_DATE)
       ORDER  BY p.created_at ASC`,
      [req.classId, date]
    );
    return res.json(rows);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error.' });
  }
});

// ── Activity per day for a year ──────────────────────────────────────────────
// Returns [{ date: 'YYYY-MM-DD', posts, comments, questions }] for every day
// with a post or a student question. Comments count toward their post's day.
router.get('/dates', requireAuth, requireClassMember, async (req, res) => {
  const year = Number(req.query.year);
  if (!Number.isInteger(year) || year < 2000 || year > 2100) {
    return res.status(400).json({ error: 'year must be a four-digit year.' });
  }

  try {
    const { rows } = await pool.query(
      `WITH post_days AS (
         SELECT p.post_date AS date, COUNT(DISTINCT p.id)::int AS posts, COUNT(c.id)::int AS comments
         FROM   posts p LEFT JOIN comments c ON c.post_id = p.id
         WHERE  p.class_id = $1 AND p.post_date >= make_date($2, 1, 1) AND p.post_date < make_date($2 + 1, 1, 1)
         GROUP  BY p.post_date
       ), question_days AS (
         SELECT asked_date AS date, COUNT(*)::int AS questions
         FROM   questions
         WHERE  class_id = $1 AND asked_date >= make_date($2, 1, 1) AND asked_date < make_date($2 + 1, 1, 1)
         GROUP  BY asked_date
       )
       SELECT COALESCE(pd.date, qd.date)   AS date,
              COALESCE(pd.posts, 0)        AS posts,
              COALESCE(pd.comments, 0)     AS comments,
              COALESCE(qd.questions, 0)    AS questions
       FROM   post_days pd FULL OUTER JOIN question_days qd ON qd.date = pd.date
       ORDER  BY 1`,
      [req.classId, year]
    );
    return res.json(rows);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error.' });
  }
});

// ── Create a post (professor only) ───────────────────────────────────────────
router.post('/', requireAuth, requireProfessor, requireClassMember, async (req, res) => {
  const { title, content, post_date } = req.body;

  if (!title || !content) {
    return res.status(400).json({ error: 'title and content are required.' });
  }
  // The client sends its local calendar date so the post lands on the
  // professor's "today" regardless of the DB server's timezone.
  if (post_date != null && !ISO_DATE.test(String(post_date))) {
    return res.status(400).json({ error: 'post_date must be YYYY-MM-DD.' });
  }

  try {
    const { rows } = await pool.query(
      `INSERT INTO posts (class_id, author_id, title, content, post_date)
       VALUES ($1, $2, $3, $4, COALESCE($5::date, CURRENT_DATE))
       RETURNING id, class_id, author_id, title, content, post_date, created_at`,
      [req.classId, req.user.id, title, content, post_date ?? null]
    );

    const post = {
      ...rows[0],
      author_name: req.user.name ?? null,
      author_role: 'professor',
    };

    emitToClass(req.app.get('io'), req.classId, 'post:new', post);

    return res.status(201).json(post);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error.' });
  }
});

// ── Delete a post ─────────────────────────────────────────────────────────────
router.delete('/:postId', requireAuth, requireProfessor, requireClassMember, async (req, res) => {
  const { postId } = req.params;
  try {
    const { rowCount } = await pool.query(
      `DELETE FROM posts WHERE id = $1 AND class_id = $2 AND author_id = $3`,
      [postId, req.classId, req.user.id]
    );
    if (rowCount === 0) return res.status(404).json({ error: 'Post not found.' });

    const io = req.app.get('io');
    io.to(`class:${req.classId}`).emit('post:deleted', { postId: Number(postId) });

    return res.json({ message: 'Post deleted.' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error.' });
  }
});

export default router;
