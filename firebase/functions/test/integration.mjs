// Real Auth, Firestore, and Storage emulator checks. Never run against production.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import sharp from 'sharp';
import { createApi } from '../src/api.js';
const projectId = 'demo-mangrooves';
if (!process.env.FIRESTORE_EMULATOR_HOST || !process.env.FIREBASE_AUTH_EMULATOR_HOST || !process.env.FIREBASE_STORAGE_EMULATOR_HOST) throw new Error('Run via npm run test:emulators. Production access is forbidden.');
initializeApp({projectId, storageBucket: JSON.parse(process.env.FIREBASE_CONFIG ?? '{}').storageBucket ?? `${projectId}.appspot.com`});
const db = getFirestore(), auth = getAuth(), bucket = getStorage().bucket();
await fetch(`http://${process.env.FIRESTORE_EMULATOR_HOST}/emulator/v1/projects/${projectId}/databases/(default)/documents`, {method: 'DELETE'});
await fetch(`http://${process.env.FIREBASE_AUTH_EMULATOR_HOST}/emulator/v1/projects/${projectId}/accounts`, {method: 'DELETE'});
const reference = JSON.parse(await readFile(new URL('../data/reference.json', import.meta.url), 'utf8'));
for (const [collection, items] of Object.entries(reference)) for (const item of items) await db.collection(collection).doc(String(item.id)).set(item);
const server = createApi({db, auth, bucket, projectId}).listen(0, '127.0.0.1');
await new Promise(resolve => server.once('listening', resolve));
const base = process.env.MANGROOVES_TEST_API_BASE ?? (process.argv.includes('--hosting') ? 'http://127.0.0.1:5002/mobile-api' : `http://127.0.0.1:${server.address().port}/mobile-api`);
if (!/^http:\/\/127\.0\.0\.1:\d+\/mobile-api$/.test(base)) throw new Error('Tests may only target the local emulator API.');
let checks = 0;
const pass = message => { checks++; console.log(`PASS ${message}`); };
async function signIn(email, password = 'testpassword1') {
  const r = await fetch(`http://${process.env.FIREBASE_AUTH_EMULATOR_HOST}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=demo-api-key`, {
    method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({email, password, returnSecureToken: true})});
  const data = await r.json(); assert.equal(r.status, 200, JSON.stringify(data)); return data;
}
async function account(id, role) {
  const email = `${role}${id}@example.test`, record = await auth.createUser({uid: `test-${id}`, email, password: 'testpassword1'});
  const user = {id, uid: record.uid, email, first_name: 'Test', last_name: role, full_name: `Test ${role}`, role, status: 'active', barangay_id: 1, barangay_name: 'Inayawan', phone: null};
  await db.collection('users').doc(record.uid).set(user);
  return {...user, token: (await signIn(email)).idToken};
}
async function request(route, user, body, expected = 200, binary = false) {
  const response = await fetch(`${base}/${route}`, {method: body ? 'POST' : 'GET', headers: {
    ...(user ? {Authorization: `Bearer ${user.token}`} : {}), ...(body && !(body instanceof FormData) ? {'Content-Type': 'application/json'} : {})},
    body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined});
  if (binary && response.ok) { assert.equal(response.status, expected); return Buffer.from(await response.arrayBuffer()); }
  const json = await response.json(); assert.equal(response.status, expected, `${route}: ${JSON.stringify(json)}`); return json;
}
const select = (code, option) => reference.criteria.find(c => c.code === code).options.find(o => o.code === option).id;
const healthy = {leaf_color: [1], leaf_condition: [4], pests: [8], roots: [11], bark_trunk: [15], bio_indicators: [], negative_signs: []};
let color = 10;
async function submission(user, changes = {}, photo) {
  const bytes = photo ?? await sharp({create: {width: 128, height: 128, channels: 3, background: {r: ++color, g: 140, b: 70}}}).jpeg().toBuffer();
  const fields = {latitude: 10.2833, longitude: 123.8833, location_source: 'gps', location_accuracy: 10, sitio_name: 'Test shoreline',
    observed_alive_count: 10, root_type: reference.species[0].root_type, leaf_shape: reference.species[0].leaf_shape, bark_texture: reference.species[0].bark_texture,
    field_confirmation: '1', observations: healthy, checklist_versions: Object.fromEntries(reference.criteria.map(c => [c.id, c.version])), ...changes};
  const body = new FormData(); body.set('payload', JSON.stringify(fields)); body.set('photo', new Blob([bytes], {type: 'image/jpeg'}), 'field.jpg');
  return {body, bytes};
}
try {
  const guardian = await account(1, 'guardian'), other = await account(2, 'guardian'), expert = await account(3, 'expert'), admin = await account(4, 'system_admin');
  const config = await request('configuration.php'); assert.equal(config.backend, 'firebase'); assert.equal(config.barangays.length, 1); pass('public cloud configuration');
  await request('register.php', null, [], 422); pass('malformed form data is rejected');
  await request('me.php', null, null, 401); pass('missing authentication rejected');
  await request('register.php', null, {email: 'new@example.test', password: 'testpassword1', password_confirmation: 'testpassword1', first_name: 'New', last_name: 'Guardian', barangay_id: 1, privacy_consent: true, role: 'system_admin'}, 201);
  const registered = await signIn('new@example.test'), me = await request('me.php', {token: registered.idToken}); assert.equal(me.user.role, 'guardian'); pass('registration ignores attempted administrator role');
  await request('profile.php', guardian, {first_name: 'Test', last_name: 'Guardian', email: 'changed@example.test', barangay_id: 1}, 422); pass('email is immutable');
  for (const route of ['checklist.php', 'verification.php', 'validation-history.php', 'users.php', 'audit.php', 'export-analytics.php']) await request(route, guardian, null, 403);
  pass('guardian cannot access staff/admin endpoints');
  const privateRead = await fetch(`http://${process.env.FIRESTORE_EMULATOR_HOST}/v1/projects/${projectId}/databases/(default)/documents/users/test-1`, {headers: {Authorization: `Bearer ${guardian.token}`}});
  assert.equal(privateRead.status, 403); pass('Firestore rules block direct client document reads');
  const form = await request('report-form.php', guardian); assert.equal(form.criteria.length, 7); pass('reference forms are available');
  const preview = await request('report-preview.php', guardian, {observations: healthy, ...reference.species[0], checklist_versions: Object.fromEntries(reference.criteria.map(c => [c.id, c.version]))}); assert.equal(preview.classification.status, 'Healthy'); pass('cloud score preview');
  await request('report-preview.php', guardian, {observations: healthy, checklist_versions: {}}, 409); pass('preview cannot score unseen checklist changes');
  const stale = await submission(guardian, {checklist_versions: {}}); await request('submit-report.php', guardian, stale.body, 409); pass('stale checklist submission rejected');
  const invalidGps = await submission(guardian, {location_accuracy: 180}); await request('submit-report.php', guardian, invalidGps.body, 422); pass('approximate GPS cannot silently become a precise report pin');
  const first = await submission(guardian), saved = await request('submit-report.php', guardian, first.body, 201), firstId = saved.report.report_id;
  assert.equal(saved.report.status, 'verified'); assert.ok(saved.report.cluster_id); pass('healthy report auto-verifies and creates a cluster');
  const repeat = await submission(guardian, {}, first.bytes), repeated = await request('submit-report.php', guardian, repeat.body, 201);
  assert.equal(repeated.report.report_id, firstId); pass('retry does not create a duplicate report');
  const conflicting = await submission(guardian, {observed_alive_count: 9}, first.bytes); await request('submit-report.php', guardian, conflicting.body, 409); pass('reused photo with different report data rejected');
  const image = await request(`photo.php?id=${firstId}`, guardian, null, 200, true); assert.equal(image[0], 255); pass('authorized private photo download');
  await request(`report.php?id=${firstId}`, other, null, 404); await request(`photo.php?id=${firstId}`, other, null, 404); pass('cross-account private report and photo access denied');
  const storageRead = await fetch(`http://${process.env.FIREBASE_STORAGE_EMULATOR_HOST}/v0/b/${bucket.name}/o/${encodeURIComponent((await db.collection('reports').doc(String(firstId)).get()).data().photo_path)}?alt=media`, {headers: {Authorization: `Firebase ${guardian.token}`}});
  assert.ok([401, 403].includes(storageRead.status)); pass('Storage rules block direct private photo access');
  const community = await request(`cluster.php?id=${saved.report.cluster_id}`, other); assert.equal(community.timeline[0].can_view_details, false); assert.equal(community.timeline[0].photo_url, null); pass('community timeline omits another guardian’s private photo');
  const personal = await request('analytics.php?date_from=2026-01-01&date_to=2100-01-01', other); assert.equal(personal.analytics.verification.total, 0); pass('guardian analytics is scoped to the signed-in account');
  const uncertain = await submission(guardian, {observations: {...healthy, leaf_color: [select('leaf_color', 'unknown')]}});
  const pending = await request('submit-report.php', guardian, uncertain.body, 201); assert.equal(pending.report.status, 'pending'); pass('Not Sure requires expert review');
  const notifications = await request('notifications.php', expert); assert.ok(notifications.notifications.some(n => n.report_id === pending.report.report_id)); pass('expert receives pending report notifications');
  await request('review.php', expert, {report_id: pending.report.report_id, action: 'confirm'}, 422); pass('unknown health cannot be confirmed without correction');
  await request('review.php', expert, {report_id: pending.report.report_id, action: 'correct', final_health: 'Stressed', final_species_id: 1, rarity_level: 'Common', expert_feedback: 'Check leaves at the next visit.'}); pass('expert corrects and verifies health/species');
  await request('review.php', admin, {report_id: pending.report.report_id, action: 'confirm'}, 409); pass('review conflict cannot overwrite a completed review');
  const detail = await request(`report.php?id=${pending.report.report_id}`, guardian); assert.equal(detail.report.verification_history.length, 1); assert.equal(detail.report.final_species_id, 1); pass('validation history and final values persist');
  const pdf = await request('export-analytics.php', admin, null, 200, true); assert.equal(pdf.subarray(0, 4).toString(), '%PDF'); pass('administrator PDF export');
  const badges = await request('badges.php', guardian); assert.equal(badges.badges[0].earned, true); const certificate = await request('certificate.php?badge_id=1', guardian, null, 200, true); assert.equal(certificate.subarray(0, 4).toString(), '%PDF'); pass('earned badge and certificate');
  const follow = await submission(guardian, {cluster_id: saved.report.cluster_id, parent_report_id: firstId}); const following = await request('submit-report.php', guardian, follow.body, 201); assert.equal(following.report.cluster_id, saved.report.cluster_id); pass('follow-up preserves the original cluster');
  const unavailable = await submission(guardian, {cluster_id: saved.report.cluster_id, parent_report_id: firstId}); await request('submit-report.php', guardian, unavailable.body, 422); pass('duplicate active follow-up rejected');
  const criterion = structuredClone(form.criteria[0]); criterion.name = 'Leaf colors'; criterion.options.push({id: -1, kind: 'standard', label: 'Mixed green', points: 1});
  const savedChecklist = await request('checklist.php', admin, criterion); const fresh = savedChecklist.criteria.find(c => c.id === criterion.id); assert.ok(fresh.options.some(o => o.label === 'Mixed green')); pass('administrator can add and rename choices');
  await request('checklist.php', admin, criterion, 409); pass('concurrent checklist edit rejected');
  const photoEdit = new FormData(); photoEdit.set('payload', JSON.stringify(fresh)); photoEdit.set('guide_image', new Blob([first.bytes], {type: 'image/jpeg'}), 'guide.jpg');
  const withPhoto = await request('checklist.php', admin, photoEdit);
  const imagePath = withPhoto.criteria.find(c => c.id === criterion.id).guide_image;
  assert.ok(imagePath.startsWith('../mobile-api/checklist-photo.php?path='));
  const guide = await request(imagePath.replace('../mobile-api/', ''), null, null, 200, true); assert.equal(guide[0], 255); pass('checklist photo upload and display');
  const snapshot = await request(`report.php?id=${firstId}`, guardian); assert.equal(snapshot.report.observations[0].name, 'Leaf Color'); pass('past reports preserve original checklist snapshots');
  const audit = await request('audit.php', admin); assert.ok(audit.items.some(e => e.action === 'admin.checklist_updated')); pass('administrator audit log');
  await request('users.php', admin, {id: other.id, role: 'guardian', status: 'inactive'});
  await request('me.php', other, null, 401);
  assert.equal((await auth.getUser(other.uid)).disabled, true); pass('inactive account loses both sign-in and API access');
  await request('users.php', admin, {id: other.id, role: 'guardian', status: 'active'});
  assert.equal((await auth.getUser(other.uid)).disabled, false);
  const restored = await request('me.php', {...other, token: (await signIn(other.email)).idToken}); assert.equal(restored.user.id, other.id); pass('administrator can restore an inactive or imported disabled account');
  const newSession = await signIn(guardian.email);
  await request('account-security.php', {...guardian, token: newSession.idToken}, {action: 'password', new_password: 'newpassword12', new_password_confirmation: 'newpassword12'});
  await signIn(guardian.email, 'newpassword12'); pass('Firebase password change');
  console.log(`\n${checks} Firebase integration checks passed.`);
} finally {
  await new Promise(resolve => server.close(resolve)); await db.terminate();
}
