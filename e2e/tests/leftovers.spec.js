// A check or poll the professor forgot to end on an earlier day must not carry
// over: today starts clean, nobody can vote in the old one, a new one can
// start, and the old day shows it ended at midnight.
import path from 'node:path';
import { createRequire } from 'node:module';
import { test, expect } from '@playwright/test';
import { STUDENTS } from './people.js';
import { BACKEND_DIR, APP_TIMEZONE, API_PORT, testDatabaseUrl } from '../test-db.js';
import { signInStudent, openClass, card, unique, fixtures, professorToken, studentToken, server } from './helpers.js';

const { alice } = STUDENTS;
const API = `http://localhost:${API_PORT}`;

function dayKey(offsetDays = 0) {
  return new Date(Date.now() + offsetDays * 86_400_000).toLocaleDateString('en-CA', { timeZone: APP_TIMEZONE });
}
async function call(method, path, token, body) {
  const res = await fetch(API + path, {
    method, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: res.status, data: await res.json().catch(() => null) };
}
async function withDb(fn) {
  const require = createRequire(path.join(BACKEND_DIR, 'package.json'));
  const pg = require('pg');
  const db = new pg.Client({ connectionString: testDatabaseUrl() });
  await db.connect();
  try { return await fn(db); } finally { await db.end(); }
}

test.beforeEach(async () => {
  await server.closeEverything(await professorToken());
});

test('a check and a poll left running yesterday do not carry over to today', async ({ page }) => {
  const { classId } = fixtures();
  const prof = await professorToken();
  const yesterday = dayKey(-1);

  // Start both today, then move them to yesterday, still running.
  const checkLabel = unique('Forgotten check');
  const round = await server.startCheck(prof, checkLabel);
  const question = unique('Forgotten poll');
  const poll = await server.createPoll(prof, question, ['Yes', 'No']);
  await withDb(async (db) => {
    await db.query(`UPDATE understand_rounds SET scheduled_for = $2, started_at = started_at - interval '1 day' WHERE id = $1`, [round.id, yesterday]);
    await db.query(`UPDATE polls SET scheduled_for = $2, opened_at = opened_at - interval '1 day' WHERE id = $1`, [poll.id, yesterday]);
  });

  // Today shows neither as live.
  await signInStudent(page, alice);
  await openClass(page);
  const checks = card(page, /Understanding Check/);
  const polls = card(page, /Polls/);
  await expect(checks.getByText('No check running')).toBeVisible();
  await expect(checks.getByText(checkLabel)).toHaveCount(0);
  await expect(polls.getByText('No poll running')).toBeVisible();
  await expect(polls.getByText(question)).toHaveCount(0);

  // Nobody can vote in them any more.
  const aliceTok = await studentToken('alice', alice);
  expect((await call('POST', `/api/classes/${classId}/understand`, aliceTok, { response: 'thumbs_up' })).status).toBe(409);
  const option = poll.options[0].id;
  expect((await call('POST', `/api/classes/${classId}/polls/${poll.id}/votes`, aliceTok, { option_id: option })).status).toBe(409);

  // They ended at midnight, so yesterday shows them as finished…
  const { data: rounds } = await call('GET', `/api/classes/${classId}/understand/rounds?date=${yesterday}`, prof);
  const old = rounds.find((r) => r.id === round.id);
  expect(old.ended_at).not.toBeNull();
  expect(new Date(old.ended_at).toLocaleDateString('en-CA', { timeZone: APP_TIMEZONE })).toBe(dayKey(0));
  const { data: dayPolls } = await call('GET', `/api/classes/${classId}/polls?date=${yesterday}`, prof);
  expect(dayPolls.find((s) => s.poll.id === poll.id).poll.closed_at).not.toBeNull();

  // …and today the professor can start new ones.
  const fresh = await server.startCheck(prof, unique('Today check'));
  await server.endCheck(prof, fresh.id);
  const freshPoll = await server.createPoll(prof, unique('Today poll'), ['A', 'B']);
  await server.closePoll(prof, freshPoll.id);
});
