import test from 'node:test';
import assert from 'node:assert/strict';
import {createStaff} from '../functions/api/core/staff.js';

test('staff creation rechecks administrator access and removes the auth account if saving fails',async()=>{
  const actor={uid:'admin',id:1,status:'active',role:'system_admin'};
  const deleted=[];
  const service={
    get:async()=>({name:'Inayawan'}),rows:async()=>[],limited:async()=>{},ids:async()=>[2],ref:()=>({}),
    auth:{createUser:async()=>({uid:'new-staff'}),deleteUser:async uid=>deleted.push(uid)},
    db:{runTransaction:async callback=>callback({get:async()=>({data:()=>({...actor,status:'inactive'})})})},
  };
  await assert.rejects(createStaff(service,actor,{first_name:'Sample',last_name:'Staff',email:'staff@example.test',password:'initialpass12',password_confirmation:'initialpass12',barangay_id:1,role:'expert',expert_id_code:'ORG-1'}),e=>e.status===403);
  assert.deepEqual(deleted,['new-staff']);
});
