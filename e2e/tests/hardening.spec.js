// Access rules and robustness of discussion comments and replies: only the
// class's own professor sees names or runs the class, hidden future posts stay
// hidden, bad ids are 404s (not server errors), reply errors show in the reply
// box, and a dropped connection catches up on its own.
import path from 'node:path';
import { createRequire } from 'node:module';
import { test, expect } from '@playwright/test';
import { STUDENTS, BOB_COMMENT } from './people.js';
import { BACKEND_DIR, APP_TIMEZONE, API_PORT, testDatabaseUrl } from '../test-db.js';
import { signInStudent, openClass, unique, fixtures, studentToken, professorToken } from './helpers.js';

const { alice, bob, dana } = STUDENTS;
const API = `http://localhost:${API_PORT}`;

async function call(method, path, token, body) {
  const res = await fetch(API + path, {
    method, headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: res.status, data: await res.json().catch(() => null) };
}

async function withDb(fn) {
  const require = createRequire(path.join(BACKEND_DIR, 'package.json'));
  const pg = require('pg');
  const db = new pg.Client({ connectionString: testDatabaseUrl() });
  await db.connect();
  try { return await fn(db, require); } finally { await db.end(); }
}

function dayKey(offsetDays = 0) {
  return new Date(Date.now() + offsetDays * 86_400_000).toLocaleDateString('en-CA', { timeZone: APP_TIMEZONE });
}

async function bobsCommentId(token) {
  const { postId } = fixtures();
  const { data } = await call('GET', `/api/posts/${postId}/comments`, token);
  return data.find((c) => c.content === BOB_COMMENT).id;
}

test('a professor who is only a member of someone else\'s class sees no names and cannot run it', async () => {
  const { classId, postId } = fixtures();
  const email = `other-prof-${Date.now()}@test.local`;
  const password = 'otherpass1';

  // Another professor account, enrolled the way the old join-by-code allowed.
  const otherId = await withDb(async (db, require) => {
    const bcrypt = require('bcrypt');
    const { rows: [u] } = await db.query(
      `INSERT INTO users (email, password, name, role) VALUES ($1, $2, 'Other Professor', 'professor') RETURNING id`,
      [email, await bcrypt.hash(password, 4)]
    );
    return u.id;
  });
  const token = (await call('POST', '/api/auth/login', null, { email, password })).data.token;

  // Join-by-code is gone.
  expect((await call('POST', '/api/classes/join', token, { join_code: 'E2E001' })).status).toBe(404);

  await withDb((db) => db.query(`INSERT INTO class_members (user_id, class_id) VALUES ($1, $2)`, [otherId, classId]));
  try {
    // Student authors stay anonymous to them.
    const { status, data: comments } = await call('GET', `/api/posts/${postId}/comments`, token);
    expect(status).toBe(200);
    const bobs = comments.find((c) => c.content === BOB_COMMENT);
    expect(bobs.author_name).toBeUndefined();
    expect(bobs.author_id).toBeUndefined();

    // Owner-only actions are refused.
    expect((await call('POST', `/api/classes/${classId}/posts`, token, { title: 'Not mine', content: 'x' })).status).toBe(403);
    expect((await call('POST', `/api/classes/${classId}/polls`, token, { question: 'Q?', options: ['a', 'b'] })).status).toBe(403);
    expect((await call('POST', `/api/classes/${classId}/understand/rounds`, token, {})).status).toBe(403);
    expect((await call('POST', `/api/classes/${classId}/questions/summary`, token, {})).status).toBe(403);
    expect((await call('GET', `/api/classes/${classId}/roster`, token)).status).toBe(403);
    expect((await call('GET', `/api/classes/${classId}/polls/history`, token)).status).toBe(403);

    // …and they can't delete students' comments as a moderator.
    const bobsId = bobs.id;
    expect((await call('DELETE', `/api/posts/${postId}/comments/${bobsId}`, token)).status).toBe(404);

    // The class's real professor still sees names.
    const prof = await professorToken();
    const asOwner = (await call('GET', `/api/posts/${postId}/comments`, prof)).data;
    expect(asOwner.find((c) => c.id === bobsId).author_name).toBe(bob.name);
  } finally {
    await withDb((db) => db.query(`DELETE FROM class_members WHERE user_id = $1`, [otherId]));
  }
});

test('students get 404 for comments on a post planned for a future day', async () => {
  const { classId } = fixtures();
  const prof = await professorToken();
  const { data: post } = await call('POST', `/api/classes/${classId}/posts`, prof, {
    title: unique('Future topic'), content: 'Not yet.', post_date: dayKey(2),
  });
  try {
    const aliceTok = await studentToken('alice', alice);
    expect((await call('GET', `/api/posts/${post.id}/comments`, aliceTok)).status).toBe(404);
    expect((await call('POST', `/api/posts/${post.id}/comments`, aliceTok, { content: 'Sneaky' })).status).toBe(404);
    expect((await call('GET', `/api/posts/${post.id}/comments`, prof)).status).toBe(200);
  } finally {
    await call('DELETE', `/api/classes/${classId}/posts/${post.id}`, prof);
  }
});

test('bad or oversized ids are 404s, not server errors', async () => {
  const { postId, classId } = fixtures();
  const tok = await studentToken('alice', alice);
  for (const bad of ['abc', '99999999999']) {
    expect((await call('POST', `/api/posts/${postId}/comments/${bad}/replies`, tok, { content: 'hi' })).status).toBe(404);
    expect((await call('PUT', `/api/posts/${postId}/comments/${bad}/like`, tok)).status).toBe(404);
    expect((await call('GET', `/api/posts/${bad}/comments`, tok)).status).toBe(404);
    expect((await call('GET', `/api/classes/${bad}/posts`, tok)).status).toBe(404);
  }
  const prof = await professorToken();
  expect((await call('DELETE', `/api/classes/${classId}/posts/abc`, prof)).status).toBe(404);
  // Non-text sign-in fields are a 400, not a crash.
  expect((await call('POST', '/api/auth/login', null, { email: ['x'], password: 'y' })).status).toBe(400);
});

test('a refused reply shows its error inside the reply box and keeps the text', async ({ page }) => {
  await signInStudent(page, dana);
  await openClass(page);
  const message = "You're posting comments and replies too quickly. Wait a minute and try again.";
  await page.route('**/api/posts/*/comments/*/replies', (route) => (route.request().method() === 'POST'
    ? route.fulfill({ status: 429, contentType: 'application/json', body: JSON.stringify({ error: message }) })
    : route.continue()));

  const thread = page.getByTestId('comment').filter({ hasText: BOB_COMMENT });
  await thread.getByRole('button', { name: 'Reply', exact: true }).click();
  const box = thread.getByLabel('Write a reply');
  const post = thread.getByRole('button', { name: 'Post reply' });
  await expect(post).toBeDisabled();                     // nothing to post yet
  const text = unique('Refused reply');
  await box.fill(text);
  await post.click();

  const error = thread.getByRole('alert');
  await expect(error).toHaveText(message);
  await expect(box).toHaveValue(text);
  // The error sits with the reply box, right above its buttons.
  const errorY = (await error.boundingBox()).y;
  expect(errorY).toBeGreaterThan((await box.boundingBox()).y);
  expect(errorY).toBeLessThan((await post.boundingBox()).y);
});

test('the reply box and its draft survive hiding the replies it was under', async ({ page }) => {
  const { postId } = fixtures();
  const aliceTok = await studentToken('alice', alice);
  const bobsId = await bobsCommentId(aliceTok);
  await call('POST', `/api/posts/${postId}/comments/${bobsId}/replies`, aliceTok, { content: unique('Something to reply to') });

  await signInStudent(page, dana);
  await openClass(page);
  const thread = page.getByTestId('comment').filter({ hasText: BOB_COMMENT });
  await thread.getByRole('button', { name: /View \d+ repl/ }).click();
  await thread.getByRole('button', { name: /^Reply to / }).last().click();
  const draft = unique('Half-written');
  await thread.getByLabel('Write a reply').fill(draft);

  await thread.getByRole('button', { name: 'Hide replies' }).click();
  await expect(thread.getByLabel('Write a reply')).toHaveValue(draft);   // moved under the comment
});

test('after a dropped connection, missed replies and deletions show up without a reload', async ({ browser }) => {
  const { postId } = fixtures();
  const bobTok = await studentToken('bob', bob);
  const bobsId = await bobsCommentId(bobTok);
  const doomed = unique('Comment deleted while offline');
  const { data: doomedRow } = await call('POST', `/api/posts/${postId}/comments`, bobTok, { content: doomed });

  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await signInStudent(page, alice);
  await openClass(page);
  const thread = page.getByTestId('comment').filter({ hasText: BOB_COMMENT });
  await expect(page.getByText(doomed)).toBeVisible();
  const toggle = thread.getByRole('button', { name: /View \d+ repl/ });
  if (await toggle.count()) await toggle.click();

  const socketConnected = () => page.evaluate(async () => (await import('/src/api/socket.js')).default.connected);
  await expect.poll(socketConnected).toBe(true);
  await ctx.setOffline(true);
  // Make sure the socket notices, as it would after a laptop sleeps.
  await page.evaluate(async () => (await import('/src/api/socket.js')).default.io.engine.close());
  await expect.poll(socketConnected).toBe(false);

  const missed = unique('Reply sent while offline');
  expect((await call('POST', `/api/posts/${postId}/comments/${bobsId}/replies`, bobTok, { content: missed })).status).toBe(201);
  expect((await call('DELETE', `/api/posts/${postId}/comments/${doomedRow.id}`, bobTok)).status).toBe(200);

  await ctx.setOffline(false);
  await expect(thread.getByText(missed)).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText(doomed)).toHaveCount(0);

  await ctx.close();
});

test('a quick double-click on a like ends in the same state a reload shows', async ({ page }) => {
  const { postId } = fixtures();
  const bobTok = await studentToken('bob', bob);
  const text = unique('Comment to double-like');
  await call('POST', `/api/posts/${postId}/comments`, bobTok, { content: text });

  await signInStudent(page, dana);
  await openClass(page);
  const like = () => page.getByTestId('comment').filter({ hasText: text })
    .getByRole('button', { name: /^(Like|Unlike) comment/ }).first();
  await like().dblclick();
  await expect(like()).toHaveAccessibleName('Unlike comment (1 like)');   // the second click waited for the first
  await page.waitForLoadState('networkidle');
  const before = await like().getAttribute('aria-label');
  await page.reload();
  await expect(like()).toHaveAccessibleName(before);
});
