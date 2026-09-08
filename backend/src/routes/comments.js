// src/routes/comments.js
// GET    /api/posts/:postId/comments           – list all comments (with replies) for a post
// POST   /api/posts/:postId/comments           – add a comment to a post
// DELETE /api/posts/:postId/comments/:id       – delete own comment
// POST   /api/posts/:postId/comments/:id/replies   – reply to a comment
// DELETE /api/posts/:postId/comments/:commentId/replies/:replyId – delete own reply

import express from 'express';
import pool from '../db/pool.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router({ mergeParams: true });

// ── List comments (with nested replies) ──────────────────────────────────────
router.get('/', requireAuth, async (req, res) => {
  const { postId } = req.params;
  try {
    const isProfessor = req.user.role === 'professor';

    // Fetch comments
    const { rows: comments } = await pool.query(
      `SELECT c.id, c.content, c.created_at,
              u.id AS author_id, u.name AS author_name, u.role AS author_role
       FROM   comments c
       JOIN   users u ON u.id = c.author_id
       WHERE  c.post_id = $1
       ORDER  BY c.created_at ASC`,
      [postId]
    );

    // Fetch all replies in one query
    const commentIds = comments.map(c => c.id);
    let replies = [];
    if (commentIds.length > 0) {
      const { rows } = await pool.query(
        `SELECT r.id, r.comment_id, r.content, r.created_at,
                u.id AS author_id, u.name AS author_name, u.role AS author_role
         FROM   replies r
         JOIN   users u ON u.id = r.author_id
         WHERE  r.comment_id = ANY($1::int[])
         ORDER  BY r.created_at ASC`,
        [commentIds]
      );
      replies = rows;
    }

    // Professors get real names, students always get Anonymous
    function maskName(row) {
      if (isProfessor) return row;
      return { ...row, author_name: 'Anonymous' };
    }

    const replyMap = {};
    for (const r of replies) {
      (replyMap[r.comment_id] ??= []).push(maskName(r));
    }

    const result = comments.map(c => ({
      ...maskName(c),
      replies: replyMap[c.id] ?? []
    }));

    return res.json(result);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error.' });
  }
});

// ── Add a comment ─────────────────────────────────────────────────────────────
router.post('/', requireAuth, async (req, res) => {
  const { postId } = req.params;
  const { content } = req.body;
  if (!content?.trim()) return res.status(400).json({ error: 'content is required.' });

  try {
    // Look up class_id for this post so we can emit to the right socket room
    const { rows: postRows } = await pool.query(
      `SELECT class_id FROM posts WHERE id = $1`, [postId]
    );
    if (postRows.length === 0) return res.status(404).json({ error: 'Post not found.' });
    const classId = postRows[0].class_id;

    const { rows } = await pool.query(
      `INSERT INTO comments (post_id, author_id, content)
       VALUES ($1, $2, $3)
       RETURNING id, post_id, content, created_at`,
      [postId, req.user.id, content.trim()]
    );

    const comment = {
      ...rows[0],
      author_id:   req.user.id,
      author_name: req.user.name ?? null,
      author_role: req.user.role,
      replies:     [],
    };

    const io = req.app.get('io');
    io.to(`class:${classId}`).emit('comment:new', comment);

    // Award talent point for participating
    await pool.query(`UPDATE users SET talents = talents + 1 WHERE id = $1`, [req.user.id]);

    return res.status(201).json(comment);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error.' });
  }
});

// ── Delete a comment ──────────────────────────────────────────────────────────
router.delete('/:commentId', requireAuth, async (req, res) => {
  const { postId, commentId } = req.params;
  try {
    const { rows: postRows } = await pool.query(
      `SELECT class_id FROM posts WHERE id = $1`, [postId]
    );
    const classId = postRows[0]?.class_id;

    const { rowCount } = await pool.query(
      `DELETE FROM comments WHERE id = $1 AND post_id = $2 AND author_id = $3`,
      [commentId, postId, req.user.id]
    );
    if (rowCount === 0) return res.status(404).json({ error: 'Comment not found.' });

    const io = req.app.get('io');
    io.to(`class:${classId}`).emit('comment:deleted', {
      commentId: Number(commentId),
      postId: Number(postId),
    });

    return res.json({ message: 'Comment deleted.' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error.' });
  }
});

// ── Add a reply ───────────────────────────────────────────────────────────────
router.post('/:commentId/replies', requireAuth, async (req, res) => {
  const { postId, commentId } = req.params;
  const { content } = req.body;
  if (!content?.trim()) return res.status(400).json({ error: 'content is required.' });

  try {
    const { rows: postRows } = await pool.query(
      `SELECT class_id FROM posts WHERE id = $1`, [postId]
    );
    if (postRows.length === 0) return res.status(404).json({ error: 'Post not found.' });
    const classId = postRows[0].class_id;

    const { rows } = await pool.query(
      `INSERT INTO replies (comment_id, author_id, content)
       VALUES ($1, $2, $3)
       RETURNING id, comment_id, content, created_at`,
      [commentId, req.user.id, content.trim()]
    );

    const reply = {
      ...rows[0],
      author_id:   req.user.id,
      author_name: req.user.name ?? null,
      author_role: req.user.role,
    };

    const io = req.app.get('io');
    io.to(`class:${classId}`).emit('reply:new', reply);

    await pool.query(`UPDATE users SET talents = talents + 1 WHERE id = $1`, [req.user.id]);

    return res.status(201).json(reply);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error.' });
  }
});

// ── Delete a reply ────────────────────────────────────────────────────────────
router.delete('/:commentId/replies/:replyId', requireAuth, async (req, res) => {
  const { postId, commentId, replyId } = req.params;
  try {
    const { rows: postRows } = await pool.query(
      `SELECT class_id FROM posts WHERE id = $1`, [postId]
    );
    const classId = postRows[0]?.class_id;

    const { rowCount } = await pool.query(
      `DELETE FROM replies WHERE id = $1 AND comment_id = $2 AND author_id = $3`,
      [replyId, commentId, req.user.id]
    );
    if (rowCount === 0) return res.status(404).json({ error: 'Reply not found.' });

    const io = req.app.get('io');
    io.to(`class:${classId}`).emit('reply:deleted', {
      replyId:   Number(replyId),
      commentId: Number(commentId),
    });

    return res.json({ message: 'Reply deleted.' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error.' });
  }
});

export default router;