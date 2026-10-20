// Edit, delete and thumbs up on everything in the Questions card: questions,
// the professor's answers, and replies to answers.
import path from 'node:path';
import { createRequire } from 'node:module';
import { test, expect } from '@playwright/test';
import { STUDENTS } from './people.js';
import { BACKEND_DIR, API_PORT, testDatabaseUrl } from '../test-db.js';
import { signInStudent, signInProfessor, openClass, card, unique, fixtures, professorToken, studentToken } from './helpers.js';

const { alice, dana } = STUDENTS;
const API = `http://localhost:${API_PORT}`;

// Put a question straight into today's list (keeps clear of the per-minute
// question limit that other tests use).
async function insertQuestion(authorKey, content, answer = null) {
  const require = createRequire(path.join(BACKEND_DIR, 'package.json'));
  const pg = require('pg');
  const db = new pg.Client({ connectionString: testDatabaseUrl() });
  await db.connect();
  await db.query(`SET TIME ZONE 'America/Los_Angeles'`);
  const { rows: [q] } = await db.query(
    `INSERT INTO questions (class_id, author_id, content, answer, answered_at)
     VALUES ($1, $2, $3, $4, CASE WHEN $4::text IS NULL THEN NULL ELSE NOW() END) RETURNING id`,
    [fixtures().classId, fixtures().studentIds[authorKey], content, answer]
  );
  await db.end();
  return q.id;
}
async function call(method, p, token, body) {
  const res = await fetch(API + p, {
    method, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: res.status, data: await res.json() };
}
const item = (page, text) => card(page, /Questions/).locator('li').filter({ hasText: text }).first();

async function twoStudents(browser) {
  const ctxs = await Promise.all([browser.newContext(), browser.newContext()]);
  const [me, other] = await Promise.all(ctxs.map((c) => c.newPage()));
  for (const p of [me, other]) p.on('dialog', (d) => d.accept());
  await signInStudent(me, dana);    await openClass(me);
  await signInStudent(other, alice); await openClass(other);
  return { me, other, close: () => Promise.all(ctxs.map((c) => c.close())) };
}

test('students edit, delete and thumbs-up questions; classmates see it live', async ({ browser }) => {
  const text = unique('Is the case study due Friday?');
  await insertQuestion('dana', text);
  const { me, other, close } = await twoStudents(browser);

  const mine = item(me, text);
  await expect(mine.getByText('You', { exact: true })).toBeVisible();
  await expect(mine.getByRole('button', { name: 'Edit question' })).toBeVisible();
  await expect(mine.getByRole('button', { name: 'Delete question' })).toBeVisible();

  const theirs = item(other, text);
  await expect(theirs.getByText('Anonymous', { exact: true })).toBeVisible();
  await expect(theirs.getByRole('button', { name: /Edit|Delete/ })).toHaveCount(0);

  // A classmate gives it a thumbs up
  await theirs.getByRole('button', { name: /^Like question/ }).click();
  await expect(mine.getByRole('button', { name: 'Like question (1 like)' })).toBeVisible();

  // Edit
  const edited = unique('Is the case study due Friday or Monday?');
  await mine.getByRole('button', { name: 'Edit question' }).click();
  await me.getByRole('textbox', { name: 'Edit question' }).fill(edited);
  await me.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(item(other, edited).getByText('(edited)')).toBeVisible();

  // Delete
  await item(me, edited).getByRole('button', { name: 'Delete question' }).click();
  await expect(other.getByText(edited)).toHaveCount(0);
  await expect(me.getByText(edited)).toHaveCount(0);

  await close();
});

test('the professor edits, removes and gets thumbs up on answers, and can delete any question', async ({ browser }) => {
  const q1 = unique('What counts as a conversion?');
  const q2 = unique('Off-topic question to remove');
  await insertQuestion('alice', q1);
  await insertQuestion('alice', q2);

  const profCtx = await browser.newContext();
  const prof = await profCtx.newPage();
  prof.on('dialog', (d) => d.accept());
  await signInProfessor(prof); await openClass(prof);
  const { me: stu, other, close } = await twoStudents(browser);

  // Answer, then edit the answer
  await item(prof, q1).getByRole('button', { name: 'Answer', exact: true }).click();
  await item(prof, q1).getByLabel('Write an answer').fill('Any action you decide to track.');
  await item(prof, q1).getByRole('button', { name: 'Post answer' }).click();
  await item(prof, q1).getByRole('button', { name: 'Edit answer' }).click();
  await prof.getByRole('textbox', { name: 'Edit answer' }).fill('Any action you decide to track, such as a purchase or sign-up.');
  await prof.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(item(stu, q1).getByText('such as a purchase or sign-up.')).toBeVisible();
  await expect(item(stu, q1).getByText(/Professor answered.*\(edited\)/)).toBeVisible();

  // Students can't edit or remove the answer, but can thumbs-up it
  await expect(item(stu, q1).getByRole('button', { name: /Edit answer|Delete answer/ })).toHaveCount(0);
  await item(stu, q1).getByRole('button', { name: /^Like answer/ }).click();
  await expect(item(prof, q1).getByRole('button', { name: 'Like answer (1 like)' })).toBeVisible();

  // A student replies; the professor removes the answer and the reply goes with it
  const reply = unique('Does a newsletter sign-up count?');
  await item(stu, q1).getByRole('button', { name: 'Reply', exact: true }).click();
  await item(stu, q1).getByLabel('Write a reply to this answer').fill(reply);
  await item(stu, q1).getByRole('button', { name: 'Post reply' }).click();
  await expect(item(prof, q1).getByText(reply)).toBeVisible();
  await item(prof, q1).getByRole('button', { name: 'Delete answer' }).click();
  await expect(item(stu, q1).getByText('Professor answered')).toHaveCount(0);
  await expect(item(stu, q1).getByText(reply)).toHaveCount(0);
  await expect(item(prof, q1).getByRole('button', { name: 'Answer', exact: true })).toBeVisible();

  // The professor can delete a student's question (but not edit it)
  await expect(item(prof, q2).getByRole('button', { name: 'Edit question' })).toHaveCount(0);
  await item(prof, q2).getByRole('button', { name: 'Delete question' }).click();
  await expect(other.getByText(q2)).toHaveCount(0);

  await close(); await profCtx.close();
});

test('students edit, delete and thumbs-up replies to answers', async ({ browser }) => {
  const q = unique('Will slides be posted?');
  await insertQuestion('alice', q, 'Yes, after class.');
  const { me, other, close } = await twoStudents(browser);

  const reply = unique('Thanks! Including the bonus slides?');
  await item(me, q).getByRole('button', { name: 'Reply', exact: true }).click();
  await item(me, q).getByLabel('Write a reply to this answer').fill(reply);
  await item(me, q).getByRole('button', { name: 'Post reply' }).click();
  const myReply = item(me, q).getByRole('list', { name: 'Replies to this answer' });
  await expect(myReply.getByRole('button', { name: 'Edit reply' })).toBeVisible();

  const theirReplies = item(other, q).getByRole('list', { name: 'Replies to this answer' });
  await expect(theirReplies.getByRole('button', { name: /Edit reply|Delete reply/ })).toHaveCount(0);
  await theirReplies.getByRole('button', { name: /^Like reply/ }).click();
  await expect(myReply.getByRole('button', { name: 'Like reply (1 like)' })).toBeVisible();

  const edited = unique('Thanks! Including the bonus slides from week 2?');
  await myReply.getByRole('button', { name: 'Edit reply' }).click();
  await me.getByRole('textbox', { name: 'Edit reply' }).fill(edited);
  await me.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(theirReplies.getByText(edited)).toBeVisible();

  await myReply.getByRole('button', { name: 'Delete reply' }).click();
  await expect(theirReplies).toHaveCount(0);

  await close();
});

test("the server refuses edits and deletes on other people's questions and replies", async () => {
  const { classId } = fixtures();
  const id = await insertQuestion('dana', unique('Dana owns this one'), 'An answer.');
  const aliceTok = await studentToken('alice', alice);
  expect((await call('PATCH',  `/api/classes/${classId}/questions/${id}`, aliceTok, { content: 'hijack' })).status).toBe(404);
  expect((await call('DELETE', `/api/classes/${classId}/questions/${id}`, aliceTok)).status).toBe(404);
  expect((await call('DELETE', `/api/classes/${classId}/questions/${id}/answer`, aliceTok)).status).toBe(403);
  const danaTok = await studentToken('dana', dana);
  const { data: reply } = await call('POST', `/api/classes/${classId}/questions/${id}/replies`, danaTok, { content: 'mine' });
  expect((await call('PATCH',  `/api/classes/${classId}/questions/${id}/replies/${reply.id}`, aliceTok, { content: 'x' })).status).toBe(404);
  expect((await call('DELETE', `/api/classes/${classId}/questions/${id}/replies/${reply.id}`, aliceTok)).status).toBe(404);
  // The professor can delete it
  expect((await call('DELETE', `/api/classes/${classId}/questions/${id}/replies/${reply.id}`, await professorToken())).status).toBe(200);
});
