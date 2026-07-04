// src/middleware/auth.js
// Verifies the JWT sent as a Bearer token in the Authorization header.
// Attaches { id, email, role } to req.user on success.

import jwt from 'jsonwebtoken';

export function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or malformed Authorization header.' });
  }

  const token = header.slice(7);
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload; // { id, email, role }
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token.' });
  }
}

// Extra guard – attach after requireAuth to protect professor-only endpoints
export function requireProfessor(req, res, next) {
  if (req.user?.role !== 'professor') {
    return res.status(403).json({ error: 'Only professors can perform this action.' });
  }
  next();
}