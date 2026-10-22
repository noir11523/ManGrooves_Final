import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {databaseFixture} from './database-fixture.js';
import {Service} from '../functions/api/core/service.js';
import {deleteUser} from '../functions/api/core/delete-user.js';
import {Auth} from '../functions/api/auth.js';

test('Auth deletion removes the application profile and directory entry, preserving reports and revision checks',async()=>{
  const {pg,db,client}=await databaseFixture();
  try{
    const uid=randomUUID(),id=2;
    await pg.query('insert into auth.users(id,email) values ($1,$2)',[uid,'person@example.test']);
    await db.collection('users').doc(uid).set({id,uid,role:'guardian',status:'active'});
    await db.collection('expert_applications').doc(uid).set({uid,status:'rejected'});
    await db.collection('reports').doc(19).set({id:19,user_id:id,uid,status:'verified',guardian_name:'Recorded author'});
    const auth=new Auth(client);
    assert.deepEqual(await auth.existingUserIds([uid,randomUUID()]),[uid]);
    const before=await db.collection('users').doc(uid).get();
    const beforeRevision=(await pg.query("select revision from public.app_collections where name='users'")).rows[0].revision;
    await pg.query('delete from auth.users where id=$1',[uid]);
    assert.equal((await db.collection('users').doc(uid).get()).exists,false);
    assert.equal((await db.collection('expert_applications').doc(uid).get()).exists,false);
    assert.equal((await db.collection('reports').doc(19).get()).data().guardian_name,'Recorded author');
    assert.deepEqual(await auth.existingUserIds([uid]),[]);
    assert.ok(before.exists);
    const afterRevision=(await pg.query("select revision from public.app_collections where name='users'")).rows[0].revision;
    assert.ok(Number(afterRevision)>Number(beforeRevision),'Deletion must invalidate stale Users queries');
    // An old orphan profile is excluded without silently purging any user data.
    await db.collection('users').doc(uid).set({id,uid,status:'active'});
    assert.deepEqual(await auth.existingUserIds([uid]),[]);
    const grants=await pg.query("select has_function_privilege('anon','public.app_existing_auth_users(jsonb)','execute') as anon,has_function_privilege('authenticated','public.app_existing_auth_users(jsonb)','execute') as authenticated");
    assert.deepEqual(grants.rows[0],{anon:false,authenticated:false});
  }finally{await pg.close();}
});

test('administrator deletion checks identity, blocks self deletion, restores on Auth failure and keeps reports',async()=>{
  const {pg,db}=await databaseFixture();
  const admin={id:1,uid:randomUUID(),role:'system_admin',status:'active',full_name:'Administrator'};
  const target={id:2,uid:randomUUID(),role:'expert',status:'inactive',email:'person@example.test'};
  let fail=true,calls=0;
  const service=new Service(db,{async deleteUser(uid){calls++;assert.equal(uid,target.uid);if(fail)throw Error('offline');}},{});
  try{
    for(const u of [admin,target])await service.ref('users',u.uid).set(u);
    await service.ref('reports',9).set({id:9,user_id:2,status:'verified'});
    await service.ref('expert_applications',target.uid).set({uid:target.uid,status:'approved'});
    await assert.rejects(deleteUser(service,{...admin,role:'guardian'},{id:2}),/permission|access/i);
    await assert.rejects(deleteUser(service,admin,{id:1}),/own account/);
    await assert.rejects(deleteUser(service,admin,{id:2,confirm_email:'wrong@example.test'}),/Confirm/);
    assert.equal(calls,0);
    const input={id:2,confirm_email:target.email};
    await assert.rejects(deleteUser(service,admin,input),/Refresh the Users list/);
    assert.equal((await service.get('users',target.uid)).status,'inactive');
    fail=false;
    assert.match((await deleteUser(service,admin,input)).message,/User deleted/);
    assert.equal(await service.get('users',target.uid),null);
    assert.equal(await service.get('expert_applications',target.uid),null);
    assert.equal((await service.get('reports',9)).status,'verified');
    assert.ok((await service.rows('audit_logs')).some(a=>a.action==='admin.user_deleted'));
    await assert.rejects(deleteUser(service,admin,input),/not found/);
  }finally{await pg.close();}
});
