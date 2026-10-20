// src/utils/moderation.js
// Shared rules for editing/deleting class content.

// The professor who owns the class (req.classId) may remove anything in it.
// req.isClassOwner is set by requireClassMember / requireClassMemberViaPost.
export function isClassProfessor(req) {
  return req.isClassOwner === true;
}

// Each post (question, comment, reply) earned its author one participation
// point; take those back when the posts are deleted. `db` may be a client in a
// transaction.
export async function takeBackPoints(db, authorIds) {
  const counts = new Map();
  for (const id of authorIds) counts.set(id, (counts.get(id) ?? 0) + 1);
  for (const [id, n] of counts) {
    await db.query(`UPDATE users SET talents = GREATEST(talents - $2, 0) WHERE id = $1`, [id, n]);
  }
}
