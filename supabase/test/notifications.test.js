import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {databaseFixture} from './database-fixture.js';
import {Service} from '../functions/api/core/service.js';
import {completeRegistration,expertApplications} from '../functions/api/core/registration.js';
import {userNotifications,notificationSummary} from '../functions/api/core/notifications.js';
import {createApi} from '../functions/api/core/api.js';

test('notification events, recipient isolation, catch-up and cross-device read state',async t=>{
  const {db,pg}=await databaseFixture();
  const auth={async updateUser(){},async revokeRefreshTokens(){},async verifyIdToken(token){return {uid:token,email:token+'@example.test',email_verified:true};}};
  const bucket={file:()=>({async save(){},async delete(){}})};
  const service=new Service(db,auth,bucket);
  const users={};let id=1;
  for(const [uid,role,status] of [['admin','system_admin','active'],['second-admin','system_admin','active'],['suspended-admin','system_admin','inactive'],['guardian','guardian','active'],['other-guardian','guardian','active'],['expert','expert','active']]){
    users[uid]={id:id++,uid,role,status,full_name:uid,email:uid+'@example.test',barangay_id:1};await service.ref('users',uid).set(users[uid]);
  }
  const admin=users.admin,expert=users.expert,guardian=users.guardian;
  await service.ref('barangays',1).set({id:1,name:'Inayawan',province:'Cebu',city_municipality:'Cebu City'});
  const server=createApi({db,auth,bucket,projectId:'local-notification-test'}).listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));
  const base=`http://127.0.0.1:${server.address().port}/api/`;
  const request=async(user,body,query='')=>{
    const r=await fetch(base+'notifications.php'+query,{method:body?'POST':'GET',headers:{Authorization:'Bearer '+user.uid,...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined});return {status:r.status,data:await r.json()};
  };
  try{
    let applicant;
    await t.test('expert signup immediately notifies every active administrator, and no other role',async()=>{
      const result=await completeRegistration(service,{first_name:'New',last_name:'Expert',email:'new-expert@example.test',password:'testpassword1',password_confirmation:'testpassword1',privacy_consent:true,role:'expert',phone:'09171234567',barangay_id:1,address_line:'Test Street'},
        {id_photo:await readFile(new URL('fixtures/photo.jpg',import.meta.url))},{uid:'applicant',email:'new-expert@example.test',email_verified:true});
      assert.equal(result.pending_approval,true);applicant=await service.get('users','applicant');
      const events=await service.rows('notifications');assert.equal(events.length,2);
      assert.deepEqual(events.map(n=>n.user_id).sort(),[admin.id,users['second-admin'].id].sort());
      assert.ok(events.every(n=>n.application_uid==='applicant'&&n.type==='expert_application'));
      assert.equal((await service.rows('expert_applications'))[0].status,'pending');
    });
    await t.test('two devices and simultaneous refreshes cannot duplicate the application alert',async()=>{
      await Promise.all([userNotifications(service,admin),userNotifications(service,admin)]);
      const {data,status}=await request(admin,null,'?summary_only=1');assert.equal(status,200);assert.equal(data.unread,1);assert.equal(data.notifications,undefined);
      const notice=(await request(admin)).data.notifications[0];assert.deepEqual(notice.target,{page:'expert-applications',uid:'applicant'});
      assert.equal((await request(guardian,{action:'mark_read',id:notice.id})).status,404);
      await request(admin,{action:'mark_read',id:notice.id});
      assert.equal((await request(admin,null,'?summary_only=1')).data.unread,0);
      assert.equal((await request(users['second-admin'],null,'?summary_only=1')).data.unread,1);
      await request(admin);assert.equal((await service.rows('notifications',[['user_id','==',admin.id]])).length,1);
    });
    await t.test('missed pending applications are recovered and closed alerts stop counting as unread',async()=>{
      await service.ref('users','missed').set({...applicant,id:80,uid:'missed'});
      await service.ref('expert_applications','missed').set({uid:'missed',user_id:80,status:'pending',full_name:'Earlier Applicant',created_at:'2026-01-01T00:00:00Z'});
      const events=await userNotifications(service,admin);assert.equal(events.filter(n=>n.application_uid==='missed').length,1);
      await service.ref('expert_applications','missed').update({status:'rejected'});
      const result=await userNotifications(service,admin);assert.ok(result.find(n=>n.application_uid==='missed').read_at);
      assert.equal(result.find(n=>n.application_uid==='missed').target.uid,'missed');
    });
    await t.test('approval notifies the applicant and resolves every administrator task',async()=>{
      await expertApplications(service,admin,{uid:'applicant',action:'approve',note:'Credentials checked.'});
      const profile=await service.get('users','applicant');assert.equal(profile.status,'active');
      const events=await userNotifications(service,profile);assert.ok(events.some(n=>n.type==='expert_application_decision'&&n.title==='Expert application approved'));
      assert.equal(notificationSummary(await userNotifications(service,users['second-admin'])).unread,0);
    });
    const pending={id:101,uid:guardian.uid,user_id:guardian.id,status:'pending',report_code:'Report #1',submitted_at:'2026-01-02T00:00:00Z',barangay_id:1,cluster_id:201,sitio_name:'Test site'};
    await service.ref('reports',101).set(pending);
    await service.ref('reports',102).set({...pending,id:102,uid:expert.uid,user_id:expert.id});
    await t.test('staff alerts exclude their own reports; guardians never receive another account’s report',async()=>{
      const expertNotices=await userNotifications(service,expert);assert.ok(expertNotices.some(n=>n.report_id===101&&n.target.review));assert.ok(!expertNotices.some(n=>n.report_id===102));
      assert.deepEqual(await userNotifications(service,guardian),[]);
      await service.ref('reports',101).update({status:'verified',needs_follow_up:true,active_child_id:null,expert_feedback:'Check the roots.'});
      assert.ok((await userNotifications(service,expert)).find(n=>n.report_id===101).read_at);
      const ownerNotices=await userNotifications(service,guardian);assert.equal(ownerNotices.filter(n=>n.type==='followup_requested').length,1);
    });
    await t.test('feedback changes notify once, repeated saves do not; new requests can notify again',async()=>{
      await service.updateFollowUp(expert,{report_id:101,needs_follow_up:true,expert_feedback:'Please check the leaves.'});
      let notices=await userNotifications(service,guardian);assert.equal(notices.filter(n=>n.type==='feedback_updated').length,1);
      await service.updateFollowUp(expert,{report_id:101,needs_follow_up:true,expert_feedback:'Please check the leaves.'});
      assert.equal((await userNotifications(service,guardian)).filter(n=>n.type==='feedback_updated').length,1);
      await service.updateFollowUp(expert,{report_id:101,needs_follow_up:false,expert_feedback:'Please check the leaves.'});
      assert.ok((await userNotifications(service,guardian)).filter(n=>n.type==='followup_requested').every(n=>n.read_at));
      await service.ref('notifications',333).set({id:333,user_id:guardian.id,type:'followup_due',report_id:101,title:'Earlier follow-up',created_at:'2025-01-01T00:00:00Z',read_at:null});
      await service.updateFollowUp(expert,{report_id:101,needs_follow_up:true,expert_feedback:'Another visit is needed.'});
      notices=await userNotifications(service,guardian);assert.equal(notices.filter(n=>n.type==='followup_requested'&&!n.read_at).length,1);
      assert.ok(notices.find(n=>n.id===333).read_at);
      await service.ref('reports',101).update({active_child_id:999});assert.ok((await userNotifications(service,guardian)).filter(n=>n.type==='followup_requested').every(n=>n.read_at));
    });
    await t.test('expert-owned verified reports also get follow-up notices',async()=>{
      await service.ref('reports',102).update({status:'verified',needs_follow_up:true,active_child_id:null});
      assert.ok((await userNotifications(service,expert)).some(n=>n.type==='followup_requested'&&n.report_id===102));
    });
    await t.test('badge alerts open badges for both reporting roles and mark-all is per account',async()=>{
      await service.ref('badges',1).set({id:1,badge_name:'First Report',metric:'verified_reports',target_value:1,active:1});
      for(const account of [guardian,expert]){
        const first=(await request(account)).data;const badge=first.notifications.find(n=>n.type==='badge_earned');assert.ok(badge);assert.deepEqual(badge.target,{page:'badges'});
        await request(account);assert.equal((await service.rows('notifications',[['user_id','==',account.id]])).filter(n=>n.type==='badge_earned').length,1);
      }
      await request(guardian,{action:'mark_all'});assert.equal((await request(guardian,null,'?summary_only=1')).data.unread,0);
      assert.ok((await request(expert,null,'?summary_only=1')).data.unread>0);
      const result=await request(guardian,{action:'mark_read',id:999999});assert.equal(result.status,404);
      assert.equal((await request(users['suspended-admin'])).status,403);
    });
  }finally{await new Promise(r=>server.close(r));await pg.close();}
});
