import {readFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {context,argument} from './admin-context.js';
import {objectExists} from '../functions/api/bucket.js';
import photos from '../functions/api/data/observation-photos.json' with {type:'json'};
import {allowReferenceJpegs} from './reference-photo-storage.js';
const {client,db,auth,projectId,apply}=await context();
const action=process.argv[2];
if(!['seed','promote-admin'].includes(action)) throw new Error('Choose seed or promote-admin.');
if(!apply) { console.log(`Dry run: ${action} in ${projectId}. Add --apply to write changes.`);process.exit(0); }
if(action==='seed') {
  const reference=JSON.parse(await readFile(new URL('../data/reference.json',import.meta.url),'utf8'));
  await allowReferenceJpegs(client);
  let count=0;
  for(const [collection,rows] of Object.entries(reference)) for(const row of rows) {
    await db.runTransaction(async tx=>{const ref=db.collection(collection).doc(row.id);if(!(await tx.get(ref)).exists){tx.create(ref,row);count++;}});
  }
  await db.runTransaction(async tx=>{const ref=db.collection('meta').doc('trait_images');if(!(await tx.get(ref)).exists)tx.create(ref,photos.traits);});
  const paths=new Set([...reference.criteria.map(c=>c.guide_image),...reference.badges.map(b=>b.image_path),...photos.photos.map(p=>p.path)]);
  for(const path of paths) {
    if(!/^img\/(guides|badges|observations)\/[\w-]+\.(png|svg|jpg)$/.test(path)) throw new Error('Unexpected reference asset path.');
    const storage=client.storage.from('mangrooves-reference');
    if(await objectExists(storage,path))continue;
    const bytes=await readFile(new URL(`../../public/assets/${path}`,import.meta.url));
    const {error}=await storage.upload(path,bytes,{contentType:path.endsWith('.svg')?'image/svg+xml':path.endsWith('.jpg')?'image/jpeg':'image/png',upsert:false});if(error)throw error;
  }
  console.log(`Created ${count} reference records and uploaded missing guide artwork. Existing settings preserved.`);
} else {
  const email=argument('email')?.toLowerCase(); if(!email)throw new Error('Pass --email for an existing account.');
  const rows=await db.collection('users').where('email','==',email).get();
  if(rows.size!==1)throw new Error('Register this account first.');
  const record=rows.docs[0],user=record.data();
  await db.runTransaction(async tx=>{await tx.get(record.ref);tx.update(record.ref,{role:'system_admin',status:'active'});
    tx.create(db.collection('audit_logs').doc(randomUUID()),{user_id:user.id,actor_name:'Project operator',action:'admin.bootstrap',entity_type:'user',entity_id:user.id,created_at:new Date().toISOString()});});
  await auth.updateUser(user.uid,{disabled:false});await auth.revokeRefreshTokens(user.uid);
  console.log('Administrator access saved. Sign in again.');
}
