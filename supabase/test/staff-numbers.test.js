import test from 'node:test';
import assert from 'node:assert/strict';
import {Service} from '../functions/api/core/service.js';
import {reportLabel} from '../functions/api/core/analytics.js';

test('legacy staff numbers follow submission order without changing guardian numbers or report IDs',async()=>{
  const reports=[{id:30,report_number:1,user_id:2,submitted_at:'2026-10-03'},
    {id:10,report_number:1,user_id:1,submitted_at:'2026-10-01'},
    {id:20,report_number:2,user_id:1,submitted_at:'2026-10-02'}];
  let sequence=null,writes=0;
  const tx={get:async()=>({exists:sequence!==null}),update:(ref,patch)=>{Object.assign(reports.find(r=>r.id===ref.id),patch);writes++;},set:(_,value)=>sequence=value};
  const service=new Service({runTransaction:work=>work(tx)});
  service.get=async()=>sequence;service.ref=(collection,id)=>({collection,id});service.transactionRows=async()=>reports;
  await service.ensureStaffNumbers();await service.ensureStaffNumbers();assert.equal(writes,3);
  assert.deepEqual(reports.map(r=>r.id),[10,20,30]);assert.deepEqual(reports.map(r=>r.report_number),[1,2,1]);
  const staff=await service.reportViews({role:'expert'},reports);
  assert.deepEqual(staff.map(reportLabel),['Report #1','Report #2','Report #3']);
  assert.deepEqual((await service.reportViews({role:'guardian'},reports)).map(reportLabel),['Report #1','Report #2','Report #1']);
  assert.equal(sequence.last_number,3);
});
