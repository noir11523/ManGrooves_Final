import test from 'node:test';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {build} from 'esbuild';
import {JSDOM} from 'jsdom';
import {analyticsForUser} from '../../functions/api/core/monitoring-analytics.js';
const dom=new JSDOM('<div id="app"></div><div id="toast" hidden></div>',{url:'https://example.test/#badges'});
dom.window.HTMLElement.prototype.scrollIntoView=()=>{};
for(const key of ['window','document','location','history','navigator','FormData','File','Event'])Object.defineProperty(globalThis,key,{value:dom.window[key],configurable:true});
const bundle=await build({entryPoints:[fileURLToPath(new URL('../src/app.js',import.meta.url))],bundle:true,write:false,format:'esm',platform:'node',plugins:[{name:'adapters',setup(b){
 b.onResolve({filter:/client\.js$/},()=>({path:'client',namespace:'stub'}));
 b.onResolve({filter:/\.css$/},()=>({path:'css',namespace:'stub'}));
 b.onResolve({filter:/^chart.js\/auto$/},()=>({path:'chart',namespace:'stub'}));
 b.onLoad({filter:/.*/,namespace:'stub'},({path})=>({contents:path==='client'?`export const initialize=async f=>{globalThis.restoreTestAccount=f;};
 export const api=(...args)=>globalThis.testApi(...args);export const login=async()=>{};export const logout=async()=>{};
 export const changePassword=async()=>{};export const friendly=e=>e.message;export const apiUrl=p=>p;`:path==='chart'?'export default class Chart {constructor(){}destroy(){}}':'',loader:'js'}));
}}]});
await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`);
const tick=()=>new Promise(resolve=>setImmediate(resolve));
const $=s=>document.querySelector(s);

test('analytics renders empty evidence honestly, validates dates and links priorities accessibly',async()=>{
 const user={id:2,role:'system_admin',full_name:'Test Admin'};
 const analytics=analyticsForUser(user,[],[],{date_from:'2026-08-01',date_to:'2026-10-21'});
 globalThis.testApi=async path=>path==='me.php'?{user}:{analytics};
 history.replaceState(null,'','#analytics');await globalThis.restoreTestAccount({id:'admin'});await tick();
 assert.match($('#content').textContent,/Insufficient data/);assert.equal(document.querySelectorAll('canvas').length,0);
 assert.match($('#content').textContent,/No verified visits/);assert.ok($('#analytics-pdf'));
 $('[data-section]').click();assert.equal(document.activeElement.id,'priority-areas');
 $('[name=date_from]').value='2026-10-22';$('#analytics-filters').dispatchEvent(new Event('submit',{cancelable:true,bubbles:true}));
 assert.match($('#analytics-filters .error').textContent,/Start date must be on or before end date/);
 assert.equal(location.hash,'#analytics');
});

test('profile city changes reset barangay and optional address parts keep their values',async()=>{
 history.replaceState(null,'','#profile');
 const user={id:1,role:'guardian',full_name:'Test User',barangay_id:1,house_unit:'Unit 3B',zip_code:'6000',address_line:'Original address'};
 globalThis.testApi=async path=>path==='me.php'?{user}:{user,barangays:[{id:1,name:'Poblacion',city_municipality:'Cebu City'},{id:2,name:'Poblacion',city_municipality:'Danao City'}]};
 await globalThis.restoreTestAccount({id:'user'});await tick();
 assert.equal($('[name=house_unit]').required,false);assert.equal($('[name=street_sitio]').required,false);assert.equal($('[name=zip_code]').required,false);assert.equal($('[name=province_display]').value,'Cebu');assert.equal($('[name=country]'),null);
 const city=$('[data-address-city]');city.value='Danao City';city.dispatchEvent(new Event('change'));
 assert.equal($('[name=barangay_id]').value,'');assert.equal($('datalist').children.length,1);assert.match($('datalist option').value,/Danao City/);
 const barangay=$('[data-barangay-search]');barangay.value='Poblacion — Cebu City';barangay.dispatchEvent(new Event('input'));assert.equal(barangay.checkValidity(),false);
 barangay.value=$('datalist option').value;barangay.dispatchEvent(new Event('input'));assert.equal($('[name=barangay_id]').value,'2');assert.equal(barangay.checkValidity(),true);
 assert.equal($('[name=house_unit]').value,'Unit 3B');assert.equal($('[name=zip_code]').value,'6000');
});

test('review and verified follow-up forms have one Feedback field and retain saved instructions',async()=>{
 const report={id:1,user_id:1,report_code:'Report #1',status:'pending',suggested_health:'Healthy',observations:[],verification_history:[],expert_feedback:'Inspect the roots.'};
 const writes=[];globalThis.testApi=async(path,{body}={})=>{
  if(path==='me.php')return {user:{id:2,role:'expert',full_name:'Expert'}};
  if(path==='report.php')return {report};if(path==='species.php')return {species:[]};
  if(path==='review.php'){writes.push(body);Object.assign(report,body);return {};}
  throw Error(path);
 };
 history.replaceState(null,'','#report/1?review=1');await globalThis.restoreTestAccount({id:'expert'});await tick();
 assert.equal(document.querySelectorAll('#review textarea').length,1);assert.equal($('[name=follow_up_note]'),null);assert.equal($('[name=expert_feedback]').value,'Inspect the roots.');assert.equal($('#corrections').hidden,true);
 report.status='verified';await globalThis.restoreTestAccount({id:'expert'});await tick();
 assert.equal(document.querySelectorAll('section>h2').length>0,true);assert.equal($('#review-area').textContent.includes('rejecting'),false);assert.equal([...document.querySelectorAll('h2')].filter(h=>h.textContent==='Feedback').length,0);
 $('[name=expert_feedback]').value='Check the leaves on the next visit.';$('[name=needs_follow_up]').checked=true;
 $('#review').dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));await tick();await tick();
 assert.equal(writes[0].expert_feedback,'Check the leaves on the next visit.');assert.equal(writes[0].follow_up_note,undefined);assert.equal(writes[0].action,'followup');assert.equal(document.querySelectorAll('#review textarea').length,1);
});

test('profile password visibility is independent and validation happens before confirmation',async()=>{
 history.replaceState(null,'','#profile');
 const user={id:1,role:'guardian',first_name:'Test',last_name:'Guardian',email:'test@example.test',full_name:'Test Guardian',barangay_id:1};
 globalThis.testApi=async path=>path==='me.php'?{user}:{user,barangays:[{id:1,name:'Inayawan'}]};
 await globalThis.restoreTestAccount({id:'user'});await tick();
 const form=$('#password');
 form.elements.current.value='old-password';form.elements.next.value='new-password';form.elements.confirmation.value='does-not-match';
 const eye=$('[aria-controls="security-next"]');eye.click();
 assert.equal(form.elements.next.type,'text');assert.equal(form.elements.current.type,'password');assert.equal(form.elements.confirmation.type,'password');
 eye.click();assert.equal(form.elements.next.type,'password');assert.equal(form.elements.next.value,'new-password');
 form.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));await tick();
 assert.match(form.querySelector('.error').textContent,/passwords do not match/);
 form.elements.next.value=form.elements.confirmation.value='old-password';
 form.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));await tick();
 assert.match(form.querySelector('.error').textContent,/different new password/);
});

test('review queue and history expose filters and retain them on later pages',async()=>{
 for(const [route,path,key,value] of [['verification','reports.php','health','Unknown'],['history','validation-history.php','action','correct']]){
  history.replaceState(null,'',`#${route}?q=coast&${key}=${value}`);
  globalThis.testApi=async endpoint=>{
   if(endpoint==='me.php')return {user:{id:2,role:'expert',full_name:'Test Expert'}};
   assert.equal(endpoint,path);return {page:1,pages:2,total:21,items:[]};
  };
  await globalThis.restoreTestAccount({id:'expert'});await tick();
  assert.equal($('#retry'),null);assert.equal($('.list-filters [name=q]').value,'coast');
  assert.equal($(`.list-filters [name=${key}]`).value,value);
  assert.match($('.pagination a').href,/q=coast/);assert.match($('.pagination a').href,new RegExp(`${key}=${value}`));
  assert.match($('.empty').textContent,/match/);
 }
});

test('report filters use one status control and one tag, and clear stale attention when changed',async()=>{
 history.replaceState(null,'','#reports?needs_attention=1');
 const calls=[];
 globalThis.testApi=async(path,options)=>{
  if(path==='me.php')return {user:{id:1,role:'guardian',first_name:'Test',full_name:'Test Guardian'}};
  assert.equal(path,'reports.php');calls.push(options.query);
  return {page:1,pages:1,total:1,items:[{id:1,report_code:'Report #1',status:'pending',needs_attention:1,sitio_name:'Coast',submitted_at:'2026-10-03'}]};
 };
 await globalThis.restoreTestAccount({id:'user'});await tick();
 assert.equal($('#filters [name=status_filter]').value,'attention');
 assert.equal($('#filters [name=needs_attention]'),null);
 assert.equal(document.querySelectorAll('.report-table [data-label=Status] .pill').length,1);
 assert.equal($('.report-table [data-label=Status] .pill').textContent,'Pending');
 assert.equal(document.querySelector('th:nth-child(2)').textContent,'Site');
 assert.equal($('.pagination'),null);
 const select=$('[name=status_filter]');select.value='verified';
 $('#filters').dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));
 await new Promise(resolve=>setTimeout(resolve,20));
 assert.equal(calls.at(-1).status,'verified');
 assert.equal(calls.at(-1).needs_attention,undefined);
});
test('legacy review URL uses the unified report filters without duplicate status cards',async()=>{
 history.replaceState(null,'','#verification?q=coast&date_from=2026-10-01&page=2');
 const calls=[];
 globalThis.testApi=async(path,options)=>{
  if(path==='me.php')return {user:{id:2,role:'expert',full_name:'Test Expert'}};
  assert.equal(path,'reports.php');calls.push({...options.query});
  return {page:1,pages:1,total:1,items:[{id:9,report_code:'Report #9',guardian_name:'Local Guardian',status:options.query.status||'pending',can_review:options.query.status==='pending',display_health:'Stressed',submitted_at:'2026-10-01 14:29:00'}]};
 };
 await globalThis.restoreTestAccount({id:'expert'});await tick();
 assert.equal(document.querySelectorAll('.verification-stats a').length,0);
 assert.equal($('#filters [name=status_filter]').value,'pending');
 assert.equal($('.report-table a').textContent,'Review');
 for(const status of ['verified','rejected','pending']){
  $('#filters [name=status_filter]').value=status;$('#filters').dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));await new Promise(resolve=>setTimeout(resolve,30));
  assert.equal(calls.at(-1).status,status);assert.equal(calls.at(-1).page,undefined);assert.equal(calls.at(-1).q,'coast');assert.equal(calls.at(-1).date_from,'2026-10-01');
 }
});

test('badges display artwork and progress, with certificates only for earned awards',async()=>{
 history.replaceState(null,'','#badges');
 let earned=true;
 globalThis.testApi=async path=>{
  if(path==='me.php')return {user:{id:1,role:'guardian',first_name:'Test',full_name:'Test Guardian'}};
  assert.equal(path,'badges.php');return {badges:[1,2].map(id=>({id,badge_name:`Badge ${id}`,description:'Recognition',earned,progress_percent:earned?100:0,current_value:earned?1:0,target_value:1}))};
 };
 await globalThis.restoreTestAccount({id:'user'});await tick();
 assert.equal(document.querySelectorAll('.certificate').length,2);
 for(const button of document.querySelectorAll('.certificate'))assert.equal(typeof button.onclick,'function');
 assert.equal(document.querySelectorAll('.certificate-qr').length,0);
 assert.equal(document.querySelectorAll('.badge-emblem').length,2);
 assert.match(document.body.textContent,/QR is inside/);
 assert.equal($('#retry'),null);
 earned=false;await globalThis.restoreTestAccount({id:'user'});await tick();
 assert.equal($('#retry'),null);assert.equal(document.querySelectorAll('.certificate').length,0);
});
test('validation history displays the actual reviewer and saved health decision',async()=>{
 history.replaceState(null,'','#history');
 globalThis.testApi=async path=>{
  if(path==='me.php')return {user:{id:2,role:'expert',first_name:'Test',full_name:'Test Expert'}};
  assert.equal(path,'validation-history.php');return {page:1,pages:1,total:1,items:[{report_id:3,report_code:'Report #3',action:'correct',verifier_name:'Clement',previous_health:'Unknown',new_health:'Healthy',new_status:'verified',created_at:'2026-10-03'}]};
 };
 await globalThis.restoreTestAccount({id:'expert'});await tick();
 assert.equal($('#retry'),null);assert.match(document.body.textContent,/Clement/);assert.match(document.body.textContent,/Healthy/);assert.doesNotMatch(document.body.textContent,/undefined/);
});
