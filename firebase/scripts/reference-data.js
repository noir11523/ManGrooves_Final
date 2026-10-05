// Convert only the checked-in reference VALUES blocks. Never imports demo users.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
const sql = await readFile(new URL('../../database/reference.sql', import.meta.url), 'utf8');
function rows(table) {
  const block = sql.match(new RegExp(`INSERT INTO ${table}\\s*\\(([^)]+)\\)\\s*VALUES([\\s\\S]*?)ON DUPLICATE KEY`));
  if (!block) throw new Error(`Reference block missing: ${table}`);
  const keys = block[1].split(',').map(k => k.trim()), result = [];
  for (const tuple of block[2].matchAll(/\(((?:'[^']*(?:''[^']*)*'|[^'()])*)\)/g)) {
    const values = [...tuple[1].matchAll(/'((?:[^']|'')*)'|(-?\d+(?:\.\d+)?)|\bNULL\b/g)].map(m => m[1] !== undefined ? m[1].replaceAll("''", "'") : m[2] ? Number(m[2]) : null);
    if (values.length !== keys.length) throw new Error(`Invalid reference tuple: ${table}`);
    result.push(Object.fromEntries(keys.map((k, i) => [k, values[i]])));
  }
  return result;
}
const options = rows('health_options');
let next = Math.max(...options.map(o => o.id));
const criteria = rows('health_criteria').map(c => ({...c, active: 1, version: 'reference-v1', options: [
  ...options.filter(o => o.criteria_id === c.id).map(o => ({...o, image_path: null})),
  ...(c.selection_mode === 'multiple' ? [{id: ++next, code: 'none_of_the_above', label: 'None of the above', points: 0, display_order: 1000, image_path: null}] : []),
  {id: ++next, code: 'all_of_the_above', label: 'All of the above', points: 0, display_order: 1001, image_path: null},
  {id: ++next, code: 'unknown', label: 'Not Sure', points: 0, display_order: 1002, image_path: null}
]}));
const data = {barangays: rows('barangays'), species: rows('mangrove_species').map(s => ({...s, active: 1})), criteria,
  badges: rows('badges').map(b => ({...b, active: 1}))};
await mkdir(new URL('../functions/data/', import.meta.url), {recursive: true});
await writeFile(new URL('../functions/data/reference.json', import.meta.url), JSON.stringify(data, null, 2) + '\n');
console.log(`Reference data: ${data.barangays.length} barangay, ${data.species.length} species, ${criteria.length} criteria. No accounts or reports.`);
