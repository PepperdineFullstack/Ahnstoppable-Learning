// src/middleware/auth.js
// requireAuth           – verifies the Bearer JWT and attaches { id, email, name, role } to req.user
// requireProfessor      – attach after requireAuth to protect professor-only endpoints
// requireClassMember    – attach after requireAuth; user must be enrolled in req.params.classId (or :id)
// requireClassMemberViaPost – same, but resolves the class through req.params.postId
// requireClassOwner     – attach after a requireClassMember*; user must be the class's own professor
// classAccess           – shared helper (also used by the socket joinClass handler)
// isId                  – true for a string/number that fits a Postgres integer id
//
// Both requireClassMember* set req.classId and req.isClassOwner. Owner-only
// views (real student names, future days, poll voters) key off isClassOwner,
// never off the professor role alone.

import jwt from 'jsonwebtoken';
import pool from '../db/pool.js';

const MAX_INT4 = 2147483647;

function isId(value) {
  const s = String(value);
  return /^\d{1,10}$/.test(s) && Number(s) <= MAX_INT4;
}

function verifyToken(token) {
  return jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
}

function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or malformed Authorization header.' });
  }

  const token = header.slice(7);
  try {
    req.user = verifyToken(token); // { id, email, name, role }
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

// null if the user isn't enrolled, otherwise { isOwner }.
async function classAccess(userId, classId) {
  const { rows } = await pool.query(
    `SELECT c.professor_id
     FROM   class_members cm JOIN classes c ON c.id = cm.class_id
     WHERE  cm.user_id = $1 AND cm.class_id = $2`,
    [userId, classId]
  );
  return rows.length ? { isOwner: rows[0].professor_id === userId } : null;
}

// Express 5 forwards rejected promises from async middleware to the error handler.
async function requireClassMember(req, res, next) {
  const classId = req.params.classId ?? req.params.id;
  if (!isId(classId)) {
    return res.status(404).json({ error: 'Class not found.' });
  }
  const access = await classAccess(req.user.id, classId);
  if (!access) {
    return res.status(403).json({ error: 'You are not enrolled in this class.' });
  }
  req.classId = Number(classId);
  req.isClassOwner = access.isOwner;
  next();
}

// A post for a future day is a professor's plan: only the class's owner may
// reach it (or its comments) until that day arrives.
async function requireClassMemberViaPost(req, res, next) {
  const { postId } = req.params;
  if (!isId(postId)) {
    return res.status(404).json({ error: 'Post not found.' });
  }
  const { rows } = await pool.query(
    `SELECT class_id, post_date <= CURRENT_DATE AS visible FROM posts WHERE id = $1`,
    [postId]
  );
  if (rows.length === 0) {
    return res.status(404).json({ error: 'Post not found.' });
  }
  const access = await classAccess(req.user.id, rows[0].class_id);
  if (!access) {
    return res.status(403).json({ error: 'You are not enrolled in this class.' });
  }
  if (!rows[0].visible && !access.isOwner) {
    return res.status(404).json({ error: 'Post not found.' });
  }
  req.classId = rows[0].class_id;
  req.isClassOwner = access.isOwner;
  next();
}

function requireClassOwner(req, res, next) {
  if (!req.isClassOwner) {
    return res.status(403).json({ error: 'Only this class\'s professor can do this.' });
  }
  next();
}

export {
  requireAuth, requireProfessor, requireClassMember, requireClassMemberViaPost, requireClassOwner,
  classAccess, isId, verifyToken,
};
