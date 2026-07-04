// src/routes/auth.js
// POST /api/auth/register         – create a new user account
// POST /api/auth/login            – email + password (passport-local) → JWT
// GET  /api/auth/google           – start the Google OAuth flow
// GET  /api/auth/google/callback  – Google redirects here → JWT → frontend
// GET  /api/auth/me               – return the current user for a valid JWT

import express from 'express';
import bcrypt  from 'bcrypt';
import jwt     from 'jsonwebtoken';
import pool    from '../db/pool.js';
import passport, { googleEnabled } from '../config/passport.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

const SALT_ROUNDS = 12;
const CLIENT_URL  = process.env.CLIENT_URL ?? 'http://localhost:5173';

// ── Register ──────────────────────────────────────────────────────────────────
router.post('/register', async (req, res) => {
  const { email, password, name, role = 'student' } = req.body;

  if (!email || !password || !name) {
    return res.status(400).json({ error: 'email, password, and name are required.' });
  }
  if (!['student', 'professor'].includes(role)) {
    return res.status(400).json({ error: "role must be 'student' or 'professor'." });
  }

  try {
    const hash = await bcrypt.hash(password, SALT_ROUNDS);
    const { rows } = await pool.query(
      `INSERT INTO users (email, password, name, role)
       VALUES ($1, $2, $3, $4)
       RETURNING id, email, name, role`,
      [email.toLowerCase(), hash, name, role]
    );
    const user  = rows[0];
    const token = signToken(user);
    return res.status(201).json({ user, token });
  } catch (err) {
    if (err.code === '23505') { // unique violation
      return res.status(409).json({ error: 'An account with that email already exists.' });
    }
    console.error(err);
    return res.status(500).json({ error: 'Server error.' });
  }
});

// ── Login (email + password) ──────────────────────────────────────────────────
router.post('/login', (req, res, next) => {
  if (!req.body?.email || !req.body?.password) {
    return res.status(400).json({ error: 'email and password are required.' });
  }

  passport.authenticate('local', { session: false }, (err, user, info) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Server error.' });
    }
    if (!user) {
      return res.status(401).json({ error: info?.message ?? 'Invalid credentials.' });
    }
    return res.json({ user, token: signToken(user) });
  })(req, res, next);
});

// ── Google OAuth ──────────────────────────────────────────────────────────────
router.get('/google', (req, res, next) => {
  if (!googleEnabled) {
    return res.redirect(`${CLIENT_URL}/?error=google_not_configured`);
  }
  passport.authenticate('google', { scope: ['profile', 'email'], session: false })(req, res, next);
});

router.get(
  '/google/callback',
  passport.authenticate('google', {
    session: false,
    failureRedirect: `${process.env.CLIENT_URL ?? 'http://localhost:5173'}/?error=google_auth_failed`,
  }),
  (req, res) => {
    const token = signToken(req.user);
    return res.redirect(`${CLIENT_URL}/auth/callback?token=${token}`);
  }
);

// ── Current user ──────────────────────────────────────────────────────────────
router.get('/me', requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, email, name, role, avatar, talents FROM users WHERE id = $1`,
      [req.user.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'User not found.' });
    return res.json({ user: rows[0] });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error.' });
  }
});

// ── Helper ────────────────────────────────────────────────────────────────────
// name is included so socket broadcasts built from req.user carry the author name
function signToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, name: user.name, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
}

export default router;
