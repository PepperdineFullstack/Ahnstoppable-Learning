// src/utils/membership.js
// Shared guard: the requesting user must be enrolled in the class.
// Sends the 403 itself and returns false so handlers can just bail out.

import pool from '../db/pool.js';

export async function assertMember(userId, classId, res) {
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
