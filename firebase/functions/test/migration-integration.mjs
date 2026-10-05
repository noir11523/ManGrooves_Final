// Disposable demo data only. Exercises the same importer used for deployment.
import assert from 'node:assert/strict';
import {readFile, writeFile, mkdir, rm} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {resolve, sep} from 'node:path';
import {execFileSync} from 'node:child_process';
import {randomUUID} from 'node:crypto';
import {initializeApp} from 'firebase-admin/app';
import {getAuth} from 'firebase-admin/auth';
import {getFirestore} from 'firebase-admin/firestore';
import {getStorage} from 'firebase-admin/storage';
import sharp from 'sharp';

const projectId = 'demo-mangrooves';
for (const key of ['FIRESTORE_EMULATOR_HOST', 'FIREBASE_AUTH_EMULATOR_HOST', 'FIREBASE_STORAGE_EMULATOR_HOST']) {
  if (!/^127\.0\.0\.1:\d+$/.test(process.env[key] ?? '')) throw new Error('Use loopback demo emulators only.');
}
initializeApp({projectId, storageBucket: `${projectId}.appspot.com`});
const db = getFirestore(), auth = getAuth(), bucket = getStorage().bucket();
await fetch(`http://${process.env.FIRESTORE_EMULATOR_HOST}/emulator/v1/projects/${projectId}/databases/(default)/documents`, {method: 'DELETE'});
await fetch(`http://${process.env.FIREBASE_AUTH_EMULATOR_HOST}/emulator/v1/projects/${projectId}/accounts`, {method: 'DELETE'});
const root = fileURLToPath(new URL('../../../', import.meta.url));
const privateRoot = resolve(root, 'firebase/migration-data'), directory = resolve(privateRoot, `test-${randomUUID()}`);
if (!directory.startsWith(privateRoot + sep)) throw new Error('Invalid test directory.');
await mkdir(directory, {recursive: true});
const reference = JSON.parse(await readFile(new URL('../data/reference.json', import.meta.url)));
const snapshot = {format: 'mangrooves-mysql-v1', source_timezone: 'Asia/Manila', tables: {
  // Public test-only bcrypt fixture for the word "password", never a real user.
  users: [{id: 42, email: 'migration@example.test', full_name: 'Migration Guardian', first_name: 'Migration', last_name: 'Guardian',
    role: 'guardian', status: 'active', barangay_id: 1, password_hash: '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2uheWG/igi.'}],
  barangays: reference.barangays, mangrove_species: reference.species,
  health_criteria: reference.criteria.map(({options, version, ...c}) => c),
  health_options: reference.criteria.flatMap(c => c.options.map(o => ({...o, criteria_id: c.id}))),
  mangrove_clusters: [{id: 70, barangay_id: 1, name: 'Imported site', initial_seedlings: 10, verified_count: 1, latest_health: 'Healthy'}],
  reports: [{id: 85, user_id: 42, barangay_id: 1, cluster_id: 70, status: 'verified', report_code: 'MGR-LEGACY-85',
    suggested_health: 'Healthy', final_health: 'Healthy', submitted_at: '2026-10-02 08:00:00',
    photo_path: `firebase/migration-data/${directory.split(sep).at(-1)}/photo.jpg`}],
  report_observations: [], verification_logs: [], badges: reference.badges, user_badges: [], notifications: [], audit_logs: []
}};
await writeFile(resolve(directory, 'photo.jpg'), await sharp({create: {width: 128, height: 128, channels: 3, background: '#458042'}}).jpeg().toBuffer());
const file = resolve(directory, 'snapshot.json'); await writeFile(file, JSON.stringify(snapshot));
const importer = fileURLToPath(new URL('../scripts/import-mysql.js', import.meta.url));
const args = [importer, '--file', file, '--project', projectId, '--bucket', bucket.name];
try {
  const preflight = execFileSync(process.execPath, [...args, '--validate-only'], {encoding: 'utf8'});
  assert.match(preflight, /Local validation passed/); assert.equal((await auth.listUsers()).users.length, 0);
  console.log('PASS migration preflight does not create accounts');
  const output = execFileSync(process.execPath, args, {encoding: 'utf8'});
  assert.match(output, /Import complete/);
  assert.equal((await auth.getUser('legacy-42')).email, 'migration@example.test');
  const report = (await db.collection('reports').doc('85').get()).data();
  assert.equal(report.submitted_at, '2026-10-02T00:00:00.000Z');
  assert.equal(report.uid, 'legacy-42'); assert.equal((await bucket.file(report.photo_path).exists())[0], true);
  assert.equal((await db.collection('meta').doc('migration').get()).data().status, 'complete');
  assert.equal((await db.collection('users').doc('legacy-42').get()).data().password_hash, undefined);
  console.log('PASS migration imports accounts, data and private photos with stable IDs');
  const repeat = execFileSync(process.execPath, args, {encoding: 'utf8'});
  assert.match(repeat, /already imported/); assert.equal((await db.collection('reports').count().get()).data().count, 1);
  console.log('PASS a repeated import makes no duplicate records');
} finally {
  await db.terminate();
  // The generated path is checked against this task's private directory above.
  await rm(directory, {recursive: true, force: true});
}
