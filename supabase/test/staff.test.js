import test from 'node:test';
import assert from 'node:assert/strict';
import {createStaff} from '../functions/api/core/staff.js';
import {readFileSync} from 'node:fs';

test('staff creation rejects administrator and guardian roles before creating an account',async()=>{
 const actor={uid:'admin',id:1,status:'active',role:'system_admin'};
 for(const role of ['system_admin','guardian',null])await assert.rejects(createStaff({},actor,{role}),/Only Expert/);
});

test('staff creation rechecks administrator access and removes the auth account if saving fails',async()=>{
  const actor={uid:'admin',id:1,status:'active',role:'system_admin'};
  const deleted=[];
  const service={
    get:async()=>({name:'Inayawan',province:'Cebu',city_municipality:'Cebu City'}),rows:async()=>[],limited:async()=>{},ids:async()=>[2],ref:()=>({}),
    auth:{createUser:async()=>({uid:'new-staff'}),deleteUser:async uid=>deleted.push(uid)},
    bucket:{file:()=>({save:async()=>{},delete:async()=>{}})},
    db:{runTransaction:async callback=>callback({get:async()=>({data:()=>({...actor,status:'inactive'})})})},
  };
  await assert.rejects(createStaff(service,actor,{first_name:'Sample',last_name:'Staff',email:'staff@example.test',password:'initialpass12',password_confirmation:'initialpass12',barangay_id:1,role:'expert',phone:'09171234567',address_line:'Test Street'},{id_photo:readFileSync(new URL('./fixtures/photo.jpg',import.meta.url))}),e=>e.status===403);
  assert.deepEqual(deleted,['new-staff']);
});
