// src/routes/auth.js
// POST /api/auth/register  – create a new user account
// POST /api/auth/login     – exchange credentials for a JWT
 
import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import pool from '../db/pool.js';
 
const router = express.Router();
 
const SALT_ROUNDS = 12;
 
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
 
// ── Login ─────────────────────────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
 
  if (!email || !password) {
    return res.status(400).json({ error: 'email and password are required.' });
  }
 
  try {
    const { rows } = await pool.query(
      `SELECT id, email, name, role, password AS hash FROM users WHERE email = $1`,
      [email.toLowerCase()]
    );
    if (rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }
 
    const user = rows[0];
    const match = await bcrypt.compare(password, user.hash);
    if (!match) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }
 
    const { hash: _removed, ...safeUser } = user;
    const token = signToken(safeUser);
    return res.json({ user: safeUser, token });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error.' });
  }
});
 
// ── Helper ────────────────────────────────────────────────────────────────────
function signToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, name: user.name, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
}
 
export default router;