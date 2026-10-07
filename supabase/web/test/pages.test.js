import test from 'node:test';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {build} from 'esbuild';
import {JSDOM} from 'jsdom';
const dom=new JSDOM('<div id="app"></div><div id="toast" hidden></div>',{url:'https://example.test/#badges'});
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

test('review queue and history expose filters and retain them on later pages',async()=>{
 for(const [route,path,key,value] of [['verification','verification.php','health','Unknown'],['history','validation-history.php','action','correct']]){
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
test('verification cards apply the selected status, reset pagination and keep search and dates',async()=>{
 history.replaceState(null,'','#verification?q=coast&date_from=2026-10-01&page=2');
 const calls=[];
 globalThis.testApi=async(path,options)=>{
  if(path==='me.php')return {user:{id:2,role:'expert',full_name:'Test Expert'}};
  assert.equal(path,'verification.php');calls.push({...options.query});
  return {page:1,pages:1,total:1,summary:{pending:8,verified_attention:3,verified:9,rejected:2},items:[{id:9,report_code:'Report #9',guardian_name:'Local Guardian',status:options.query.status||'pending',display_health:'Stressed',submitted_at:'2026-10-01 14:29:00'}]};
 };
 await globalThis.restoreTestAccount({id:'expert'});await tick();
 assert.equal(document.querySelectorAll('.verification-stats a').length,4);
 const attention=[...document.querySelectorAll('.verification-stats a')].find(a=>a.textContent.includes('Verified needing'));
 assert.match(attention.href,/verified_attention=1/);assert.match(attention.href,/q=coast/);assert.match(attention.href,/date_from=2026-10-01/);assert.doesNotMatch(attention.href,/page=/);
 attention.click();await new Promise(resolve=>setTimeout(resolve,20));
 assert.equal(calls.at(-1).verified_attention,'1');assert.match($('.verification-help').textContent,/Verified reports/);
 assert.match($('.report-table').textContent,/Local Guardian/);
 const verified=[...document.querySelectorAll('.verification-stats a')].find(a=>a.textContent==='Verified9');verified.click();await new Promise(resolve=>setTimeout(resolve,20));
 assert.equal(calls.at(-1).status,'verified');assert.equal(calls.at(-1).verified_attention,undefined);
 assert.equal($('.report-table a').textContent,'View');
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
