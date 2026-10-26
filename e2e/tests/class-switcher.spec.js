// A professor who teaches several classes can jump between them from the class
// page. Students never see the switcher.
import { test, expect } from '@playwright/test';
import { STUDENTS, CLASS } from './people.js';
import { API_PORT } from '../test-db.js';
import { signInProfessor, signInStudent, openClass, unique, fixtures, professorToken } from './helpers.js';

const API = `http://localhost:${API_PORT}`;

test('a professor switches between their classes from the class page', async ({ page }) => {
  const { classId } = fixtures();
  const title = unique('OTHER 202');
  const res = await fetch(`${API}/api/classes`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${await professorToken()}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, section: 'B' }),
  });
  expect(res.status).toBe(201);
  const other = await res.json();

  await signInProfessor(page);
  await openClass(page);
  const switcher = page.getByLabel('Switch class');
  await expect(switcher).toHaveValue(String(classId));

  // Go to the other class: new URL, its name, and the page starts fresh on today.
  await page.getByRole('button', { name: 'Previous day' }).click();
  await switcher.selectOption({ label: `${title} · B` });
  await page.waitForURL(`**/class/${other.id}`);
  await expect(page.getByTestId('class-name')).toHaveText(`${title} · B`);
  await expect(switcher).toHaveValue(String(other.id));
  await expect(page.getByText('No check running')).toBeVisible();   // today's view, not yesterday's
  await expect(page).toHaveTitle(new RegExp(`^${title} · B`));

  // And back.
  await switcher.selectOption({ label: CLASS.label });
  await page.waitForURL(`**/class/${classId}`);
  await expect(page.getByTestId('class-name')).toHaveText(CLASS.label);

  // Hidden in "View as student".
  await page.getByRole('button', { name: '👁 View as student' }).click();
  await expect(page.getByLabel('Switch class')).toHaveCount(0);
});

test('students do not see the class switcher', async ({ page }) => {
  await signInStudent(page, STUDENTS.alice);
  await openClass(page);
  await expect(page.getByTestId('class-name')).toHaveText(CLASS.label);
  await expect(page.getByLabel('Switch class')).toHaveCount(0);
});
