// src/middleware/auth.js
// requireAuth           – verifies the Bearer JWT and attaches { id, email, name, role } to req.user
// requireProfessor      – attach after requireAuth to protect professor-only endpoints
// requireClassMember    – attach after requireAuth; user must be enrolled in req.params.classId (or :id)
// requireClassMemberViaPost – same, but resolves the class through req.params.postId
// isClassMember         – shared helper (also used by the socket joinClass handler)

import jwt from 'jsonwebtoken';
import pool from '../db/pool.js';

const NUMERIC_ID = /^\d+$/;

function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or malformed Authorization header.' });
  }

  const token = header.slice(7);
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload; // { id, email, name, role }
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token.' });
  }
}

function requireProfessor(req, res, next) {
  if (req.user?.role !== 'professor') {
    return res.status(403).json({ error: 'Only professors can perform this action.' });
  }
  next();
}

async function isClassMember(userId, classId) {
  const { rowCount } = await pool.query(
    `SELECT 1 FROM class_members WHERE user_id = $1 AND class_id = $2`,
    [userId, classId]
  );
  return rowCount > 0;
}

// Express 5 forwards rejected promises from async middleware to the error handler.
async function requireClassMember(req, res, next) {
  const classId = req.params.classId ?? req.params.id;
  if (!NUMERIC_ID.test(String(classId))) {
    return res.status(404).json({ error: 'Class not found.' });
  }
  if (!(await isClassMember(req.user.id, classId))) {
    return res.status(403).json({ error: 'You are not enrolled in this class.' });
  }
  req.classId = Number(classId);
  next();
}

async function requireClassMemberViaPost(req, res, next) {
  const { postId } = req.params;
  if (!NUMERIC_ID.test(String(postId))) {
    return res.status(404).json({ error: 'Post not found.' });
  }
  const { rows } = await pool.query(`SELECT class_id FROM posts WHERE id = $1`, [postId]);
  if (rows.length === 0) {
    return res.status(404).json({ error: 'Post not found.' });
  }
  if (!(await isClassMember(req.user.id, rows[0].class_id))) {
    return res.status(403).json({ error: 'You are not enrolled in this class.' });
  }
  req.classId = rows[0].class_id;
  next();
}

export { requireAuth, requireProfessor, requireClassMember, requireClassMemberViaPost, isClassMember };
