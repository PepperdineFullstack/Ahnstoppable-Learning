// Editing and deleting discussion comments and replies.
import { test, expect } from '@playwright/test';
import { STUDENTS, BOB_COMMENT } from './people.js';
import { API_PORT } from '../test-db.js';
import { signInStudent, signInProfessor, openClass, unique, fixtures, studentToken, professorToken } from './helpers.js';

const { alice, casey } = STUDENTS;
const API = `http://localhost:${API_PORT}`;

async function call(method, path, token, body) {
  const res = await fetch(API + path, {
    method, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: res.status, data: await res.json() };
}
async function talentsOf(name) {
  const { data } = await call('GET', `/api/classes/${fixtures().classId}/talents`, await professorToken());
  return data.find((u) => u.name === name).talents;
}

test('a student edits and deletes their own comment and reply; classmates see it live', async ({ browser }) => {
  const startPoints = await talentsOf(casey.name);
  const [mineCtx, otherCtx] = await Promise.all([browser.newContext(), browser.newContext()]);
  const [me, other] = await Promise.all([mineCtx.newPage(), otherCtx.newPage()]);
  for (const p of [me, other]) p.on('dialog', (d) => d.accept());
  await signInStudent(me, casey);    await openClass(me);
  await signInStudent(other, alice); await openClass(other);

  // Post a comment: it's marked as mine, with Edit and Delete
  const text = unique('My comment');
  await me.getByLabel('Write a comment').fill(text);
  await me.getByRole('button', { name: 'Post', exact: true }).click();
  const mine = me.getByTestId('comment').filter({ hasText: text });
  await expect(mine.getByRole('heading', { name: 'You' })).toBeVisible();
  await expect(mine.getByRole('button', { name: 'Edit comment' })).toBeVisible();

  // A classmate sees it anonymously, with no Edit or Delete
  const theirs = other.getByTestId('comment').filter({ hasText: text });
  await expect(theirs.getByRole('heading', { name: 'Anonymous' })).toBeVisible();
  await expect(theirs.getByRole('button', { name: /Edit|Delete/ })).toHaveCount(0);

  // Edit it
  const edited = unique('My edited comment');
  await mine.getByRole('button', { name: 'Edit comment' }).click();
  // While editing, the text becomes an edit box, so find the box on the page
  await me.getByRole('textbox', { name: 'Edit comment' }).fill(edited);
  await me.getByRole('button', { name: 'Save', exact: true }).click();
  const mineEdited = me.getByTestId('comment').filter({ hasText: edited });
  await expect(mineEdited.getByText('(edited)')).toBeVisible();
  const theirsEdited = other.getByTestId('comment').filter({ hasText: edited });
  await expect(theirsEdited.getByText('(edited)')).toBeVisible();          // live for classmates
  await expect(other.getByText(text, { exact: true })).toHaveCount(0);

  // Reply to it, edit the reply, then delete the reply
  const reply = unique('My reply');
  await mineEdited.getByRole('button', { name: 'Reply', exact: true }).click();
  await mineEdited.getByLabel('Write a reply').fill(reply);
  await mineEdited.getByRole('button', { name: 'Post reply' }).click();
  await expect(mineEdited.getByText(reply)).toBeVisible();
  expect(await talentsOf(casey.name)).toBe(startPoints + 2);

  const replyEdited = unique('My edited reply');
  await mineEdited.getByRole('button', { name: 'Edit reply' }).click();
  await me.getByRole('textbox', { name: 'Edit reply' }).fill(replyEdited);
  await me.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(mineEdited.getByText(replyEdited)).toBeVisible();
  await mineEdited.getByRole('button', { name: 'Delete reply' }).click();
  await expect(mineEdited.getByText(replyEdited)).toHaveCount(0);
  await expect(theirsEdited.getByText(replyEdited)).toHaveCount(0);

  // Delete the comment: gone for everyone, and the points come back off
  await mineEdited.getByRole('button', { name: 'Delete comment' }).click();
  await expect(me.getByText(edited)).toHaveCount(0);
  await expect(other.getByText(edited)).toHaveCount(0);
  expect(await talentsOf(casey.name)).toBe(startPoints);

  await Promise.all([mineCtx.close(), otherCtx.close()]);
});

test("students can't edit or delete others' comments; the professor can delete any", async ({ page }) => {
  const { postId } = fixtures();
  const aliceTok = await studentToken('alice', alice);
  const caseyTok = await studentToken('casey', casey);
  const profTok  = await professorToken();

  const { data: comments } = await call('GET', `/api/posts/${postId}/comments`, caseyTok);
  const bobs = comments.find((c) => c.content === BOB_COMMENT);
  expect(bobs.is_mine).toBe(false);
  expect(bobs.author_name).toBeUndefined();                        // still anonymous to students
  expect((await call('PATCH',  `/api/posts/${postId}/comments/${bobs.id}`, caseyTok, { content: 'hijacked' })).status).toBe(404);
  expect((await call('DELETE', `/api/posts/${postId}/comments/${bobs.id}`, caseyTok)).status).toBe(404);

  // Validation on edits
  const { data: own } = await call('POST', `/api/posts/${postId}/comments`, aliceTok, { content: unique('Alice to be moderated') });
  expect((await call('PATCH', `/api/posts/${postId}/comments/${own.id}`, aliceTok, { content: '   ' })).status).toBe(400);
  expect((await call('PATCH', `/api/posts/${postId}/comments/${own.id}`, aliceTok, { content: 'x'.repeat(1001) })).status).toBe(400);
  // The professor can't edit a student's words…
  expect((await call('PATCH', `/api/posts/${postId}/comments/${own.id}`, profTok, { content: 'edited by prof' })).status).toBe(404);

  // …but can delete them from the page
  page.on('dialog', (d) => d.accept());
  await signInProfessor(page);
  await openClass(page);
  const target = page.getByTestId('comment').filter({ hasText: own.content });
  await expect(target.getByRole('button', { name: 'Edit comment' })).toHaveCount(0);
  await target.getByRole('button', { name: 'Delete comment' }).click();
  await expect(page.getByText(own.content)).toHaveCount(0);
});
