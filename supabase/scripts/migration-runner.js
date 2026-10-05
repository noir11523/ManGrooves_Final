import {readFile,realpath,stat} from 'node:fs/promises';
import {resolve,sep} from 'node:path';
import {createHash} from 'node:crypto';
import {convertSnapshot} from './convert-mysql.js';
import {cleanImage} from '../functions/api/core/images.js';
import {saveImage} from '../functions/api/core/uploads.js';

export async function prepareImport(source, workspace) {
const raw = await readFile(resolve(source)), hash = createHash('sha256').update(raw).digest('hex');
const snapshot = JSON.parse(raw), converted = convertSnapshot(snapshot);
workspace = await realpath(workspace);
const photos = new Map();
async function localPhoto(path, checklist) {
  if (!path) return null;
  // Legacy seeded photos use URL paths relative to the public document root.
  // Uploaded evidence already stores a project-relative storage/ path.
  const base = checklist ? 'public/assets' : /^(assets|uploads)\//.test(path) ? 'public' : '.';
  const candidate = resolve(workspace, base, path);
  const full = await realpath(candidate);
  if (!full.toLowerCase().startsWith((workspace + sep).toLowerCase())) throw new Error('An image path leaves the project directory.');
  const info = await stat(full);
  if (!info.isFile() || info.size > 5 * 1024 * 1024) throw new Error('A migration image is missing or exceeds 5 MB.');
  cleanImage(await readFile(full)); // Reject malformed photos before any cloud writes.
  photos.set(`${checklist ? 'guide:' : 'report:'}${path}`, full);
  return full;
}
// Preflight all referenced files before changing cloud data.
for (const r of converted.documents.reports) await localPhoto(r.photo_path, false);
for (const c of converted.documents.criteria) {
  if (c.guide_image?.includes('checklist/')) await localPhoto(c.guide_image, true);
  for (const o of [...c.options, ...c.archived_options]) if (o.image_path?.includes('checklist/')) await localPhoto(o.image_path, true);
}
  return {hash,converted,photos};
}

export async function applyImport(prepared, {db,auth,bucket}, log=()=>{}) {
  const {hash,photos}=prepared;
  // Repeated calls must not mutate preflight paths or caller-owned snapshots.
  const converted={...prepared.converted,documents:structuredClone(prepared.converted.documents)};
  const migrationRef = db.collection('meta').doc('migration'), existing = (await migrationRef.get()).data();
  if (existing && existing.hash !== hash) throw new Error('A different migration already exists. Use a fresh project or the original snapshot.');
  if (existing?.status === 'complete') return {alreadyImported:true};
  if (!existing) {
    for (const collection of Object.keys(converted.documents)) {
      if (!(await db.collection(collection).limit(1).get()).empty) throw new Error(`Target ${collection} is not empty. Import into a fresh project to avoid overwriting data.`);
    }
    // Prevent a same-email collision from replacing an unrelated Supabase user.
    if ((await auth.listUsers(1)).users.length) throw new Error('Supabase Authentication must be empty for the initial migration.');
    await db.batch().create(migrationRef, {hash, status: 'running', started_at: new Date().toISOString()}).commit();
  }
  for (let start = 0; start < converted.authUsers.length; start += 1000) {
    const result = await auth.importUsers(converted.authUsers.slice(start, start + 1000), {hash: {algorithm: 'BCRYPT'}});
    if (result.failureCount) throw new Error(`Authentication import failed for ${result.failureCount} accounts. Migration stays locked; fix the issue and rerun the same snapshot.`);
  }
  const upload = async (path, checklist, owner = '') => {
    const key = `${checklist ? 'guide:' : 'report:'}${path}`, full = photos.get(key);
    if (!full) return path;
    const pointer = db.collection('migration_files').doc(createHash('sha256').update(key).digest('hex'));
    const prior = (await pointer.get()).data(); if (prior) return prior.path;
    const stored = await saveImage(bucket, await readFile(full), checklist ? 'checklist' : `reports/${owner}`);
    await pointer.set({path: stored.path, source_hash: stored.sha256});
    return stored.path;
  };
  for (const r of converted.documents.reports) r.photo_path = await upload(r.photo_path, false, r.user_id);
  for (const c of converted.documents.criteria) {
    if (c.guide_image?.includes('checklist/')) c.guide_image = `../mobile-api/checklist-photo.php?path=${encodeURIComponent(await upload(c.guide_image, true))}`;
    for (const o of [...c.options, ...c.archived_options]) if (o.image_path?.includes('checklist/')) o.image_path = `../mobile-api/checklist-photo.php?path=${encodeURIComponent(await upload(o.image_path, true))}`;
  }
  for (const [collection, records] of Object.entries(converted.documents)) {
    for (let start = 0; start < records.length; start += 400) {
      const batch = db.batch();
      for (const row of records.slice(start, start + 400)) batch.set(db.collection(collection).doc(String(collection === 'users' ? row.uid : row.id)), {...row, migration_hash: hash});
      await batch.commit();
    }
    let count = 0, cursor;
    do { const part = await (cursor ? db.collection(collection).startAfter(cursor) : db.collection(collection)).limit(500).get(); count += part.size; cursor = part.size === 500 ? part.docs.at(-1) : null; } while (cursor);
    if (count !== records.length) throw new Error(`Count mismatch in ${collection}. Migration stays locked; investigate before resuming.`);
    log(`${collection}: ${count} verified`);
  }
  const batch = db.batch(); batch.set(db.collection('meta').doc('sequence'), {next: converted.nextId});
  batch.update(migrationRef, {status: 'complete', completed_at: new Date().toISOString()}); await batch.commit();
  return {alreadyImported:false,accounts:converted.authUsers.length,reports:converted.documents.reports.length};

}
