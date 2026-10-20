// src/routes/comments.js
// GET    /api/posts/:postId/comments                              – list comments (with replies)
// POST   /api/posts/:postId/comments                              – add a comment
// PATCH  /api/posts/:postId/comments/:commentId                   – edit own comment
// DELETE /api/posts/:postId/comments/:commentId                   – delete own comment (class professor: any)
// POST   /api/posts/:postId/comments/:commentId/replies           – reply to a comment
// PATCH  /api/posts/:postId/comments/:commentId/replies/:replyId  – edit own reply
// DELETE /api/posts/:postId/comments/:commentId/replies/:replyId  – delete own reply (class professor: any)
//
// PUT/DELETE /api/posts/:postId/comments/:commentId/like                  – like / unlike a comment
// PUT/DELETE /api/posts/:postId/comments/:commentId/replies/:replyId/like  – like / unlike a reply
//
// Rows carry is_mine for the requester (students never get other authors'
// identities, so this is how the page knows what you may edit or delete).
//
// Every route requires membership in the post's class (requireClassMemberViaPost
// sets req.classId). Student-authored rows are masked for student requesters on
// both the REST response and the socket broadcast – see utils/anonymity.js.

import express from 'express';
import pool from '../db/pool.js';
import { requireAuth, requireClassMemberViaPost, isId } from '../middleware/auth.js';
import { forRequester } from '../utils/anonymity.js';
import { emitToClass } from '../socket/emit.js';
import { discussionLimits, likeLimits } from '../middleware/rateLimit.js';
import { isClassProfessor, takeBackPoints } from '../utils/moderation.js';

const router = express.Router({ mergeParams: true });

// Comments and replies: up to MAX_LEN characters (the website enforces the same).
const MAX_LEN = 1000;

function readContent(body) {
  const content = typeof body?.content === 'string' ? body.content.trim() : '';
  if (!content) return { error: 'content is required.' };
  if (content.length > MAX_LEN) return { error: `content must be ${MAX_LEN} characters or fewer.` };
  return { content };
}

// ── List comments (with nested replies) ──────────────────────────────────────
router.get('/', requireAuth, requireClassMemberViaPost, async (req, res) => {
  const { postId } = req.params;
  try {
    const { rows: comments } = await pool.query(
      `SELECT c.id, c.post_id, c.content, c.created_at, c.edited_at,
              u.id AS author_id, u.name AS author_name, u.role AS author_role,
              (SELECT COUNT(*)::int FROM comment_likes l WHERE l.comment_id = c.id) AS like_count,
              EXISTS (SELECT 1 FROM comment_likes l WHERE l.comment_id = c.id AND l.user_id = $2) AS liked_by_me
       FROM   comments c
       JOIN   users u ON u.id = c.author_id
       WHERE  c.post_id = $1
       ORDER  BY c.created_at ASC`,
      [postId, req.user.id]
    );

    const commentIds = comments.map(c => c.id);
    let replies = [];
    if (commentIds.length > 0) {
      const { rows } = await pool.query(
        `SELECT r.id, r.comment_id, r.content, r.created_at, r.edited_at,
                u.id AS author_id, u.name AS author_name, u.role AS author_role,
                (SELECT COUNT(*)::int FROM reply_likes l WHERE l.reply_id = r.id) AS like_count,
                EXISTS (SELECT 1 FROM reply_likes l WHERE l.reply_id = r.id AND l.user_id = $2) AS liked_by_me
         FROM   replies r
         JOIN   users u ON u.id = r.author_id
         WHERE  r.comment_id = ANY($1::int[])
         ORDER  BY r.created_at ASC`,
        [commentIds, req.user.id]
      );
      replies = rows;
    }

    const replyMap = {};
    for (const r of replies) {
      (replyMap[r.comment_id] ??= []).push({ ...r, is_mine: r.author_id === req.user.id });
    }

    const result = comments.map(c => forRequester(req, {
      ...c,
      is_mine: c.author_id === req.user.id,
      replies: replyMap[c.id] ?? [],
    }));

    return res.json(result);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error.' });
  }
});

// ── Add a comment ─────────────────────────────────────────────────────────────
router.post('/', requireAuth, requireClassMemberViaPost, ...discussionLimits, async (req, res) => {
  const { postId } = req.params;
  const { content, error } = readContent(req.body);
  if (error) return res.status(400).json({ error });

  // The comment and its talent point commit together, and it's only announced
  // once saved, so a failure can't leave a broadcast comment the author retries.
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      `INSERT INTO comments (post_id, author_id, content)
       VALUES ($1, $2, $3)
       RETURNING id, post_id, content, created_at`,
      [postId, req.user.id, content]
    );
    // Award talent point for participating
    await client.query(`UPDATE users SET talents = talents + 1 WHERE id = $1`, [req.user.id]);
    await client.query('COMMIT');

    const comment = {
      ...rows[0],
      author_id:   req.user.id,
      author_name: req.user.name ?? null,
      author_role: req.user.role,
      replies:     [],
    };
    emitToClass(req.app.get('io'), req.classId, 'comment:new', comment);

    return res.status(201).json(forRequester(req, { ...comment, is_mine: true }));
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    if (err.code === '23503') return res.status(404).json({ error: 'Post not found.' });
    console.error(err);
    return res.status(500).json({ error: 'Server error.' });
  } finally {
    client.release();
  }
});

// ── Edit own comment ──────────────────────────────────────────────────────────
router.patch('/:commentId', requireAuth, requireClassMemberViaPost, async (req, res) => {
  const { postId, commentId } = req.params;
  if (!isId(commentId)) return res.status(404).json({ error: 'Comment not found.' });
  const { content, error } = readContent(req.body);
  if (error) return res.status(400).json({ error });
  try {
    const { rows } = await pool.query(
      `UPDATE comments SET content = $4, edited_at = NOW()
       WHERE  id = $1 AND post_id = $2 AND author_id = $3
       RETURNING id, post_id, content, edited_at`,
      [commentId, postId, req.user.id, content]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Comment not found, or it isn\'t yours to edit.' });
    const update = { commentId: rows[0].id, postId: rows[0].post_id, content: rows[0].content, edited_at: rows[0].edited_at };
    req.app.get('io').to(`class:${req.classId}`).emit('comment:updated', update);
    return res.json(update);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error.' });
  }
});

// ── Delete a comment (author, or the class's professor) ──────────────────────
// Its replies go with it; everyone involved loses the points those earned.
router.delete('/:commentId', requireAuth, requireClassMemberViaPost, async (req, res) => {
  const { postId, commentId } = req.params;
  if (!isId(commentId)) return res.status(404).json({ error: 'Comment not found.' });
  const client = await pool.connect();
  try {
    const moderator = await isClassProfessor(req);
    await client.query('BEGIN');
    const { rows: [comment] } = await client.query(
      `SELECT id, author_id FROM comments WHERE id = $1 AND post_id = $2 AND ($3 OR author_id = $4) FOR UPDATE`,
      [commentId, postId, moderator, req.user.id]
    );
    if (!comment) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Comment not found, or it isn\'t yours to delete.' });
    }
    const { rows: replyAuthors } = await client.query(`SELECT author_id FROM replies WHERE comment_id = $1`, [comment.id]);
    await client.query(`DELETE FROM comments WHERE id = $1`, [comment.id]);
    await takeBackPoints(client, [comment.author_id, ...replyAuthors.map((r) => r.author_id)]);
    await client.query('COMMIT');

    req.app.get('io').to(`class:${req.classId}`).emit('comment:deleted', {
      commentId: comment.id,
      postId: Number(postId),
    });
    return res.json({ message: 'Comment deleted.' });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error(err);
    return res.status(500).json({ error: 'Server error.' });
  } finally {
    client.release();
  }
});

// ── Add a reply ───────────────────────────────────────────────────────────────
router.post('/:commentId/replies', requireAuth, requireClassMemberViaPost, ...discussionLimits, async (req, res) => {
  const { postId, commentId } = req.params;
  if (!isId(commentId)) return res.status(404).json({ error: 'Comment not found.' });
  const { content, error } = readContent(req.body);
  if (error) return res.status(400).json({ error });

  // Same all-or-nothing rule as a new comment (see above).
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // Only insert if the comment exists under this post. One statement, so a
    // comment deleted at the same moment gives a 404 rather than an FK error.
    const { rows } = await client.query(
      `INSERT INTO replies (comment_id, author_id, content)
       SELECT $1, $2, $3
       WHERE  EXISTS (SELECT 1 FROM comments WHERE id = $1 AND post_id = $4)
       RETURNING id, comment_id, content, created_at`,
      [commentId, req.user.id, content, postId]
    );
    if (rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Comment not found.' });
    }
    await client.query(`UPDATE users SET talents = talents + 1 WHERE id = $1`, [req.user.id]);
    await client.query('COMMIT');

    const reply = {
      ...rows[0],
      author_id:   req.user.id,
      author_name: req.user.name ?? null,
      author_role: req.user.role,
    };
    emitToClass(req.app.get('io'), req.classId, 'reply:new', reply);

    return res.status(201).json(forRequester(req, { ...reply, is_mine: true }));
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    // The comment was deleted after EXISTS saw it but before the FK check.
    if (err.code === '23503') return res.status(404).json({ error: 'Comment not found.' });
    console.error(err);
    return res.status(500).json({ error: 'Server error.' });
  } finally {
    client.release();
  }
});

// ── Edit own reply ────────────────────────────────────────────────────────────
router.patch('/:commentId/replies/:replyId', requireAuth, requireClassMemberViaPost, async (req, res) => {
  const { postId, commentId, replyId } = req.params;
  if (!isId(commentId) || !isId(replyId)) return res.status(404).json({ error: 'Reply not found.' });
  const { content, error } = readContent(req.body);
  if (error) return res.status(400).json({ error });
  try {
    const { rows } = await pool.query(
      `UPDATE replies r SET content = $5, edited_at = NOW()
       FROM   comments c
       WHERE  r.id = $1 AND r.comment_id = $2 AND c.id = r.comment_id AND c.post_id = $3 AND r.author_id = $4
       RETURNING r.id, r.comment_id, r.content, r.edited_at`,
      [replyId, commentId, postId, req.user.id, content]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Reply not found, or it isn\'t yours to edit.' });
    const update = { replyId: rows[0].id, commentId: rows[0].comment_id, content: rows[0].content, edited_at: rows[0].edited_at };
    req.app.get('io').to(`class:${req.classId}`).emit('reply:updated', update);
    return res.json(update);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error.' });
  }
});

// ── Delete a reply (author, or the class's professor) ────────────────────────
router.delete('/:commentId/replies/:replyId', requireAuth, requireClassMemberViaPost, async (req, res) => {
  const { postId, commentId, replyId } = req.params;
  if (!isId(commentId) || !isId(replyId)) return res.status(404).json({ error: 'Reply not found.' });
  const client = await pool.connect();
  try {
    const moderator = await isClassProfessor(req);
    await client.query('BEGIN');
    const { rows: [reply] } = await client.query(
      `DELETE FROM replies r
       USING  comments c
       WHERE  r.id = $1 AND r.comment_id = $2 AND c.id = r.comment_id AND c.post_id = $3
         AND  ($4 OR r.author_id = $5)
       RETURNING r.id, r.author_id`,
      [replyId, commentId, postId, moderator, req.user.id]
    );
    if (!reply) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Reply not found, or it isn\'t yours to delete.' });
    }
    await takeBackPoints(client, [reply.author_id]);
    await client.query('COMMIT');

    req.app.get('io').to(`class:${req.classId}`).emit('reply:deleted', {
      replyId:   reply.id,
      commentId: Number(commentId),
    });
    return res.json({ message: 'Reply deleted.' });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error(err);
    return res.status(500).json({ error: 'Server error.' });
  } finally {
    client.release();
  }
});

// ── Likes ─────────────────────────────────────────────────────────────────────
// PUT likes, DELETE unlikes; both are safe to repeat. Everyone in the class gets
// the new count live; who liked is never sent.
async function setCommentLike(req, res, liked) {
  const { postId, commentId } = req.params;
  if (!isId(commentId)) return res.status(404).json({ error: 'Comment not found.' });
  try {
    const { rowCount } = await pool.query(`SELECT 1 FROM comments WHERE id = $1 AND post_id = $2`, [commentId, postId]);
    if (rowCount === 0) return res.status(404).json({ error: 'Comment not found.' });
    if (liked) {
      await pool.query(`INSERT INTO comment_likes (comment_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`, [commentId, req.user.id]);
    } else {
      await pool.query(`DELETE FROM comment_likes WHERE comment_id = $1 AND user_id = $2`, [commentId, req.user.id]);
    }
    const { rows: [{ n }] } = await pool.query(`SELECT COUNT(*)::int AS n FROM comment_likes WHERE comment_id = $1`, [commentId]);
    const update = { commentId: Number(commentId), postId: Number(postId), like_count: n };
    req.app.get('io').to(`class:${req.classId}`).emit('comment:likes', update);
    return res.json({ ...update, liked_by_me: liked });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error.' });
  }
}

async function setReplyLike(req, res, liked) {
  const { postId, commentId, replyId } = req.params;
  if (!isId(commentId) || !isId(replyId)) return res.status(404).json({ error: 'Reply not found.' });
  try {
    const { rowCount } = await pool.query(
      `SELECT 1 FROM replies r JOIN comments c ON c.id = r.comment_id
       WHERE  r.id = $1 AND r.comment_id = $2 AND c.post_id = $3`,
      [replyId, commentId, postId]
    );
    if (rowCount === 0) return res.status(404).json({ error: 'Reply not found.' });
    if (liked) {
      await pool.query(`INSERT INTO reply_likes (reply_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`, [replyId, req.user.id]);
    } else {
      await pool.query(`DELETE FROM reply_likes WHERE reply_id = $1 AND user_id = $2`, [replyId, req.user.id]);
    }
    const { rows: [{ n }] } = await pool.query(`SELECT COUNT(*)::int AS n FROM reply_likes WHERE reply_id = $1`, [replyId]);
    const update = { replyId: Number(replyId), commentId: Number(commentId), like_count: n };
    req.app.get('io').to(`class:${req.classId}`).emit('reply:likes', update);
    return res.json({ ...update, liked_by_me: liked });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error.' });
  }
}

router.put('/:commentId/like',                    requireAuth, requireClassMemberViaPost, ...likeLimits, (req, res) => setCommentLike(req, res, true));
router.delete('/:commentId/like',                 requireAuth, requireClassMemberViaPost, ...likeLimits, (req, res) => setCommentLike(req, res, false));
router.put('/:commentId/replies/:replyId/like',   requireAuth, requireClassMemberViaPost, ...likeLimits, (req, res) => setReplyLike(req, res, true));
router.delete('/:commentId/replies/:replyId/like', requireAuth, requireClassMemberViaPost, ...likeLimits, (req, res) => setReplyLike(req, res, false));

export default router;
