// src/routes/posts.js
// GET  /api/classes/:classId/posts          – get all posts for a date (default: today)
// POST /api/classes/:classId/posts          – professor: create a post
// DELETE /api/classes/:classId/posts/:id   – professor: delete own post

import express from 'express';
import pool from '../db/pool.js';
import { requireAuth, requireProfessor } from '../middleware/auth.js';

const router = express.Router({ mergeParams: true });

// Helper: assert the requesting user is a class member
async function assertMember(userId, classId, res) {
  const { rows } = await pool.query(
    `SELECT 1 FROM class_members WHERE user_id = $1 AND class_id = $2`,
    [userId, classId]
  );
  if (rows.length === 0) {
    res.status(403).json({ error: 'You are not enrolled in this class.' });
    return false;
  }
  return true;
}

// ── Get posts for a date ──────────────────────────────────────────────────────
router.get('/', requireAuth, async (req, res) => {
  const { classId } = req.params;
  const date = req.query.date || new Date().toISOString().split('T')[0];

  try {
    if (!(await assertMember(req.user.id, classId, res))) return;

    const { rows } = await pool.query(
      `SELECT p.id, p.title, p.content, p.post_date, p.created_at,
              u.id AS author_id, u.name AS author_name, u.role AS author_role
       FROM   posts p
       JOIN   users u ON u.id = p.author_id
       WHERE  p.class_id = $1 AND p.post_date = $2
       ORDER  BY p.created_at ASC`,
      [classId, date]
    );
    return res.json(rows);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error.' });
  }
});

// ── Create a post (professor only) ───────────────────────────────────────────
router.post('/', requireAuth, requireProfessor, async (req, res) => {
  const { classId } = req.params;
  const { title, content } = req.body;

  if (!title || !content) {
    return res.status(400).json({ error: 'title and content are required.' });
  }

  try {
    if (!(await assertMember(req.user.id, classId, res))) return;

    const { rows } = await pool.query(
      `INSERT INTO posts (class_id, author_id, title, content)
       VALUES ($1, $2, $3, $4)
       RETURNING id, class_id, author_id, title, content, post_date, created_at`,
      [classId, req.user.id, title, content]
    );

    const post = {
      ...rows[0],
      author_name: req.user.name ?? null,
      author_role: 'professor',
    };

    // Emit real-time event to all users in this class room
    const io = req.app.get('io');
    io.to(`class:${classId}`).emit('post:new', post);

    return res.status(201).json(post);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error.' });
  }
});

// ── Delete a post ─────────────────────────────────────────────────────────────
router.delete('/:postId', requireAuth, requireProfessor, async (req, res) => {
  const { classId, postId } = req.params;
  try {
    const { rowCount } = await pool.query(
      `DELETE FROM posts WHERE id = $1 AND class_id = $2 AND author_id = $3`,
      [postId, classId, req.user.id]
    );
    if (rowCount === 0) return res.status(404).json({ error: 'Post not found.' });

    const io = req.app.get('io');
    io.to(`class:${classId}`).emit('post:deleted', { postId: Number(postId) });

    return res.json({ message: 'Post deleted.' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error.' });
  }
});

export default router;