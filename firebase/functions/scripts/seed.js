import { readFile } from 'node:fs/promises';
import { context } from './admin-context.js';
const {db, projectId, apply} = context();
const data = JSON.parse(await readFile(new URL('../data/reference.json', import.meta.url), 'utf8'));
if (!apply) {
  console.log(`Dry run: reference data for ${projectId}. Add --apply to create missing reference documents. Existing values are never overwritten.`);
} else {
  let created = 0;
  for (const [collection, records] of Object.entries(data)) {
    for (const record of records) {
      try { await db.collection(collection).doc(String(record.id)).create(record); created++; }
      catch (error) { if (error.code !== 6) throw error; }
    }
  }
  console.log(`Created ${created} reference documents. Existing data preserved.`);
}
await db.terminate();
