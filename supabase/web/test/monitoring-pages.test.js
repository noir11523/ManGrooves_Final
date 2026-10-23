import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {fileURLToPath} from 'node:url';
import {JSDOM} from 'jsdom';

const dom=new JSDOM('<main id="page"></main>',{url:'https://example.test/explore.php'});
for(const key of ['window','document','navigator','HTMLElement','Element','SVGElement','Event','KeyboardEvent','FormData'])Object.defineProperty(globalThis,key,{value:dom.window[key],configurable:true});
dom.window.SVGSVGElement.prototype.createSVGRect=()=>({});dom.window.HTMLElement.prototype.scrollIntoView=()=>{};
Object.defineProperty(dom.window.HTMLElement.prototype,'clientWidth',{get(){return this.id==='explore-map'?600:0;}});
Object.defineProperty(dom.window.HTMLElement.prototype,'clientHeight',{get(){return this.id==='explore-map'?360:0;}});
globalThis.requestAnimationFrame=f=>f();globalThis.charts=[];
globalThis.testLeaflet=(await import('leaflet')).default;
const bundle=await build({stdin:{contents:'export * from "./explore-page.js";export * from "./timeline-page.js";',resolveDir:fileURLToPath(new URL('../src/',import.meta.url))},bundle:true,write:false,format:'esm',platform:'node',plugins:[{name:'fixture',setup(b){
 b.onResolve({filter:/client\.js$/},()=>({path:'client',namespace:'stub'}));b.onResolve({filter:/^leaflet$/},()=>({path:'leaflet',namespace:'stub'}));b.onResolve({filter:/^chart.js\/auto$/},()=>({path:'chart',namespace:'stub'}));
 b.onLoad({filter:/.*/,namespace:'stub'},({path})=>({contents:path==='client'?'export const api=(...a)=>globalThis.testApi(...a);export const apiUrl=p=>p;':path==='leaflet'?'export default globalThis.testLeaflet;':'export default class Chart { constructor(node,config){this.config=config;globalThis.charts.push(this)} destroy(){this.destroyed=true} }'}));
}}]});
const {exploreSites,filterExploreSites,mangroveTimeline}=await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`);
const root=document.querySelector('#page'),$=s=>root.querySelector(s);
const species=[{id:1,scientific_name:'Avicennia marina',local_name:'Bungalon'},{id:2,scientific_name:'Rhizophora apiculata'},{id:3,scientific_name:'Nypa fruticans'}];
const sites=[{id:1,name:'North coast',barangay_id:1,barangay_name:'Poblacion',city_municipality:'Cebu City',species_id:1,latest_health:'Healthy',verified_count:1,latitude:10.28,longitude:123.88},{id:2,name:'South coast',barangay_id:2,barangay_name:'Poblacion',city_municipality:'Danao City',species_id:2,latest_health:'At Risk',verified_count:3,latitude:10.3,longitude:123.9}];
test('Explore intersects species, health and disambiguated location; empty species has no broken map action',async()=>{
 globalThis.testApi=async()=>({species,clusters:sites});const dispose=await exploreSites(root,{}, {role:'system_admin'});
 try{
  assert.equal(filterExploreSites(sites,species,{q:'bungalon'}).length,1);
  assert.equal(filterExploreSites(sites,species,{q:'danao',species_id:1}).length,0);
  assert.match($('[name=barangay_id]').textContent,/Poblacion, Cebu City/);assert.match($('[name=barangay_id]').textContent,/Poblacion, Danao City/);
  assert.equal(root.querySelector('[data-species="3"]'),null);
  $('[name=species_id]').value='1';$('[name=health]').value='At Risk';$('#explore-filters').dispatchEvent(new Event('submit',{cancelable:true}));
  assert.match($('#explore-sites').textContent,/No matching verified sites/);assert.equal($('#explore-fit'),null);assert.equal($('.species-guide'),null);assert.equal(root.textContent.includes('Manage sites'),false);
  $('#explore-reset').click();assert.equal($('#explore-sites').querySelectorAll('[data-site]').length,2);
  $('[data-site="2"]').click();assert.match($('.leaflet-popup').textContent,/South coast/);
 }finally{dispose();}
});
test('Explore preserves guardian scope and public timeline links require sign-in',async()=>{
 globalThis.testApi=async()=>({species,clusters:sites});let dispose=await exploreSites(root,{}, {role:'guardian',barangay_id:1});
 assert.ok($('#explore-sites a[href="#cluster/1"]'));assert.equal($('#explore-sites a[href="#cluster/2"]'),null);assert.match($('#explore-sites').textContent,/Outside your barangay/);dispose();
 dispose=await exploreSites(root);assert.equal(root.querySelector('a[href="#species?tab=sites"]'),null);assert.equal($('#explore-sites').querySelectorAll('a[href="#login"]').length,2);dispose();
});
test('timeline exposes both histories, honours count deep link and keeps unknown counts blank',async()=>{
 globalThis.charts=[];globalThis.testApi=async()=>({cluster:{name:'Coast'},timeline:[{id:1,report_code:'Report #1',submitted_at:'2026-10-01',health:'Healthy',observed_alive_count:0,can_view_details:false},{id:2,report_code:'Report #2',submitted_at:'2026-10-02',health:'Unknown',observed_alive_count:null,can_view_details:true}]});
 const dispose=await mangroveTimeline(root,1,{tab:'growth'},name=>`<h1>${name}</h1>`,()=>{});
 assert.equal(document.activeElement.id,'mangrove-counts');assert.ok($('#health-history'));assert.ok($('#mangrove-counts'));assert.equal(charts.length,2);
 assert.equal($('#mangrove-counts h2').textContent,'Growth Timeline');assert.equal($('.timeline-summary'),null);assert.equal(root.textContent.includes('Formerly'),false);
 assert.deepEqual(charts[1].config.data.datasets[0].data,[0]);assert.deepEqual(charts[0].config.data.datasets[0].data,[2,null]);
 assert.equal(root.querySelector('a[href="#report/1"]'),null);assert.ok(root.querySelector('a[href="#report/2"]'));
 assert.equal($('.timeline-shortcuts'),null);dispose();assert.ok(charts.every(c=>c.destroyed));
 globalThis.testApi=async()=>({cluster:{name:'New site'},timeline:[]});const close=await mangroveTimeline(root,1,{},name=>`<h1>${name}</h1>`,()=>{});assert.match($('#mangrove-counts').textContent,/No counts recorded/);assert.match($('#health-history').textContent,/No verified visits/);close();
});
