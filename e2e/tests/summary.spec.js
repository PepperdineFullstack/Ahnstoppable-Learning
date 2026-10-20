// The professor's AI summary of a day's student questions, against the fake
// Claude API (fake-anthropic.js): no key, no cost, real SDK call path.
import { test, expect } from '@playwright/test';
import { STUDENTS } from './people.js';
import { API_PORT, FAKE_ANTHROPIC_PORT } from '../test-db.js';
import { signInProfessor, signInStudent, openClass, card, unique, fixtures, studentToken } from './helpers.js';

const { casey } = STUDENTS;
const API  = `http://localhost:${API_PORT}`;
const FAKE = `http://localhost:${FAKE_ANTHROPIC_PORT}`;

async function call(method, path, token, body) {
  const res = await fetch(API + path, {
    method,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: res.status, data: await res.json() };
}
async function ask(token, content) {
  const res = await call('POST', `/api/classes/${fixtures().classId}/questions`, token, { content });
  expect(res.status).toBe(201);
}
const fakeRequests = async () => (await fetch(`${FAKE}/__requests`)).json();
const setFakeMode  = (mode) => fetch(`${FAKE}/__mode`, { method: 'POST', body: JSON.stringify({ mode }) });

test.describe.configure({ mode: 'serial' });

test.afterEach(async () => { await setFakeMode('ok'); });

test('the professor summarizes the day, and it is saved for next time', async ({ page }) => {
  const token = await studentToken('casey', casey);
  const asked = [unique('What does CPM measure?'), unique('How is CPC different from CPM?'), unique('When is the midterm?')];
  for (const q of asked) await ask(token, q);

  await signInProfessor(page);
  await openClass(page);
  const questions = card(page, /Questions/);
  const before = (await fakeRequests()).length;

  await questions.getByRole('button', { name: '✨ Summarize questions' }).click();
  const summary = questions.getByRole('region', { name: 'AI summary of questions' });
  await expect(summary).toBeVisible();
  await expect(summary.getByText(/^Fake overview of \d+ questions\.$/)).toBeVisible();
  await expect(summary.getByText('Fake confusion')).toBeVisible();
  await expect(summary.getByText('Fake follow-up')).toBeVisible();
  await expect(summary.getByText(/AI-generated, may contain mistakes/)).toBeVisible();

  // Expanding the theme lists the questions it covers
  await summary.getByText('Fake theme').click();
  for (const q of asked) await expect(summary.getByText(`“${q}”`)).toBeVisible();

  // What was sent to the AI: the model, the schema, the questions, and no names
  const requests = await fakeRequests();
  expect(requests.length).toBe(before + 1);
  const { body, headers } = requests.at(-1);
  expect(body.model).toBe('claude-opus-5-5');
  expect(body.output_config.format.type).toBe('json_schema');
  expect(headers.beta).toContain('server-side-fallback-2026-07-01');
  expect(body.fallbacks).toBe('default');
  const sent = JSON.stringify(body.messages);
  for (const q of asked) expect(sent).toContain(q);
  for (const s of Object.values(STUDENTS)) {
    expect(sent).not.toContain(s.name);
    expect(sent).not.toContain(s.label);
  }

  // Reopening the day shows the saved summary without calling the AI again
  await page.reload();
  await expect(card(page, /Questions/).getByRole('region', { name: 'AI summary of questions' })).toBeVisible();
  expect((await fakeRequests()).length).toBe(before + 1);
});

test('new questions show a Refresh hint, and Refresh updates the summary', async ({ page }) => {
  await signInProfessor(page);
  await openClass(page);
  const questions = card(page, /Questions/);
  const summary = questions.getByRole('region', { name: 'AI summary of questions' });
  const footer = summary.getByText(/^Summarized at .* from \d+ questions?/);
  const countBefore = Number((await footer.textContent()).match(/from (\d+) question/)[1]);

  await ask(await studentToken('casey', casey), unique('Can we get practice problems?'));
  const refresh = summary.getByRole('button', { name: 'Refresh (1 new question)' });
  await expect(refresh).toBeVisible();
  await refresh.click();
  await expect(footer).toContainText(`from ${countBefore + 1} questions`);
  await expect(summary.getByRole('button', { name: 'Refresh', exact: true })).toBeVisible();
});

test('an AI refusal or busy service shows a message and keeps the saved summary', async ({ page }) => {
  await signInProfessor(page);
  await openClass(page);
  const summary = card(page, /Questions/).getByRole('region', { name: 'AI summary of questions' });
  const footer = summary.getByText(/^Summarized at .* from \d+ questions?/);
  const before = await footer.textContent();

  await setFakeMode('refusal');
  await summary.getByRole('button', { name: /^Refresh/ }).click();
  await expect(summary.getByText("The AI couldn't summarize these questions.")).toBeVisible();

  await setFakeMode('rate_limit');
  await summary.getByRole('button', { name: /^Refresh/ }).click();
  await expect(summary.getByText(/The AI service is busy/)).toBeVisible();

  await page.reload();
  await expect(card(page, /Questions/).getByText(/^Summarized at .* from \d+ questions?/)).toHaveText(before);
});

test('students cannot see or create summaries', async ({ page }) => {
  const token = await studentToken('casey', casey);
  const { classId } = fixtures();
  expect((await call('GET',  `/api/classes/${classId}/questions/summary`, token)).status).toBe(403);
  expect((await call('POST', `/api/classes/${classId}/questions/summary`, token, {})).status).toBe(403);

  await signInStudent(page, casey);
  await openClass(page);
  const questions = card(page, /Questions/);
  await expect(questions.getByRole('button', { name: /Summarize questions/ })).toHaveCount(0);
  await expect(questions.getByRole('region', { name: 'AI summary of questions' })).toHaveCount(0);
});
