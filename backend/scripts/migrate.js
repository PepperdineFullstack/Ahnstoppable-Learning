// Apply each file in backend/migrations exactly once, in name order.
// Usage (from backend/):  node scripts/migrate.js
// Applied filenames are recorded in schema_migrations, so re-running is a no-op.
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import pool from '../src/db/pool.js';

const dir = path.resolve(import.meta.dirname, '../migrations');
const files = fs.readdirSync(dir).filter((f) => f.endsWith('.sql')).sort();

await pool.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
  name       TEXT PRIMARY KEY,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
)`);
const { rows } = await pool.query('SELECT name FROM schema_migrations');
const applied = new Set(rows.map((r) => r.name));

let ran = 0;
for (const file of files) {
  if (applied.has(file)) continue;
  process.stdout.write(`applying ${file} … `);
  await pool.query(fs.readFileSync(path.join(dir, file), 'utf8'));
  await pool.query('INSERT INTO schema_migrations (name) VALUES ($1)', [file]);
  console.log('ok');
  ran++;
}
console.log(ran ? `${ran} migration(s) applied` : 'nothing to apply');
await pool.end();
