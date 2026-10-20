// Liking discussion comments and replies: one like per person, live counts,
// anonymous (only the number is shared).
import { test, expect } from '@playwright/test';
import { STUDENTS, BOB_COMMENT } from './people.js';
import { API_PORT } from '../test-db.js';
import { signInStudent, openClass, fixtures, studentToken } from './helpers.js';

const { alice, casey } = STUDENTS;
const API = `http://localhost:${API_PORT}`;

const thumbsUp = (thread, kind = 'comment') =>
  thread.getByRole('button', { name: new RegExp(`^(Like|Unlike) ${kind}`) }).first();

test('likes count once per person, update live, and survive a reload', async ({ browser }) => {
  const [aCtx, cCtx] = await Promise.all([browser.newContext(), browser.newContext()]);
  const [a, c] = await Promise.all([aCtx.newPage(), cCtx.newPage()]);
  await signInStudent(a, alice); await openClass(a);
  await signInStudent(c, casey); await openClass(c);
  const threadA = a.getByTestId('comment').filter({ hasText: BOB_COMMENT });
  const threadC = c.getByTestId('comment').filter({ hasText: BOB_COMMENT });

  await expect(thumbsUp(threadA)).toHaveAttribute('aria-pressed', 'false');
  await thumbsUp(threadA).click();
  await expect(thumbsUp(threadA)).toHaveAttribute('aria-pressed', 'true');
  await expect(thumbsUp(threadA)).toHaveAccessibleName('Unlike comment (1 like)');
  await expect(thumbsUp(threadC)).toHaveAccessibleName('Like comment (1 like)');      // live for Casey

  await thumbsUp(threadC).click();
  await expect(thumbsUp(threadA)).toHaveAccessibleName('Unlike comment (2 likes)');   // live for Alice

  await thumbsUp(threadA).click();                                                     // Alice unlikes
  await expect(thumbsUp(threadA)).toHaveAccessibleName('Like comment (1 like)');
  await expect(thumbsUp(threadC)).toHaveAccessibleName('Unlike comment (1 like)');

  await a.reload();
  await expect(thumbsUp(a.getByTestId('comment').filter({ hasText: BOB_COMMENT }))).toHaveAccessibleName('Like comment (1 like)');
  await c.reload();
  await expect(thumbsUp(c.getByTestId('comment').filter({ hasText: BOB_COMMENT }))).toHaveAccessibleName('Unlike comment (1 like)');

  // Replies can be liked too (add one first; this test may run before any exist)
  const { postId } = fixtures();
  const aliceTok = await studentToken('alice', alice);
  const comments = await (await fetch(`${API}/api/posts/${postId}/comments`, { headers: { Authorization: `Bearer ${aliceTok}` } })).json();
  const bobsId = comments.find((x) => x.content === BOB_COMMENT).id;
  const made = await fetch(`${API}/api/posts/${postId}/comments/${bobsId}/replies`, {
    method: 'POST', headers: { Authorization: `Bearer ${aliceTok}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ content: 'A reply to like' }),
  });
  expect(made.status).toBe(201);
  await c.reload();
  const threadC2 = c.getByTestId('comment').filter({ hasText: BOB_COMMENT });
  await threadC2.getByRole('button', { name: /View \d+ repl/ }).click();
  await thumbsUp(threadC2, 'reply').click();
  await expect(thumbsUp(threadC2, 'reply')).toHaveAccessibleName('Unlike reply (1 like)');

  await Promise.all([aCtx.close(), cCtx.close()]);
});

test('liking twice counts once, and who liked is never sent', async () => {
  const { postId } = fixtures();
  const token = await studentToken('alice', alice);
  const { data: comments } = await (await fetch(`${API}/api/posts/${postId}/comments`, { headers: { Authorization: `Bearer ${token}` } })).json().then((d) => ({ data: d }));
  const bobs = comments.find((x) => x.content === BOB_COMMENT);

  const like = () => fetch(`${API}/api/posts/${postId}/comments/${bobs.id}/like`, { method: 'PUT', headers: { Authorization: `Bearer ${token}` } }).then((r) => r.json());
  const first = await like();
  const second = await like();
  expect(second.like_count).toBe(first.like_count);
  expect(Object.keys(second).sort()).toEqual(['commentId', 'like_count', 'liked_by_me', 'postId']);

  const missing = await fetch(`${API}/api/posts/${postId}/comments/999999/like`, { method: 'PUT', headers: { Authorization: `Bearer ${token}` } });
  expect(missing.status).toBe(404);

  // Leave things as they were for other tests
  await fetch(`${API}/api/posts/${postId}/comments/${bobs.id}/like`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
});
