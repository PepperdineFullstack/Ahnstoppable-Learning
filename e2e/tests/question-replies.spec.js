// Replies under the professor's answer in the Questions card.
import path from 'node:path';
import { createRequire } from 'node:module';
import { test, expect } from '@playwright/test';
import { STUDENTS } from './people.js';
import { BACKEND_DIR, API_PORT, testDatabaseUrl } from '../test-db.js';
import { signInStudent, signInProfessor, openClass, card, unique, fixtures, professorToken, studentToken } from './helpers.js';

const { alice, casey } = STUDENTS;
const API = `http://localhost:${API_PORT}`;

// Put a question from Alice straight into today's list (keeps this test clear
// of the per-minute question limit other tests use).
async function insertQuestion(content) {
  const require = createRequire(path.join(BACKEND_DIR, 'package.json'));
  const pg = require('pg');
  const db = new pg.Client({ connectionString: testDatabaseUrl() });
  await db.connect();
  await db.query(`SET TIME ZONE 'America/Los_Angeles'`);
  const { rows: [q] } = await db.query(
    `INSERT INTO questions (class_id, author_id, content) VALUES ($1, $2, $3) RETURNING id`,
    [fixtures().classId, fixtures().studentIds.alice, content]
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

test('students can reply to the professor’s answer, and everyone sees it live', async ({ browser }) => {
  const { classId } = fixtures();
  const question = unique('Is the final cumulative?');
  const answer = unique('Yes, but weighted toward the second half.');
  const id = await insertQuestion(question);

  // Unanswered: no replies yet
  const caseyTok = await studentToken('casey', casey);
  expect((await call('POST', `/api/classes/${classId}/questions/${id}/replies`, caseyTok, { content: 'early' })).status).toBe(409);
  expect((await call('PATCH', `/api/classes/${classId}/questions/${id}/answer`, await professorToken(), { answer })).status).toBe(200);

  const contexts = await Promise.all([browser.newContext(), browser.newContext(), browser.newContext()]);
  const [prof, stu, other] = await Promise.all(contexts.map((c) => c.newPage()));
  await signInProfessor(prof);   await openClass(prof);
  await signInStudent(stu, casey); await openClass(stu);
  await signInStudent(other, alice); await openClass(other);

  const item = (page) => card(page, /Questions/).locator('li').filter({ hasText: question });
  await expect(item(stu).getByText(answer)).toBeVisible();

  const reply = unique('Does that include the guest lecture?');
  await item(stu).getByRole('button', { name: 'Reply', exact: true }).click();
  await item(stu).getByLabel('Write a reply to this answer').fill(reply);
  await item(stu).getByRole('button', { name: 'Post reply' }).click();

  const mine = item(stu).getByRole('list', { name: 'Replies to this answer' });
  await expect(mine).toContainText(reply);
  await expect(mine).toContainText('You');

  // The professor sees it live, with the student's name
  await expect(item(prof).getByRole('list', { name: 'Replies to this answer' })).toContainText(reply);
  await expect(item(prof).getByRole('list', { name: 'Replies to this answer' })).toContainText(casey.name);

  // A classmate sees it live, anonymously
  const theirs = item(other).getByRole('list', { name: 'Replies to this answer' });
  await expect(theirs).toContainText(reply);
  await expect(theirs).toContainText('Anonymous');
  await expect(theirs).not.toContainText(casey.name);

  // The professor can reply back
  const back = unique('Yes, it does.');
  await item(prof).getByRole('button', { name: 'Reply', exact: true }).click();
  await item(prof).getByLabel('Write a reply to this answer').fill(back);
  await item(prof).getByRole('button', { name: 'Post reply' }).click();
  await expect(item(stu).getByRole('list', { name: 'Replies to this answer' })).toContainText(back);

  // Still there after a reload
  await stu.reload();
  await expect(item(stu).getByRole('list', { name: 'Replies to this answer' })).toContainText(reply);

  await Promise.all(contexts.map((c) => c.close()));
});

test("the professor's answer box opens full width under the question and grows", async ({ page }) => {
  const question = unique('Can you explain reach vs frequency?');
  await insertQuestion(question);
  await signInProfessor(page);
  await openClass(page);

  const item = card(page, /Questions/).locator('li').filter({ hasText: question });
  await item.getByRole('button', { name: 'Answer', exact: true }).click();
  const box = item.getByLabel('Write an answer');
  const boxSize  = await box.boundingBox();
  const itemSize = await item.boundingBox();
  expect(boxSize.width).toBeGreaterThan(itemSize.width * 0.9);       // not squeezed into the corner
  expect(boxSize.y).toBeGreaterThan((await item.getByText(question).boundingBox()).y);

  const answer = unique('Reach is how many people see it; frequency is how often each person does.') + '\n'.repeat(1) +
    'For a launch you usually want reach first, then frequency for the people most likely to buy.\nThird line.\nFourth line.';
  await box.fill(answer);
  expect((await box.boundingBox()).height).toBeGreaterThan(boxSize.height);
  await item.getByRole('button', { name: 'Post answer' }).click();
  await expect(item.getByText('Professor answered')).toBeVisible();
  await expect(item.getByLabel('Write an answer')).toHaveCount(0);
});
