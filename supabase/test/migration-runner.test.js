import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,unlink,rmdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {databaseFixture} from './database-fixture.js';
import {snapshot} from './migration-fixture.js';
import {prepareImport,applyImport} from '../scripts/migration-runner.js';

const workspace=fileURLToPath(new URL('../../',import.meta.url));
async function sourceFile(t,change=()=>{}) {
 const folder=await mkdtemp(join(tmpdir(),'mangrooves-import-test-')),file=join(folder,'snapshot.json');
 const value=snapshot();value.tables.reports[0].photo_path='supabase/test/fixtures/photo.jpg';change(value);
 await writeFile(file,JSON.stringify(value));
 t.after(async()=>{await unlink(file);await rmdir(folder);});
 return file;
}
function providers(db) {
 const users=new Map(),photos=new Map();let uploads=0;
 return {db,users,photos,get uploads(){return uploads;},auth:{
   async listUsers(){return {users:[...users.values()]};},
   async importUsers(list){for(const user of list)if(!users.has(user.uid))users.set(user.uid,{...user});return {failureCount:0};}
 },bucket:{file:path=>({async save(bytes){uploads++;photos.set(path,bytes);},async delete(){photos.delete(path);}})}};
}
test('interrupted import resumes accounts/photos, preserves IDs, and completed reruns do nothing',async t=>{
 const {pg,db}=await databaseFixture();t.after(()=>pg.close());
 const prepared=await prepareImport(await sourceFile(t),workspace),target=providers(db);
 const original=db.rpc.bind(db);let failOnce=true;
 db.rpc=async(name,args)=>{
   if(name==='app_commit'&&args.p_writes.some(w=>w.collection==='reports')&&failOnce) {failOnce=false;throw new Error('Simulated connection interruption');}
   return original(name,args);
 };
 await assert.rejects(applyImport(prepared,target),/interruption/);
 assert.equal((await db.collection('meta').doc('migration').get()).data().status,'running');
 assert.equal(target.users.size,1);assert.equal(target.uploads,1);
 const result=await applyImport(prepared,target);
 assert.equal(result.reports,2);assert.equal(target.users.size,1);assert.equal(target.uploads,1,'resume reuses completed photo upload');
 const report=(await db.collection('reports').doc(5).get()).data();
 assert.equal(report.report_code,'MGR-5');assert.equal(report.active_child_id,6);
 assert.equal(report.uid,[...target.users.keys()][0]);assert.match(report.photo_path,/^reports\/1\//);
 assert.ok(target.photos.has(report.photo_path));
 assert.equal(prepared.converted.documents.reports[0].photo_path,'supabase/test/fixtures/photo.jpg');
 assert.equal((await db.collection('meta').doc('sequence').get()).data().next,prepared.converted.nextId);
 assert.equal((await db.collection('meta').doc('migration').get()).data().status,'complete');
 assert.deepEqual(await applyImport(prepared,target),{alreadyImported:true});assert.equal(target.uploads,1);
 await assert.rejects(applyImport({...prepared,hash:'different-snapshot'},target),/different migration/);
});
test('migration refuses existing accounts or edited reference data before creating anything',async t=>{
 const {pg,db}=await databaseFixture();t.after(()=>pg.close());
 const prepared=await prepareImport(await sourceFile(t),workspace),target=providers(db);
 await db.collection('criteria').doc(1).set({id:1,name:'Existing custom checklist'});
 await assert.rejects(applyImport(prepared,target),/not empty/);
 assert.equal(target.users.size,0);assert.equal(target.uploads,0);
 assert.equal((await db.collection('meta').doc('migration').get()).exists,false);
 await db.collection('criteria').doc(1).delete();target.users.set('unrelated',{email:'existing@example.test'});
 await assert.rejects(applyImport(prepared,target),/Authentication must be empty/);
 assert.equal(target.users.size,1);assert.equal(target.uploads,0);
});
test('migration preflight rejects missing or non-image photos without accessing providers',async t=>{
 const missing=await sourceFile(t,value=>{value.tables.reports[0].photo_path='supabase/test/fixtures/missing.jpg';});
 await assert.rejects(prepareImport(missing,workspace),/ENOENT/);
 const invalid=await sourceFile(t,value=>{value.tables.reports[0].photo_path='supabase/package.json';});
 await assert.rejects(prepareImport(invalid,workspace),/Use JPG/);
});

test('legacy public asset URLs resolve inside the public directory',async t=>{
 const source=await sourceFile(t,value=>{value.tables.reports[0].photo_path='assets/img/hero-mangroves.png';});
 const prepared=await prepareImport(source,workspace);
 assert.ok(prepared.photos.get('report:assets/img/hero-mangroves.png').endsWith(join('public','assets','img','hero-mangroves.png')));
});
