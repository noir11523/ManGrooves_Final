import test from 'node:test';
import assert from 'node:assert/strict';
import {reportCatalogPlan} from '../functions/api/core/report-catalog-migration.js';
import {usableSite} from '../functions/api/core/site-access.js';
test('numbering is per account, keeps global IDs, and migration is repeatable',()=>{
  const reports=[{id:1073,user_id:1,submitted_at:'2026-10-08',cluster_id:9},{id:22,user_id:2,submitted_at:'2026-10-06'},{id:1060,user_id:1,submitted_at:'2026-10-07',cluster_id:9}];
  const plan=reportCatalogPlan(reports,[{id:9},{id:1,cluster_code:'MGC-INY-001'}]);
  assert.deepEqual(plan.reportUpdates.map(r=>[r.id,r.report_number]),[[1060,1],[1073,2],[22,1]]);
  assert.equal(plan.siteUpdates[0].created_by,1);assert.equal(plan.siteUpdates[1].visibility,'shared');
  assert.equal(usableSite(plan.siteUpdates[0],{id:2}),false);assert.equal(usableSite(plan.siteUpdates[0],{id:1}),true);
  const migrated=reports.map(r=>({...r,...plan.reportUpdates.find(u=>u.id===r.id)}));
  assert.equal(reportCatalogPlan(migrated,plan.siteUpdates).reportUpdates.length,0);
});

test('migration fills historical numbers when a newer report already has its correct sequence',()=>{
  const plan=reportCatalogPlan([{id:1,user_id:1,submitted_at:'2026-01-01'},{id:2,user_id:1,submitted_at:'2026-01-02',report_number:2}],[]);
  assert.equal(plan.reportUpdates[0].report_number,1);assert.equal(plan.counters[0].last_number,2);
});
