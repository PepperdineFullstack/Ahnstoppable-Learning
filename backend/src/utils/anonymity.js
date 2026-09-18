// src/utils/anonymity.js
// Students must never learn who wrote a student-authored comment or reply.
// Professors always see real names; professor-authored rows are never masked.

// Strip author identity from a student-authored row (and its nested replies).
export function maskForStudent(row) {
  if (!row || typeof row !== 'object') return row;
  const { author_id, author_name, ...rest } = row; // eslint-disable-line no-unused-vars
  const masked = row.author_role === 'student' ? rest : row;
  return Array.isArray(row.replies)
    ? { ...masked, replies: row.replies.map(maskForStudent) }
    : masked;
}

// Shape a row for the requesting user.
export function forRequester(req, row) {
  return req.user.role === 'professor' ? row : maskForStudent(row);
}
