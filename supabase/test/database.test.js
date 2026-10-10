import test from 'node:test';
import assert from 'node:assert/strict';
import {databaseFixture} from './database-fixture.js';
import {Database} from '../functions/api/database.js';

test('persistent conflicts re-read current revisions and stop after eight attempts',async()=>{
 let reads=0;const revisions=[];
 const db=new Database({async rpc(name,args){
   if(name==='app_read')return {data:{documents:[{document_id:'counter',data:{n:++reads},revision:reads}]}};
   revisions.push(args.p_expected[0].revision);
   return {error:{code:'PT409',message:'Concurrent change; retry'}};
 }});
 await assert.rejects(db.runTransaction(async tx=>{
   const ref=db.collection('meta').doc('counter'),snap=await tx.get(ref);
   tx.update(ref,{n:snap.data().n+1});
 }),e=>e.code==='PT409');
 assert.deepEqual(revisions,[1,2,3,4,5,6,7,8]);
});

test('ordinary database failures are returned without retrying',async()=>{
 let calls=0;const db=new Database({async rpc(){calls++;return {error:{code:'42501',message:'permission denied'}};}});
 await assert.rejects(db.runTransaction(tx=>tx.set(db.collection('meta').doc('counter'),{n:1})),e=>e.code==='42501');
 assert.equal(calls,1);
});
test('PostgreSQL migrations, atomic writes, conflicts, pagination and permissions',async()=>{
 const {pg,db}=await databaseFixture();
 try {
  const ref=db.collection('meta').doc('counter'); await ref.set({n:0});
  await Promise.all(Array.from({length:6},()=>db.runTransaction(async tx=>{
    const snap=await tx.get(ref); tx.update(ref,{n:snap.data().n+1});
  })));
  assert.equal((await ref.get()).data().n,6,'no lost updates');
  const tx=db.batch(); await tx.get(ref); tx.set(ref,{n:99});
  await ref.update({n:7}); await assert.rejects(tx.commit(),e=>e.code==='PT409');
  assert.equal((await ref.get()).data().n,7,'conflict does not overwrite');
  const queryTx=db.batch(); await queryTx.get(db.collection('reports').where('user_id','==',1));
  await db.collection('reports').doc('1').set({id:1,user_id:1});
  queryTx.set(ref,{n:99}); await assert.rejects(queryTx.commit(),e=>e.code==='PT409');
  const duplicate=db.batch();duplicate.create(ref,{n:100});
  await assert.rejects(duplicate.commit(),e=>e.code==='PT409');
  assert.equal((await ref.get()).data().n,7,'duplicate creates do not overwrite');
  const bad=db.batch(); bad.set(ref,{n:100});bad.update(db.collection('reports').doc('missing'),{id:2});
  await assert.rejects(bad.commit()); assert.equal((await ref.get()).data().n,7,'all writes roll back');
  const docs=await db.collection('reports').where('user_id','==',1).limit(1).get();assert.equal(docs.size,1);
  assert.equal((await db.collection('reports').startAfter(docs.docs[0]).get()).size,0);
  for(const role of ['anon','authenticated']) {
    await pg.exec(`set role ${role}`);
    await assert.rejects(pg.query('select * from public.app_documents'),/permission denied/);
    await assert.rejects(pg.query("select public.app_read('users')"),/permission denied/);
    await assert.rejects(pg.query("select public.app_commit('[]','[]')"),/permission denied/);
    await assert.rejects(pg.query("select public.app_revoke_sessions('00000000-0000-0000-0000-000000000001')"),/permission denied/);
    await pg.exec('reset role');
  }
  const uid='00000000-0000-0000-0000-000000000001',session='00000000-0000-0000-0000-000000000002';
  await pg.query('insert into auth.users values($1,$2)',[uid,'test@example.test']);
  await pg.query('insert into auth.sessions values($1,$2)',[session,uid]);
  await db.collection('users').doc(uid).set({id:1,email:'test@example.test'});
  await assert.rejects(pg.query('update auth.users set email=$1 where id=$2',['changed@example.test',uid]),/email cannot be changed/);
  assert.equal(await db.rpc('app_session_valid',{p_session:session,p_user:uid}),true);
  await db.rpc('app_revoke_sessions',{p_user:uid});
  assert.equal(await db.rpc('app_session_valid',{p_session:session,p_user:uid}),false);
 } finally { await pg.close(); }
});
