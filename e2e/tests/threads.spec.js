// Discussion threads, the comment box, and the class name on the class page.
import { test, expect } from '@playwright/test';
import { STUDENTS, BOB_COMMENT, PROFESSOR, CLASS } from './people.js';
import { API_PORT } from '../test-db.js';
import { signInStudent, signInProfessor, openClass, unique, fixtures, studentToken } from './helpers.js';

const { casey } = STUDENTS;

test('a student can keep replying in a thread, including from a reply', async ({ page }) => {
  await signInStudent(page, casey);
  await openClass(page);
  const thread = page.getByTestId('comment').filter({ hasText: BOB_COMMENT });

  // First reply, from the thread's Reply button
  const first = unique('First reply');
  await thread.getByRole('button', { name: 'Reply', exact: true }).click();
  await thread.getByLabel('Write a reply').fill(first);
  await thread.getByRole('button', { name: 'Post reply' }).click();
  await expect(thread.getByText(first)).toBeVisible();   // replies open on their own

  // Second reply, from the Reply link under a reply: the box opens right under that reply
  const second = unique('Second reply');
  await thread.getByRole('button', { name: /^Reply to / }).last().click();
  const box = thread.getByLabel('Write a reply');
  expect((await box.boundingBox()).y).toBeGreaterThan((await thread.getByText(first).boundingBox()).y);
  await box.fill(second);
  await thread.getByRole('button', { name: 'Post reply' }).click();
  await expect(thread.getByText(first)).toBeVisible();
  await expect(thread.getByText(second)).toBeVisible();
});

test('the reply box opens right under the comment when replying to the comment', async ({ page }) => {
  await signInStudent(page, casey);
  await openClass(page);
  const thread = page.getByTestId('comment').filter({ hasText: BOB_COMMENT });
  await thread.getByRole('button', { name: /View \d+ repl/ }).click();     // replies showing
  await thread.getByRole('button', { name: 'Reply', exact: true }).click();
  const box = thread.getByLabel('Write a reply');
  const comment = thread.getByText(BOB_COMMENT);
  const firstReply = thread.getByRole('button', { name: /^Reply to / }).first();
  const boxY = (await box.boundingBox()).y;
  expect(boxY).toBeGreaterThan((await comment.boundingBox()).y);
  expect(boxY).toBeLessThan((await firstReply.boundingBox()).y);
  await thread.getByRole('button', { name: 'Cancel' }).click();
  await expect(box).toHaveCount(0);
});

test('the comment box grows with the text and takes up to 1000 characters', async ({ page }) => {
  await signInStudent(page, casey);
  await openClass(page);
  const box = page.getByLabel('Write a comment');
  const empty = (await box.boundingBox()).height;

  const long = unique('Long comment:') + ' ' + 'This is a longer thought about the reading. '.repeat(12);
  await box.fill(long);
  expect((await box.boundingBox()).height).toBeGreaterThan(empty + 40);
  await box.fill('');
  expect((await box.boundingBox()).height).toBeLessThanOrEqual(empty + 1);   // shrinks back

  await box.fill(long);
  await expect(page.getByText(`${long.length} / 1000`)).toBeVisible();
  await page.getByRole('button', { name: 'Post', exact: true }).click();
  await expect(page.getByTestId('comment').filter({ hasText: 'Long comment:' }).last()).toBeVisible();

  // The server enforces the same limit (checked as Bob, whose posting allowance
  // other tests don't use, so the per-minute limit can't answer first)
  const token = await studentToken('bob', STUDENTS.bob);
  const res = await fetch(`http://localhost:${API_PORT}/api/posts/${fixtures().postId}/comments`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ content: 'x'.repeat(1001) }),
  });
  expect(res.status).toBe(400);
});

test('the class page shows which class it is', async ({ browser }) => {
  const profCtx = await browser.newContext();
  const prof = await profCtx.newPage();
  await signInProfessor(prof);
  await openClass(prof);
  await expect(prof.getByText("You're teaching")).toBeVisible();
  await expect(prof.getByTestId('class-name')).toHaveText(CLASS.label);
  await expect(prof).toHaveTitle(new RegExp(CLASS.label));

  const stuCtx = await browser.newContext();
  const stu = await stuCtx.newPage();
  await signInStudent(stu, casey);
  await openClass(stu);
  await expect(stu.getByTestId('class-name')).toHaveText(CLASS.label);
  await expect(stu.getByText(PROFESSOR.name).first()).toBeVisible();

  await Promise.all([profCtx.close(), stuCtx.close()]);
});
