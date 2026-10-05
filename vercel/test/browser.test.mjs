import test from 'node:test';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {build} from 'esbuild';
import {JSDOM} from '../../supabase/node_modules/jsdom/lib/api.js';
import {phpRoute} from '../src/routes.js';
const dom=new JSDOM('<meta name="csrf-token" content="csrf"><meta name="cloud-api-base" content="https://project.supabase.co/functions/v1/api/"><div class="cloud-panel"><div id="cloud-content"></div><div id="toast" hidden></div></div>',{url:'https://mangrooves.example/register.php'});
for(const key of ['window','document','location','history','navigator','FormData','File','Event'])Object.defineProperty(globalThis,key,{value:dom.window[key],configurable:true});
const client=await import('../src/client.js');
const bundle=await build({entryPoints:[fileURLToPath(new URL('../../supabase/web/src/app.js',import.meta.url))],bundle:true,write:false,format:'esm',platform:'node',plugins:[{name:'test-adapters',setup(b){
 b.onResolve({filter:/client\.js$/},()=>({path:'client',namespace:'stub'}));
 b.onResolve({filter:/\.css$/},()=>({path:'css',namespace:'stub'}));
 b.onResolve({filter:/^chart.js\/auto$/},()=>({path:'chart',namespace:'stub'}));
 b.onLoad({filter:/.*/,namespace:'stub'},({path})=>({contents:path==='client'?`export const initialize=async()=>{throw new Error('The standalone app must not boot in PHP.');};export const api=(...args)=>globalThis.testApi(...args);export const login=async()=>{};export const logout=async()=>{};export const changePassword=async()=>{};export const friendly=e=>e.message;export const apiUrl=p=>p;`:path==='chart'?'export default class Chart {constructor(){}destroy(){}}':'',loader:'js'}));
}}]});
const {renderEmbedded}=await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`);
const node=document.getElementById('cloud-content'),$=s=>document.querySelector(s);
test('simultaneous reads share one request; subsequent reads and writes remain fresh',async()=>{
 let calls=0,release;
 globalThis.fetch=async()=>{calls++;await new Promise(resolve=>{release=resolve;});return new Response(JSON.stringify({ok:true,items:[]}));};
 const a=client.api('reports.php',{query:{page:1,q:'coast'}}),b=client.api('reports.php',{query:{q:'coast',page:1}});
 assert.equal(calls,1);release();await Promise.all([a,b]);
 const c=client.api('reports.php',{query:{page:1,q:'coast'}});assert.equal(calls,2);release();await c;
});
test('homepage stays usable while totals load and handles unavailable totals',async()=>{
 const source=await (await import('node:fs/promises')).readFile(new URL('../../public/assets/js/app.js',import.meta.url),'utf8');
 for(const failed of [false,true]){
  const home=new JSDOM('<h1>Protect mangroves</h1><section data-home-stats aria-busy="true"><strong data-stat="guardians">—</strong><p data-stats-status></p></section>',{url:'https://mangrooves.example/',runScripts:'outside-only'});
  home.window.matchMedia=()=>({matches:true,addEventListener(){}});home.window.AbortSignal=AbortSignal;
  let resolve;home.window.fetch=()=>new Promise(r=>{resolve=r;});
  home.window.eval(source);assert.equal(home.window.document.querySelector('h1').textContent,'Protect mangroves');assert.equal(home.window.document.querySelector('strong').textContent,'—');
  resolve(new Response(JSON.stringify(failed?{ok:false}:{ok:true,summary:{guardians:7}}),{status:failed?503:200}));
  await new Promise(r=>setTimeout(r,10));
  assert.equal(home.window.document.querySelector('strong').textContent,failed?'—':'7');assert.equal(home.window.document.querySelector('section').getAttribute('aria-busy'),'false');
  assert.match(home.window.document.querySelector('p').textContent,failed?/unavailable/:/updated/);home.window.close();
 }
});
test('successful web sign-in opens the dashboard automatically',async()=>{
 const original=Object.getOwnPropertyDescriptor(globalThis,'location');let destination;
 Object.defineProperty(globalThis,'location',{value:{assign:path=>destination=path},configurable:true});
 globalThis.fetch=async(url,options)=>{
  assert.equal(url,'/cloud-session.php');assert.equal(options.credentials,'same-origin');
  assert.equal(JSON.parse(options.body).action,'login');
  return new Response(JSON.stringify({ok:true,user:{role:'guardian'},csrf:'csrf'}));
 };
 try{await client.login('guardian@example.test','password123');assert.equal(destination,'/dashboard.php');}
 finally{Object.defineProperty(globalThis,'location',original);}
});
test('PHP registration uses the shared email code and typed expert ID form without a second shell',async()=>{
 globalThis.testApi=async path=>{assert.equal(path,'configuration.php');return {barangays:[{id:1,name:'Coast'}]};};
 await renderEmbedded('register',node,{},null);assert.ok($('#registration'));assert.ok($('[name=first_name]'));assert.ok($('[name=expert_id_code]'));assert.equal($('[type=file]'),null);assert.equal($('#app'),null);assert.equal($('.shell'),null);
 $('[name=role]').value='expert';$('[name=role]').dispatchEvent(new Event('change'));assert.equal($('#expert-proof').hidden,false);
});
test('embedded reports preserve attention filters and report details links',async()=>{
 globalThis.testApi=async(path,options)=>{assert.equal(path,'reports.php');assert.equal(options.query.needs_attention,'1');return {items:[{id:9,report_code:'Report #9',status:'pending',needs_attention:1}],pages:1};};
 await renderEmbedded('reports',node,{needs_attention:'1'},{role:'expert'});assert.equal($('[name=status_filter]').value,'attention');assert.equal($('.report-table a').getAttribute('href'),'#report/9');assert.equal($('.report-table [data-label=Status] .pill').textContent,'Pending');
});
test('PHP routes preserve IDs, filters, and separate health and growth pages',()=>{
 assert.equal(phpRoute('#report/9'),'/report-detail.php?id=9');assert.equal(phpRoute('#growth'),'/clusters.php?view=growth');assert.equal(phpRoute('#cluster/2?tab=growth'),'/cluster.php?tab=growth&id=2');assert.equal(phpRoute('#reports?needs_attention=1&page=2'),'/reports.php?needs_attention=1&page=2');assert.equal(phpRoute('#about'),null);assert.equal(phpRoute('#https://evil.test'),null);
});
test('PHP report map mounts immediately with location search and automatic filters',async()=>{
 globalThis.testApi=async path=>{assert.equal(path,'reports.php');return {items:[],pages:1,total:0};};
 await renderEmbedded('report-map',node,{status:'verified'},{role:'guardian'});
 await new Promise(resolve=>setImmediate(resolve));
 assert.ok($('#map-place'));assert.ok($('.leaflet-container'));assert.ok($('.leaflet-control-zoom'));
 assert.equal($('[name=status]').value,'verified');assert.ok($('[name=health]'));
 assert.equal([...node.querySelectorAll('button')].some(button=>button.textContent==='Apply'),false);
 assert.match($('#map-empty').textContent,/No reports match/);
 await renderEmbedded('reports',node,{}, {role:'guardian'});
 assert.equal($('.leaflet-container'),null);
});
test('JSON requests use PHP CSRF and registration proof stays confined to the request',async()=>{
 const calls=[];globalThis.fetch=async(url,options)=>{calls.push({url:String(url),options});return new Response(JSON.stringify({ok:true}),{headers:{'Content-Type':'application/json'}});};
 await client.api('profile.php',{body:{first_name:'Clement'}});assert.equal(calls[0].url,'/cloud-api.php?route=profile.php');assert.equal(calls[0].options.headers['X-CSRF-Token'],'csrf');assert.equal(calls[0].options.credentials,'same-origin');
 await client.api('complete-registration.php',{body:{first_name:'Clement'},token:'proof',anonymous:true});assert.equal(calls[1].options.headers['X-Registration-Proof'],'proof');
 await assert.rejects(client.api('https://evil.test/photo.php',{blob:true}),/Invalid request/);
});
test('photo uploads over Vercel body limit and private downloads go directly to Supabase',async()=>{
 const calls=[];globalThis.fetch=async(url,options)=>{calls.push({url:String(url),options});return String(url)==='/cloud-session.php'?new Response(JSON.stringify({ok:true,access_token:'user-token',base:'https://project.supabase.co/functions/v1/api/'})):new Response(JSON.stringify({ok:true}));};
 const body=new FormData();body.append('photo',new File([new Uint8Array(5*1024*1024)],'field.jpg',{type:'image/jpeg'}));
 await client.api('submit-report.php',{body});assert.equal(calls[0].url,'/cloud-session.php');assert.equal(calls[1].url,'https://project.supabase.co/functions/v1/api/submit-report.php');assert.equal(calls[1].options.body,body);assert.equal(calls[1].options.credentials,'omit');assert.equal(calls[1].options.headers.Authorization,'Bearer user-token');assert.equal(calls[1].options.headers['Content-Type'],undefined);
 calls.length=0;await client.api('photo.php?id=9',{blob:true});assert.equal(calls[1].url,'https://project.supabase.co/functions/v1/api/photo.php?id=9');
});
