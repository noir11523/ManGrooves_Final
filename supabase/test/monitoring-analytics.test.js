import test from 'node:test';
import assert from 'node:assert/strict';
import {analyticsForUser} from '../functions/api/core/monitoring-analytics.js';
import {profileDetails} from '../functions/api/core/profile-fields.js';
import {reviewFeedback} from '../functions/api/core/review-feedback.js';
import {writeMonitoringReport} from '../functions/api/core/analytics-export.js';
import Document from '../functions/api/pdf.js';
import {PDFDocument} from 'pdf-lib';
const admin={id:9,role:'system_admin'},query={date_from:'2026-08-01',date_to:'2026-10-21'};
const site=id=>({id,name:`Site ${id}`,barangay_id:1,barangay_name:'Inayawan',center_lat:10.28,center_lng:123.88,initial_seedlings:10});
const visit=(id,cluster_id,final_health,day,extra={})=>({id,cluster_id,final_health,user_id:1,status:'verified',submitted_at:`2026-${day}T00:00:00Z`,verified_at:`2026-${day}T01:00:00Z`,...extra});

test('analytics counts distinct sites and selects current state before applying condition filters',()=>{
 const rows=[visit(1,1,'At Risk','08-01'),visit(2,1,'Healthy','10-01',{parent_report_id:1}),visit(3,2,'Stressed','10-02'),visit(4,2,'At Risk','10-03',{status:'pending'})];
 const a=analyticsForUser(admin,rows,[site(1),site(2)],query);
 assert.equal(a.verification.verified,3);assert.equal(a.monitored_clusters,2);assert.equal(a.clusters_needing_attention,1);assert.equal(a.priority_areas[0].id,2);assert.equal(a.progress.improved,1);
 assert.equal(a.health['At Risk'],1);assert.equal(a.latest_health['At Risk'],0);
 const risk=analyticsForUser(admin,rows,[site(1),site(2)],{...query,health:'At Risk'});assert.equal(risk.monitored_clusters,0);assert.equal(risk.verification.verified,0);
 const current=analyticsForUser(admin,rows,[site(1),site(2)],{...query,health:'Healthy'});assert.deepEqual(current.report_ids,[1,2]);
});
test('historical snapshots exclude later verification and use Manila dates and deterministic ties',()=>{
 const rows=[visit(1,1,'Stressed','08-01'),visit(2,1,'Healthy','08-01'),visit(3,1,'At Risk','08-02',{verified_at:'2026-10-01T16:00:00Z'})];
 const a=analyticsForUser(admin,rows,[site(1)],{date_from:'2026-08-01',date_to:'2026-10-01'});
 assert.equal(a.clusters[0].report_id,2);assert.equal(a.verification.verified,2);assert.equal(a.growth[1].health,null);assert.equal(a.growth[1].verified_reports,0);
 assert.equal(analyticsForUser(admin,rows,[site(1)],{...query,date_to:'2026-10-02'}).clusters[0].report_id,3);
});
test('only explicit comparable follow-ups show improvement or decline; missing and zero counts are distinct',()=>{
 const rows=[visit(1,1,'Healthy','08-01',{observed_alive_count:10}),visit(2,1,'At Risk','10-01',{observed_alive_count:0}),visit(3,2,'Unknown','08-01'),visit(4,2,'Healthy','10-01',{parent_report_id:3,observed_alive_count:null})];
 const a=analyticsForUser(admin,rows,[site(1),site(2)],query);
 assert.equal(a.progress.declined,0);assert.equal(a.progress.improved,0);assert.equal(a.overall_survival,null);assert.equal(a.clusters.find(c=>c.id===1).observed_alive_count,0);assert.equal(a.clusters.find(c=>c.id===2).observed_alive_count,null);
 rows[1].parent_report_id=1;assert.equal(analyticsForUser(admin,rows,[site(1),site(2)],query).progress.declined,1);
});
test('guardian analytics does not expose other accounts or unrelated map sites',()=>{
 const a=analyticsForUser({id:1,role:'guardian'},[visit(1,1,'Healthy','10-01'),visit(2,2,'At Risk','10-01',{user_id:2})],[site(1),site(2)],query);
 assert.equal(a.verification.verified,1);assert.deepEqual(a.map.map(c=>c.id),[1]);assert.deepEqual(a.options.clusters.map(c=>c.id),[1]);assert.equal(a.capabilities.can_export_pdf,false);
});
test('invalid coordinates and missing verification dates remain visible as data limitations',()=>{
 const a=analyticsForUser(admin,[visit(1,1,'Healthy','10-01'),visit(2,2,'Stressed','10-01',{verified_at:null})],[{...site(1),center_lat:null},site(2)],query);
 assert.equal(a.monitored_clusters,1);assert.equal(a.map.length,0);assert.equal(a.data_quality.missing_map_coordinates,1);assert.equal(a.data_quality.missing_verification_date,1);
 for(const q of [{date_from:'2026-02-30'},{date_from:'2026-10-22'}, {health:'Fine'},{cluster_id:'x'}])assert.throws(()=>analyticsForUser(admin,[],[],{...query,...q}));
});
test('structured addresses accept absent optional parts, reject mismatched geography and preserve legacy text',async()=>{
 const service={get:async()=>({id:1,name:'Inayawan',city_municipality:'Cebu City',city_psgc:'CITY',province:'Cebu'})};
 const input={barangay_id:1,phone:'09171234567',house_unit:'Unit 3B',street_sitio:'Purok 3',city_municipality:'Cebu City',zip_code:'6000'};
 const value=await profileDetails(service,input);assert.equal(value.house_unit,'Unit 3B');assert.equal(value.city_psgc,'CITY');assert.equal(value.zip_code,'6000');assert.equal(value.address_line,undefined);
 const empty=await profileDetails(service,{...input,house_unit:'',street_sitio:'',zip_code:''});assert.equal(empty.house_unit,null);assert.equal(empty.street_sitio,null);assert.equal(empty.zip_code,null);
 for(const change of [{city_municipality:'Mandaue City'},{city_psgc:'OTHER'},{zip_code:'60x0'},{zip_code:'60000'}])await assert.rejects(profileDetails(service,{...input,...change}));
 assert.equal((await profileDetails(service,{...input,address_line:'Original unsplit address'})).address_line,'Original unsplit address');
});
test('feedback merges distinct legacy instructions once and accepts a single field',()=>{
 assert.equal(reviewFeedback({expert_feedback:'Inspect roots.',follow_up_note:'Inspect roots.'}),'Inspect roots.');
 assert.equal(reviewFeedback({expert_feedback:'Leaves are stressed.',follow_up_note:'Revisit next week.'}),'Leaves are stressed.\n\nRevisit next week.');
 assert.equal(reviewFeedback({expert_feedback:'Revisit next week.'}),'Revisit next week.');
});
test('PDF uses the same filtered evidence and produces paginated valid documents for long site names',async()=>{
 const sites=Array.from({length:30},(_,i)=>({...site(i+1),name:'Long monitoring site '.repeat(12)+i}));
 const a=analyticsForUser(admin,sites.map(c=>visit(c.id,c.id,'At Risk','10-01')),sites,query);
 const captured=[];const fake={fontSize(){return this;},moveDown(){return this;},table(h,rows){captured.push(h.join(' | '),...rows.map(r=>r.join(' | ')));return this;},text(v){captured.push(v);return this;}};
 writeMonitoringReport(fake,a,'2026-10-22T00:00:00Z');assert.ok(captured.some(t=>t.includes('Monitored clusters: 30')));assert.ok(captured.some(t=>t.includes('Survival rate: Insufficient data')));assert.ok(captured.some(t=>t.includes('Report #30')));
 let bytes;const pdf=new Document();pdf.pipe({end(v){bytes=v;}});writeMonitoringReport(pdf,a,'2026-10-22T00:00:00Z');await pdf.end();const parsed=await PDFDocument.load(bytes);assert.ok(parsed.getPageCount()>2);assert.equal(parsed.getTitle(),'ManGROOVES monitoring report');
});
