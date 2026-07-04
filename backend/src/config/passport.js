// src/config/passport.js
// Passport strategies: local (email + password) and Google OAuth.
// Both run statelessly (session: false) – the auth routes issue a JWT on success.

import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import bcrypt from 'bcrypt';
import pool from '../db/pool.js';

// ── Email + password ──────────────────────────────────────────────────────────
passport.use(new LocalStrategy(
  { usernameField: 'email' },
  async (email, password, done) => {
    try {
      const { rows } = await pool.query(
        `SELECT id, email, name, role, password AS hash FROM users WHERE email = $1`,
        [email.toLowerCase()]
      );
      if (rows.length === 0) {
        return done(null, false, { message: 'Invalid credentials.' });
      }

      const user = rows[0];
      if (!user.hash) {
        // Account was created through Google OAuth and has no password
        return done(null, false, { message: 'This account uses Google sign-in.' });
      }

      const match = await bcrypt.compare(password, user.hash);
      if (!match) {
        return done(null, false, { message: 'Invalid credentials.' });
      }

      const { hash: _removed, ...safeUser } = user;
      return done(null, safeUser);
    } catch (err) {
      return done(err);
    }
  }
));

// ── Google OAuth ──────────────────────────────────────────────────────────────
// Only registered when credentials are configured, so the server still boots
// (with email/password auth) before Google Cloud Console is set up.
export const googleEnabled = Boolean(
  process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
);

if (googleEnabled) {
  passport.use(new GoogleStrategy(
    {
      clientID:     process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL:  process.env.GOOGLE_CALLBACK_URL ?? '/api/auth/google/callback',
    },
    async (_accessToken, _refreshToken, profile, done) => {
      const email  = profile.emails?.[0]?.value?.toLowerCase();
      const avatar = profile.photos?.[0]?.value ?? null;
      if (!email) {
        return done(null, false, { message: 'Google account has no email address.' });
      }

      try {
        // 1. Returning Google user
        const { rows: byGoogle } = await pool.query(
          `SELECT id, email, name, role FROM users WHERE google_id = $1`,
          [profile.id]
        );
        if (byGoogle.length > 0) return done(null, byGoogle[0]);

        // 2. Registered by email earlier – link the Google account to that row
        const { rows: byEmail } = await pool.query(
          `UPDATE users SET google_id = $1, avatar = COALESCE(avatar, $2)
           WHERE  email = $3
           RETURNING id, email, name, role`,
          [profile.id, avatar, email]
        );
        if (byEmail.length > 0) return done(null, byEmail[0]);

        // 3. Brand-new user – OAuth accounts start as students with no password
        const { rows } = await pool.query(
          `INSERT INTO users (email, name, role, google_id, avatar)
           VALUES ($1, $2, 'student', $3, $4)
           RETURNING id, email, name, role`,
          [email, profile.displayName ?? email, profile.id, avatar]
        );
        return done(null, rows[0]);
      } catch (err) {
        return done(err);
      }
    }
  ));
} else {
  console.warn('[auth] GOOGLE_CLIENT_ID/SECRET not set – Google sign-in disabled.');
}

export default passport;
