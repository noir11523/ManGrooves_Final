// DOM unit tests: actual forms and events, with network/map adapters stubbed.
// These do not replace visual browser/device testing.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {build} from 'esbuild';
import {JSDOM} from 'jsdom';
import {indexedDB} from 'fake-indexeddb';
globalThis.indexedDB = indexedDB;
import {classify, updateCriterion} from '../../functions/api/core/domain.js';
import catalog from '../../functions/api/data/observation-photos.json' with {type:'json'};
import {photoCredits,withPhotoCredits} from '../../functions/api/core/reference-photos.js';

const reference = JSON.parse(await readFile(new URL('../../data/reference.json', import.meta.url), 'utf8'));
const dom = new JSDOM('<main id="page"></main><div id="toast" hidden></div><dialog id="confirm"><h2 id="confirm-title"></h2><p id="confirm-body"></p></dialog>', {url: 'http://localhost:5002/#submit'});
for (const key of ['window', 'document', 'location', 'navigator', 'FormData', 'File', 'FileReader', 'Event']) {
  Object.defineProperty(globalThis, key, {value: dom.window[key], configurable: true});
}
dom.window.HTMLElement.prototype.scrollIntoView = () => {};
dom.window.HTMLDialogElement.prototype.showModal = function () { this.open = true; };
dom.window.HTMLDialogElement.prototype.close = function () { this.open = false; this.dispatchEvent(new Event('close')); };
URL.createObjectURL = () => 'blob:test-photo'; URL.revokeObjectURL = () => {};
let gps, gpsFail;
Object.defineProperty(navigator, 'geolocation', {value: {watchPosition(callback,error) { gps = callback; gpsFail=error; return 1; }, clearWatch() {}}});
const bundle = await build({stdin: {contents: 'export * from "./report-form.js"; export * from "./admin.js"; export * from "./auth-pages.js"; export * from "./account-admin.js"; export {toast} from "./ui.js";',
  resolveDir: fileURLToPath(new URL('../src/', import.meta.url))}, bundle: true, write: false, format: 'esm', platform: 'node', plugins: [{name: 'adapters', setup(b) {
    b.onResolve({filter: /client\.js$/}, () => ({path: 'client', namespace: 'stub'}));
    b.onResolve({filter: /^leaflet$/}, () => ({path: 'map', namespace: 'stub'}));
    b.onLoad({filter: /.*/, namespace: 'stub'}, ({path}) => ({contents: path === 'client'
      ? 'export const api = (...args) => globalThis.testApi(...args); export const login = (...args) => globalThis.testLogin(...args); export const friendly = e => e.message; export const apiUrl = p => p;'
      : `const layer = (point) => ({point,events:{},on(k,f){this.events[k]=f;return this},getLatLng(){return {lat:this.point[0],lng:this.point[1]}},addTo(){return this},setLatLng(p){this.point=p;return this},setRadius(){return this},getBounds(){return []},remove(){}});
         export default {map(){return globalThis.testMap={events:{},distance(a,b){return Math.hypot(a[0]-b[0],a[1]-b[1])*111000},getCenter(){return {lat:10.29,lng:123.89}},setView(point){this.center=point;return this},fitBounds(){return this},remove(){},on(k,f){this.events[k]=f;return this}}},
         tileLayer:layer,circle:layer,marker:p=>(globalThis.testMarker=layer(p)),divIcon:o=>o};` }));
  }}]});
const ui = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`);
const $ = selector => document.querySelector(selector);
const tick = () => new Promise(resolve => setImmediate(resolve));
const change = element => element.dispatchEvent(new Event('change', {bubbles: true}));
const set = (name, value) => { const input = $(`[name=${name}]`); input.value = value; change(input); };
const submit = () => { const form = $('#report-form'); return form.onsubmit({preventDefault() {}, submitter: $('#next')}); };
const closeConfirm = answer => { const dialog = $('#confirm'); dialog.returnValue = answer; dialog.open = false; dialog.dispatchEvent(new Event('close')); };

test('species editor uses local-first names and deletion requires confirmation, preserves errors and refreshes',async()=>{
  let species=[{...reference.species[0]}],fail=false;const writes=[];
  globalThis.testApi=async(path,{body}={})=>{
    if(body){writes.push(body);if(fail)throw new Error('Please try again.');species=[];return {message:'Species deleted. Existing reports are kept.'};}
    return {species};
  };
  await ui.adminPage($('#page'),'species',{});$('.edit-item').click();
  assert.deepEqual([...$('#admin-editor').querySelectorAll('input')].slice(0,3).map(i=>i.name),['local_name','common_name','scientific_name']);
  $('[name=local_name]').value='Unsaved local name';
  let deleting=$('.delete-item').onclick();await tick();
  assert.match($('#confirm-body').textContent,/Existing reports are kept/);
  closeConfirm('cancel');await deleting;assert.equal(writes.length,0);
  assert.equal($('#admin-editor').open,true);assert.equal($('[name=local_name]').value,'Unsaved local name');
  fail=true;deleting=$('.delete-item').onclick();await tick();closeConfirm('confirm');await deleting;
  assert.match($('#admin-editor .error').textContent,/try again/);assert.equal($('#admin-editor').open,true);
  fail=false;deleting=$('.delete-item').onclick();await tick();closeConfirm('confirm');await deleting;
  assert.deepEqual(writes.at(-1),{id:reference.species[0].id,action:'delete'});
  assert.equal($('.edit-item'),null);$('#add').click();assert.equal($('.delete-item'),null);
  $('#admin-editor').close();
});

test('compact photos reject renamed copies and unknown counts require a saved site',async()=>{
 globalThis.testApi=async path=>path==='report-form.php'?{criteria:[],clusters:[{id:10,name:'Nursery',sitio_name:'Boardwalk',center_lat:10.2833,center_lng:123.8833}],location:{}}:{places:[]};
 ui.reportDraft.reset();const dispose=await ui.reportWizard($('#page'),{},{id:'photo-ui-'+Date.now()});
 const waitFor=async check=>{for(let i=0;i<100&&!check();i++)await new Promise(r=>setTimeout(r,10));assert.ok(check());};
 const choose=(name,files)=>{const input=$(name);Object.defineProperty(input,'files',{configurable:true,value:files});change(input);};
 const photo=(bytes,name)=>new File([bytes],name,{type:'image/jpeg'});
 try{
  assert.equal($('#extra-photo-menu'),null);let galleryOpened=false;$('#extra-photos').click=()=>galleryOpened=true;$('#add-photos').click();assert.equal(galleryOpened,true);assert.equal($('#extra-camera'),null);
  choose('[name=photo]',[photo('overview contents','one.jpg')]);await waitFor(()=>ui.reportDraft.photo);
  choose('[name=closeup_photo]',[photo('overview contents','renamed.jpg')]);await waitFor(()=>$('#report-form .error').textContent.includes('already added'));
  assert.equal(ui.reportDraft.closeupPhoto,null);
  choose('[name=closeup_photo]',[photo('close-up contents','two.jpg')]);await waitFor(()=>ui.reportDraft.closeupPhoto);
  assert.equal($('#report-form .error').textContent,'');
  choose('#extra-photos',[photo('close-up contents','extra.jpg')]);await waitFor(()=>$('#report-form .error').textContent.includes('already added'));
  assert.equal(ui.reportDraft.extraPhotos.length,0);
  assert.equal($('#count-hint').hidden,true);$('#count-unknown').click();
  assert.equal($('#count-hint').hidden,false);assert.match($('#count-hint').textContent,/Choose a site/);
  assert.equal($('[name=observed_alive_count]').disabled,true);await submit();assert.equal(ui.reportDraft.step,0);
  set('cluster_id','10');await tick();assert.equal($('#count-hint').textContent,'Count saved as unknown.');
  await submit();assert.equal(ui.reportDraft.step,1);
 }finally{dispose();ui.reportDraft.reset();}
});

test('observation choices select in one tap without a guide or enlarge control',async()=>{
 globalThis.testApi=async()=>({criteria:reference.criteria,clusters:[],location:{},traits:{root_type:[],leaf_shape:[],bark_texture:[]}});
 ui.reportDraft.reset();Object.assign(ui.reportDraft,{dirty:true,step:2,owner:undefined});
 const animalOption=reference.criteria.find(c=>c.code==='bio_indicators').options[0];
 const noAnimalsOption=reference.criteria.find(c=>c.code==='negative_signs').options.find(o=>o.code==='no_animals');
 ui.reportDraft.observations={bio_indicators:[animalOption.id],negative_signs:[noAnimalsOption.id]};
 const dispose=await ui.reportWizard($('#page'),{});
 try{
  assert.equal($('.guide'),null);assert.equal($('.choice-preview'),null);
  assert.deepEqual(ui.reportDraft.observations.bio_indicators,[animalOption.id]);
  assert.deepEqual(ui.reportDraft.observations.negative_signs,[]);
  const choice=$('.choice'),input=choice.querySelector('input');choice.querySelector('span').click();
  assert.equal(input.checked,true);assert.equal($('dialog[open]'),null);
  assert.ok(Object.values(ui.reportDraft.observations).some(ids=>ids.includes(Number(input.value))));
  choice.querySelector('.choice-picture').click();assert.ok($('.observation-preview').open);
  assert.equal($('.observation-preview h2').textContent,choice.querySelector('span').textContent);
  $('.observation-preview').close();assert.equal($('.observation-preview'),null);
  const animal=$('[name=obs_bio_indicators]');const none=$('[name=obs_negative_signs][data-code=no_animals]');
  none.checked=true;change(none);animal.checked=true;change(animal);assert.equal(none.checked,false);
  const mosquitoes=$('[name=obs_negative_signs][data-code=mosquitoes]');mosquitoes.checked=true;change(mosquitoes);assert.equal(animal.checked,true);
 }finally{dispose();ui.reportDraft.reset();}
});

test('individual photos, credits and text-only answers preview and select without losing trait deselection',async()=>{
 const traits=Object.fromEntries(Object.entries(catalog.traits).map(([key,values])=>[key,Object.keys(values)]));
 globalThis.testApi=async()=>({criteria:reference.criteria.map(withPhotoCredits),traits,trait_images:catalog.traits,photo_credits:photoCredits,clusters:[],location:{}});
 ui.reportDraft.reset();Object.assign(ui.reportDraft,{dirty:true,step:2,owner:undefined});
 const dispose=await ui.reportWizard($('#page'),{});
 try{
  const choice=$('.choice'), input=choice.querySelector('input'),preview=choice.querySelector('.choice-picture');
  assert.match(preview.querySelector('img').src,/observations\/v1-green-leaf\.jpg/);
  assert.equal(preview.querySelector('img').loading,'lazy');
  assert.ok(choice.querySelector('.photo-credit a'));
  assert.ok([...choice.children].indexOf(input)>[...choice.children].indexOf(choice.querySelector('span')));
  preview.click();assert.equal(input.checked,false);
  assert.equal($('.observation-preview .actions button:last-child').textContent,'Select');
  $('.observation-preview .actions button:last-child').click();assert.equal(input.checked,true);
  preview.click();assert.equal($('.observation-preview .actions button:last-child').textContent,'Deselect');
  $('.observation-preview .actions button:last-child').click();assert.equal(input.checked,false);
  assert.deepEqual(ui.reportDraft.observations.leaf_color,[]);
  input.click();assert.equal(input.checked,true);
  input.click();assert.equal(input.checked,false);
  assert.deepEqual(ui.reportDraft.observations.leaf_color,[]);
  const special=$('[data-code=unknown]').closest('.choice');
  assert.equal(special.querySelector('img'),null);assert.ok(special.classList.contains('choice-text-only'));
  const trait=$('[name=root_type]'),card=trait.closest('.choice');
  assert.match(card.querySelector('.photo-credit').textContent,/AI illustration/);
  card.querySelector('.choice-picture').click();$('.observation-preview .actions button:last-child').click();
  assert.equal(ui.reportDraft.fields.root_type,trait.value);
  card.querySelector('.choice-picture').click();$('.observation-preview .actions button:last-child').click();
  assert.equal(ui.reportDraft.fields.root_type,'');
  trait.click();assert.equal(ui.reportDraft.fields.root_type,trait.value);
  trait.click();assert.equal(ui.reportDraft.fields.root_type,'');
  const broken=$('[name=obs_pests]').closest('.choice');broken.querySelector('img').dispatchEvent(new Event('error'));
  assert.equal(broken.querySelector('.choice-picture'),null);assert.match(broken.textContent,/Photo unavailable/);
  broken.querySelector('input').click();assert.equal(broken.querySelector('input').checked,true);
 }finally{dispose();ui.reportDraft.reset();}
});

test('saved sites never auto-link observations; only an explicit request starts a follow-up',async()=>{
 const clusters=[{id:10,name:'Coastal nursery',sitio_name:'Nursery boardwalk',center_lat:10.2833,center_lng:123.8833}];
 const traits=Object.fromEntries(['root_type','leaf_shape','bark_texture'].map(k=>[k,[reference.species[0][k]]]));
 globalThis.testApi=async(path,{query}={})=>{
  if(path==='report-form.php')return {criteria:reference.criteria,clusters,traits,location:{}};
  if(path==='previous-reports.php')return {reports:[{id:9,report_code:'Report #1',health:'Healthy'}]};
  return {places:[]};
 };
 const owner='site-test-'+Date.now();ui.reportDraft.reset();let dispose=await ui.reportWizard($('#page'),{}, {id:owner});
 try {
  assert.equal($('[name=photo]').hasAttribute('capture'),false);assert.equal($('#camera-photo').getAttribute('capture'),'environment');
  let camera=0,gallery=0;Object.defineProperty(navigator,'mediaDevices',{configurable:true,value:{getUserMedia:async()=>{camera++;throw Object.assign(new Error(),{name:'NotFoundError'});}}});$('[name=photo]').click=()=>gallery++;
  $('#take-photo').click();$('#choose-photo').click();assert.equal(camera,1);assert.equal(gallery,1);await tick();
  set('cluster_id','10');await tick();assert.equal($('[name=sitio_name]').value,'Nursery boardwalk');
  assert.equal(ui.reportDraft.fields.latitude,10.2833);assert.equal(ui.reportDraft.followup,false);assert.equal(ui.reportDraft.fields.parent_report_id,'');assert.equal($('#followup-options').hidden,true);
 } finally {dispose();ui.reportDraft.reset();}
 dispose=await ui.reportWizard($('#page'),{parent:'9',cluster:'10'},{id:owner+'-followup'});
 try {
  await tick();assert.equal(ui.reportDraft.followup,true);assert.equal(ui.reportDraft.fields.parent_report_id,'9');
  assert.equal($('[name=cluster_id]').disabled,true);assert.equal(ui.reportDraft.photo,null);assert.equal(ui.reportDraft.closeupPhoto,null);
 } finally {dispose();ui.reportDraft.reset();clearTimeout(ui.toast.timer);}
});

test('follow-up retry preserves the requested parent, including an unavailable request',async()=>{
 let attempts=0, available=false;
 globalThis.testApi=async path=>{
  if(path==='report-form.php')return {criteria:[],clusters:[{id:10,name:'Nursery',sitio_name:'Boardwalk',center_lat:10.2833,center_lng:123.8833}],location:{}};
  if(path==='previous-reports.php'){
   if(++attempts===1)throw new Error('Connection interrupted');
   return {reports:available?[{id:9,report_code:'Report #1',health:'Healthy'}]:[{id:12,report_code:'Report #2',health:'Healthy'}]};
  }
  return {places:[]};
 };
 ui.reportDraft.reset();let dispose=await ui.reportWizard($('#page'),{parent:'9',cluster:'10'},{id:'retry-'+Date.now()});
 try{
  assert.equal(String(ui.reportDraft.fields.parent_report_id),'9');assert.equal($('#next').disabled,true);
  $('#followup-options button').click();await tick();
  assert.equal(attempts,2);assert.equal(String(ui.reportDraft.fields.parent_report_id),'9');
  assert.equal($('#next').disabled,true);assert.match($('#followup-options').textContent,/no longer available/);
  available=true;$('#followup-options button').click();await tick();
  assert.equal(attempts,3);assert.equal(String(ui.reportDraft.fields.parent_report_id),'9');
  assert.equal($('#next').disabled,false);assert.equal(ui.reportDraft.followup,true);
 }finally{dispose();ui.reportDraft.reset();}
});

test('follow-up pin cannot leave its site or lose its original report',async()=>{
 globalThis.testApi=async path=>path==='report-form.php'?{criteria:[],clusters:[{id:10,name:'Nursery',sitio_name:'Boardwalk',center_lat:10.2833,center_lng:123.8833,radius_meters:100}],location:{}}:{places:[]};
 ui.reportDraft.reset();Object.assign(ui.reportDraft,{dirty:true,step:1,owner:undefined,followup:true,fields:{cluster_id:'10',parent_report_id:'9',sitio_name:'Boardwalk',latitude:10.2833,longitude:123.8833,location_source:'manual'}});
 const dispose=await ui.reportWizard($('#page'),{});
 try{
  globalThis.testMarker.setLatLng([10.30,123.90]);globalThis.testMarker.events.dragend();
  assert.equal(ui.reportDraft.fields.cluster_id,'10');assert.equal(ui.reportDraft.fields.parent_report_id,'9');
  assert.equal(ui.reportDraft.fields.latitude,10.2833);assert.equal(ui.reportDraft.fields.sitio_name,'Boardwalk');
  assert.deepEqual(globalThis.testMarker.point,[10.2833,123.8833]);assert.match($('#location-status').textContent,/follow-up.*site/i);
 }finally{dispose();ui.reportDraft.reset();}
});

test('an unavailable follow-up site keeps its parent and blocks submission',async()=>{
 globalThis.testApi=async()=>({criteria:[],clusters:[],location:{}});
 ui.reportDraft.reset();const dispose=await ui.reportWizard($('#page'),{parent:'9',cluster:'10'},{id:'archived-'+Date.now()});
 try{
  assert.equal(ui.reportDraft.fields.parent_report_id,'9');assert.equal(ui.reportDraft.fields.cluster_id,'10');
  assert.equal($('[name=cluster_id]').disabled,true);assert.equal($('#next').disabled,true);
  assert.match($('#followup-options').textContent,/site is unavailable/);
 }finally{dispose();ui.reportDraft.reset();}
});

test('dragged new-report pin refreshes the name, clears a distant site and ignores an older reverse lookup',async()=>{
 let lookups=[];
 globalThis.testApi=async path=>path==='report-form.php'?{criteria:[],clusters:[{id:10,center_lat:10.2833,center_lng:123.8833,radius_meters:100}],location:{}}:new Promise(resolve=>lookups.push(resolve));
 ui.reportDraft.reset();Object.assign(ui.reportDraft,{dirty:true,step:1,owner:undefined,fields:{cluster_id:'10',sitio_name:'Old site',latitude:10.2833,longitude:123.8833,location_source:'manual'}});
 const dispose=await ui.reportWizard($('#page'),{});
 try {
  globalThis.testMarker.setLatLng([10.29,123.89]);globalThis.testMarker.events.dragend();
  assert.equal(ui.reportDraft.fields.cluster_id,'');assert.equal(ui.reportDraft.followup,false);assert.match(ui.reportDraft.fields.sitio_name,/Pinned location/);
  globalThis.testMarker.setLatLng([10.30,123.90]);globalThis.testMarker.events.dragend();
  lookups[1]({places:[{label:'New shoreline'}]});await tick();assert.equal(ui.reportDraft.fields.sitio_name,'New shoreline');
  lookups[0]({places:[{label:'Older shoreline'}]});await tick();assert.equal(ui.reportDraft.fields.sitio_name,'New shoreline');
 }finally{dispose();ui.reportDraft.reset();}
});

test('site catalog filters and saves through the admin editor without leaving Sites',async()=>{
 const sites=[{id:10,name:'Coastal nursery',sitio_name:'Boardwalk',barangay_name:'Inayawan',barangay_id:1,center_lat:10.2833,center_lng:123.8833,radius_meters:100,active:1,version:'v1'},{id:11,name:'Old site',active:0,center_lat:10.28,center_lng:123.88}];let saved;
 globalThis.testApi=async(path,{body}={})=>{assert.equal(path,'sites.php');if(body){saved=body;return {message:'Saved'};}return {sites,barangays:reference.barangays};};
 const dispose=await ui.adminPage($('#page'),'species',{tab:'sites'});
 try {
  const filters=$('.list-filters');filters.querySelector('[name=active]').value='1';filters.dispatchEvent(new Event('submit',{cancelable:true}));
  assert.equal(document.querySelectorAll('tbody tr:not([hidden])').length,1);
  $('.edit-site').click();const dialog=$('#admin-editor');dialog.querySelector('[name=name]').value='Renamed nursery';
  const form=dialog.querySelector('form');await form.onsubmit({preventDefault(){},target:form,submitter:form.querySelector('[type=submit]')});await tick();
  assert.equal(saved.name,'Renamed nursery');assert.equal(saved.version,'v1');assert.ok($('#add-site'));assert.equal($('#add'),null);
 }finally{dispose?.();clearTimeout(ui.toast.timer);}
});

test('location buttons support automatic capture, approximate fallback, retry and keyboard manual selection',async()=>{
  const originalFetch=globalThis.fetch;
  globalThis.fetch=async()=>({ok:true,json:async()=>({latitude:10.3,longitude:123.9,accuracy:20})});
  globalThis.testApi=async path=>path==='report-form.php'
    ? {criteria:reference.criteria,clusters:[],species:[],location:{barangay:reference.barangays[0]}}
    : {places:[]};
  ui.reportDraft.reset();Object.assign(ui.reportDraft,{dirty:true,step:1,owner:undefined,fields:{location_source:''}});
  const dispose=await ui.reportWizard($('#page'),{});
  try {
    assert.equal($('#gps').textContent,'Finding location…');assert.equal($('#gps').disabled,true);
    assert.equal($('#manual-pin').disabled,false);
    gpsFail({code:1});await tick();
    assert.equal($('#gps').textContent,'Try again');assert.equal($('#gps').disabled,false);
    assert.equal(ui.reportDraft.fields.location_source,'');assert.match($('#location-status').textContent,/Approximate area only/);
    $('#gps').click();assert.equal($('#gps').disabled,true);
    gps({timestamp:Date.now(),coords:{latitude:10.28,longitude:123.88,accuracy:9}});
    assert.equal($('#gps').disabled,false);assert.equal($('#gps').textContent,'Use my location');
    assert.equal(ui.reportDraft.fields.location_source,'gps');
    $('#gps').click();const late=gps;
    $('#manual-pin').click();assert.equal(document.activeElement,$('#location-map'));
    const zoomButton=document.createElement('button');$('#location-map').append(zoomButton);
    zoomButton.dispatchEvent(new window.KeyboardEvent('keydown',{key:'Enter',bubbles:true,cancelable:true}));
    assert.equal(ui.reportDraft.fields.location_source,'gps');
    $('#location-map').dispatchEvent(new window.KeyboardEvent('keydown',{key:'Enter',bubbles:true,cancelable:true}));
    late({timestamp:Date.now(),coords:{latitude:1,longitude:1,accuracy:1}});
    assert.equal(ui.reportDraft.fields.location_source,'manual');assert.equal(Number(ui.reportDraft.fields.latitude),10.29);
    $('#gps').click();gpsFail({code:1});await tick();
    assert.equal($('#gps').textContent,'Try again');assert.match($('#location-status').textContent,/selected pin is unchanged/);
    assert.equal(ui.reportDraft.fields.location_source,'manual');assert.equal(Number(ui.reportDraft.fields.latitude),10.29);
  } finally {dispose();globalThis.fetch=originalFetch;ui.reportDraft.reset();}
});

test('mobile report location omits technical copy and never calls the IP provider',async()=>{
  const originalFetch=globalThis.fetch,agent=Object.getOwnPropertyDescriptor(navigator,'userAgent');let lookups=0;
  Object.defineProperty(navigator,'userAgent',{configurable:true,value:'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)'});
  globalThis.fetch=async()=>{lookups++;throw new Error('IP must not be called on mobile');};
  globalThis.testApi=async path=>path==='report-form.php'?{criteria:reference.criteria,clusters:[],species:[],location:{}}:{places:[]};
  ui.reportDraft.reset();Object.assign(ui.reportDraft,{dirty:true,step:1,owner:undefined,fields:{location_source:''}});
  const dispose=await ui.reportWizard($('#page'),{});
  try {
    assert.doesNotMatch($('#step-body').textContent,/GeoJS|We try your device/);
    gpsFail({code:1});await tick();assert.equal(lookups,0);
    assert.equal($('#gps').textContent,'Try again');assert.equal($('#manual-pin').disabled,false);
    assert.equal(ui.reportDraft.fields.location_source,'');
    $('#gps').click();gps({timestamp:Date.now(),coords:{latitude:10.28,longitude:123.88,accuracy:8}});
    assert.equal(ui.reportDraft.fields.location_source,'gps');assert.equal(lookups,0);
  } finally {
    dispose();globalThis.fetch=originalFetch;ui.reportDraft.reset();
    if(agent)Object.defineProperty(navigator,'userAgent',agent);else delete navigator.userAgent;
  }
});

test('user search resets the page, keeps filters in pagination, and routes pending accounts to approval',async()=>{
  globalThis.testApi=async(path,{query})=>{
    assert.equal(path,'users.php');assert.equal(query.role,'expert');
    return {page:2,pages:3,total:43,items:[{id:88,full_name:'Pending Reviewer',email:'pending@example.test',role:'expert',status:'pending_approval'}]};
  };
  await ui.adminPage($('#page'),'users',{page:'2',q:'coast',role:'expert'});
  assert.match($('.pagination a').href,/q=coast/);assert.match($('.pagination a').href,/role=expert/);
  assert.equal($('.user-form [name=role]'),null);assert.equal($('.user-form button'),null);
  assert.equal($('.admin-table a').getAttribute('href'),'#expert-applications');
  const form=$('.list-filters');form.querySelector('[name=q]').value='  New name  ';
  form.dispatchEvent(new Event('submit',{cancelable:true}));
  assert.equal(location.hash,'#users?q=New+name&role=expert');
  $('.clear-filters').click();assert.equal(location.hash,'#users');
});

test('staff creation is available in Users and requests credentials for expert accounts',async()=>{
  let sent;
  globalThis.testApi=async(path,{body}={})=>{
    if(body){sent=body;return {message:'Created.'};}
    return {items:[],total:0,page:1,pages:1,barangays:[{id:1,name:'Inayawan'}]};
  };
  await ui.adminPage($('#page'),'users',{});$('#add').click();
  const dialog=$('#admin-editor'),form=dialog.querySelector('form');
  assert.equal(dialog.open,true);assert.equal(form.elements.expert_id_code.required,true);
  form.elements.role.value='system_admin';change(form.elements.role);
  assert.equal(form.elements.expert_id_code.required,false);assert.equal($('#staff-credential').hidden,true);
  for(const [key,value] of Object.entries({first_name:'Admin',last_name:'Staff',email:'staff@example.test',barangay_id:'1',password:'initialpass12',password_confirmation:'initialpass12'}))form.elements[key].value=value;
  await form.onsubmit({preventDefault(){},target:form,submitter:form.querySelector('button[type=submit]')});
  assert.equal(sent.action,'create_staff');assert.equal(sent.role,'system_admin');assert.equal(sent.barangay_id,'1');
});

test('typed certificate signer preview reflects edits and requires save before PDF preview',async()=>{
  globalThis.testApi=async()=>({settings:{signer_name:'Saved Name',signer_title:'Coordinator',has_signature:false}});
  await ui.certificateSettingsPage($('#page'));
  assert.equal($('#preview-certificate').disabled,false);assert.equal($('#signature-preview').hidden,true);
  const input=$('[name=signer_name]');input.value='Updated Name';input.dispatchEvent(new Event('input',{bubbles:true}));
  assert.equal($('#signer-preview-name').textContent,'Updated Name');assert.equal($('#preview-certificate').disabled,true);
  assert.equal($('#typed-signature').hidden,false);
});

test('regenerated certificate QR stays valid until its own expiry and can be hidden',async t=>{
  t.mock.timers.enable({apis:['Date','setTimeout'],now:1700000000000});
  dom.window.HTMLCanvasElement.prototype.getContext=()=>({fillRect(){}});
  let duration=100;
  globalThis.testApi=async()=>({url:'https://example.test/certificate',qr:{size:1,data:[1]},expires_unix_ms:Date.now()+duration});
  $('#page').innerHTML='<article><button data-id="1">Show QR</button></article>';
  const button=$('#page button');let action=ui.certificateQr(button);closeConfirm('confirm');await action;
  assert.ok($('.certificate-share canvas'));
  t.mock.timers.tick(50);duration=200;
  action=ui.certificateQr(button);closeConfirm('confirm');await action;
  t.mock.timers.tick(50);assert.ok($('.certificate-share canvas'));
  t.mock.timers.tick(150);assert.equal($('.certificate-share canvas'),null);assert.match($('.qr-expiry').textContent,/expired/);
  $('.hide-qr').click();assert.equal($('.certificate-share'),null);
});

test('catalog filters preserve an unfinished editor and clear restores hidden records',async()=>{
  globalThis.testApi=async()=>({species:[{id:1,scientific_name:'Avicennia marina',common_name:'Grey mangrove',local_name:'Bungalon',active:1},{id:2,scientific_name:'Rhizophora',common_name:'Red mangrove',active:0}]});
  await ui.adminPage($('#page'),'species',{});
  $('.edit-item').click();$('[name=scientific_name]').value='Unsaved species';
  const form=$('.list-filters');form.querySelector('[name=q]').value='RED';form.querySelector('[name=active]').value='0';form.dispatchEvent(new Event('submit',{cancelable:true}));
  assert.equal($('.edit-item[data-id="1"]').closest('tr').hidden,true);assert.equal($('.edit-item[data-id="2"]').closest('tr').hidden,false);
  assert.equal($('[name=scientific_name]').value,'Unsaved species');assert.match($('.result-count').textContent,/1 result/);
  form.querySelector('[name=q]').value='missing';form.dispatchEvent(new Event('submit',{cancelable:true}));assert.equal($('.filter-empty').hidden,false);
  $('.clear-filters').click();assert.equal($('.filter-empty').hidden,true);assert.equal($('.edit-item').closest('tr').hidden,false);
  assert.equal($('[name=scientific_name]').value,'Unsaved species');
});

test('report form hides follow-ups, keeps edits, distinguishes approximate GPS, and confirms before sending', async () => {
  const submissions = [];
  globalThis.testApi = async (path, {body} = {}) => {
    if (path === 'report-form.php') return {criteria: reference.criteria, clusters: [], species: reference.species,
      traits: Object.fromEntries(['root_type', 'leaf_shape', 'bark_texture'].map(k => [k, [reference.species[0][k]]])), location: {barangay: reference.barangays[0]}};
    if (path === 'report-preview.php') {
      assert.deepEqual(body.checklist_versions, Object.fromEntries(reference.criteria.map(c => [c.id, c.version])));
      return {classification: classify(reference.criteria, body.observations), species: {best: reference.species[0]}, checklist_versions: body.checklist_versions};
    }
    if (path === 'submit-report.php') { submissions.push(JSON.parse(body.get('payload'))); return {report: {report_id: 123}, message: 'Report submitted.'}; }
    throw new Error(`Unexpected API call: ${path}`);
  };
  ui.reportDraft.reset();
  const dispose = await ui.reportWizard($('#page'), {});
  try {
    assert.equal($('#followup-options').hidden, true);
    const photo = new File(['test bytes'], 'field.jpg', {type: 'image/jpeg'});
    Object.defineProperty($('[name=photo]'), 'files', {value: [photo]}); change($('[name=photo]'));Object.defineProperty($('[name=closeup_photo]'),'files',{value:[new File(['different close-up'],'closeup.jpg',{type:'image/jpeg'})]});change($('[name=closeup_photo]'));
    set('sitio_name', 'First location'); set('observed_alive_count', '12');

    await submit(); assert.equal(ui.reportDraft.step, 1);
    assert.equal($('#gps').disabled,true);assert.ok($('#manual-pin'));assert.equal($('#approximate'),null);assert.equal(typeof gps,'function');
    gps({timestamp:Date.now(),coords: {latitude: 10.2833, longitude: 123.8833, accuracy: 180}});
    assert.equal(ui.reportDraft.fields.location_source, '');
    await submit(); assert.equal(ui.reportDraft.step, 1);
    assert.match($('.error').textContent, /tap the map/);
    globalThis.testMap.events.click({latlng: {lat: 10.2833, lng: 123.8833}});
    assert.equal(ui.reportDraft.fields.location_source, 'manual');
    await submit(); assert.equal(ui.reportDraft.step, 2);
    for(const k of ['root_type','leaf_shape','bark_texture'])$(`[name=${k}]`).click();
    for (const c of reference.criteria.filter(c => c.selection_mode === 'single')) {
      $(`[name=obs_${c.code}][value="${c.options[0].id}"]`).click();
    }
    const context = reference.criteria.find(c => c.code === 'leaf_condition');
    $(`[name=obs_leaf_condition][value="${context.options.find(o => o.code === 'all_of_the_above').id}"]`).click();
    const multi = reference.criteria.find(c => c.selection_mode === 'multiple');
    $(`[name=obs_${multi.code}][value="${multi.options[0].id}"]`).click();
    const none = multi.options.find(o => o.code === 'none_of_the_above');
    $(`[name=obs_${multi.code}][value="${none.id}"]`).click();
    assert.deepEqual(ui.reportDraft.observations[multi.code], [none.id]);
    await submit(); assert.equal(ui.reportDraft.step, 3);
    assert.match($('#step-body').textContent, /6 \/ 6 health points/);
    assert.equal(document.querySelectorAll('.edit').length, 3);
    $('#field-confirm').click(); assert.ok(ui.reportDraft.preview);
    const cancelled = submit(); await tick(); assert.equal($('#confirm').open, true);
    assert.equal(submissions.length, 0); closeConfirm('cancel'); await cancelled;
    assert.equal(submissions.length, 0);
    $('.edit[data-step="0"]').click(); await tick();
    assert.equal(ui.reportDraft.photo, photo); set('sitio_name', 'Updated location');
    await submit(); await submit(); await submit();
    assert.match($('#step-body').textContent, /Updated location/);
    $('#field-confirm').click(); const final = submit(); await tick(); closeConfirm('confirm'); await final;
    assert.equal(submissions.length, 1); assert.equal(submissions[0].sitio_name, 'Updated location');
    assert.equal(submissions[0].field_confirmation, '1'); assert.equal(location.hash, '#report/123');
    assert.equal(ui.reportDraft.dirty, false);
  } finally { dispose(); clearTimeout(ui.toast.timer); }
});

test('report draft restores fields, photo, checklist and step after reload, isolates accounts and clears only on success', async () => {
  let failSubmit = true;
  globalThis.testApi = async (path, {body} = {}) => {
    if (path === 'report-form.php') return {criteria: reference.criteria, clusters: [], species: reference.species,
      traits: Object.fromEntries(['root_type','leaf_shape','bark_texture'].map(k => [k,[reference.species[0][k]]])), location:{barangay:reference.barangays[0]}};
    if (path === 'places.php') return {places:[]};
    if (path === 'report-preview.php') return {classification:classify(reference.criteria,body.observations),checklist_versions:body.checklist_versions};
    if (path === 'submit-report.php') { if (failSubmit) throw new Error('Connection interrupted. Try again.'); return {report:{report_id:456},message:'Report received.'}; }
    throw new Error(path);
  };
  window.localStorage.clear(); ui.reportDraft.reset();
  let dispose = await ui.reportWizard($('#page'), {}, {id:'draft-a'});
  try {
    assert.equal($('#discard-draft'),null);assert.equal($('#draft-status'),null);assert.equal($('#draft-notice').hidden,true);
    const photo = new File(['saved photo bytes'],'saved.jpg',{type:'image/jpeg'});
    Object.defineProperty($('[name=photo]'),'files',{value:[photo]}); change($('[name=photo]'));Object.defineProperty($('[name=closeup_photo]'),'files',{value:[new File(['different close-up'],'closeup.jpg',{type:'image/jpeg'})]});change($('[name=closeup_photo]'));
    set('sitio_name','Saved coastal site');set('observed_alive_count','16');set('guardian_remarks','Remember this visit');

    await submit();
    assert.equal($('#gps').disabled,true); const oldGps = gps;
    gps({timestamp:Date.now()-60000,coords:{latitude:10.28,longitude:123.88,accuracy:2}});
    assert.equal(ui.reportDraft.fields.location_source,'');
    gps({timestamp:Date.now(),coords:{latitude:10.28,longitude:123.88,accuracy:12}});
    assert.equal(ui.reportDraft.fields.location_source,'gps');
    globalThis.testMap.events.click({latlng:{lat:10.2833,lng:123.8833}});
    oldGps({timestamp:Date.now(),coords:{latitude:10.25,longitude:123.85,accuracy:1}});
    assert.equal(ui.reportDraft.fields.location_source,'manual');
    assert.equal(Number(ui.reportDraft.fields.latitude),10.2833);
    await submit();
    for(const k of ['root_type','leaf_shape','bark_texture'])$(`[name=${k}]`).click();
    for(const c of reference.criteria.filter(c=>c.selection_mode==='single'))$(`[name=obs_${c.code}][value="${c.options[0].id}"]`).click();
    await ui.reportDraft.flush(); dispose(); ui.reportDraft.reset();
    dispose = await ui.reportWizard($('#page'),{}, {id:'draft-a'});
    assert.equal(ui.reportDraft.step,2);assert.equal(ui.reportDraft.photo.name,'saved.jpg');assert.equal(ui.reportDraft.photo.size,17);
    assert.equal(ui.reportDraft.fields.guardian_remarks,'Remember this visit');
    assert.ok($('[name=obs_leaf_color]:checked'));
    dispose();ui.reportDraft.reset();
    dispose = await ui.reportWizard($('#page'),{}, {id:'draft-b'});
    assert.equal(ui.reportDraft.photo,null);assert.equal($('[name=sitio_name]').value,'');
    dispose();ui.reportDraft.reset();
    dispose = await ui.reportWizard($('#page'),{}, {id:'draft-a'});
    await submit();$('#field-confirm').click();let sending=submit();await tick();closeConfirm('confirm');await sending;
    assert.match($('.error').textContent,/interrupted/);assert.equal(ui.reportDraft.dirty,true);
    await ui.reportDraft.flush();dispose();ui.reportDraft.reset();
    dispose = await ui.reportWizard($('#page'),{}, {id:'draft-a'});
    assert.equal(ui.reportDraft.step,3);assert.equal($('#field-confirm').checked,false);
    assert.equal($('#draft-notice').hidden,true);assert.equal($('#confirm').open,false);
    failSubmit=false;$('#field-confirm').click();sending=submit();await tick();closeConfirm('confirm');await sending;
    assert.equal(location.hash,'#report/456');assert.equal(ui.reportDraft.dirty,false);
    dispose();ui.reportDraft.reset();dispose=await ui.reportWizard($('#page'),{}, {id:'draft-a'});
    assert.equal(ui.reportDraft.photo,null);assert.equal(ui.reportDraft.step,0);assert.equal($('[name=sitio_name]').value,'');
  } finally { dispose();ui.reportDraft.reset();window.localStorage.clear();clearTimeout(ui.toast.timer); }
});

test('details address selection becomes the next-step map pin and a restored draft keeps it', async () => {
  globalThis.testApi=async(path,{query}={})=>{
    if(path==='report-form.php')return {criteria:reference.criteria,clusters:[],species:reference.species,
      traits:Object.fromEntries(['root_type','leaf_shape','bark_texture'].map(k=>[k,[reference.species[0][k]]])),location:{barangay:reference.barangays[0]}};
    assert.equal(path,'places.php');assert.equal(query.q,'Pier');
    return {places:[{label:'Pier 3, Cebu City',latitude:10.3012345,longitude:123.9012345}]};
  };
  window.localStorage.clear();ui.reportDraft.reset();
  let dispose=await ui.reportWizard($('#page'),{}, {id:'place-user'});
  try {
    const input=$('[name=sitio_name]');input.value='Pier';input.dispatchEvent(new Event('input',{bubbles:true}));
    await new Promise(r=>setTimeout(r,750));await tick();
    assert.match($('#details-places').textContent,/Pier 3/);$('#details-places button').click();
    assert.equal(input.value,'Pier 3, Cebu City');assert.equal(ui.reportDraft.fields.location_source,'manual');
    const photo=new File(['photo'],'field.jpg',{type:'image/jpeg'});Object.defineProperty($('[name=photo]'),'files',{value:[photo]});change($('[name=photo]'));Object.defineProperty($('[name=closeup_photo]'),'files',{value:[new File(['different close-up'],'closeup.jpg',{type:'image/jpeg'})]});change($('[name=closeup_photo]'));
    set('observed_alive_count','12');
    await submit();assert.deepEqual(testMap.center,[10.3012345,123.9012345]);
    assert.equal($('#place-search').value,'Pier 3, Cebu City');
    assert.equal($('[name=latitude]').value,'10.3012345');assert.equal($('[name=longitude]').value,'123.9012345');
    await ui.reportDraft.flush();dispose();ui.reportDraft.reset();dispose=await ui.reportWizard($('#page'),{}, {id:'place-user'});
    assert.equal(ui.reportDraft.step,1);assert.deepEqual(testMap.center,[10.3012345,123.9012345]);
    assert.equal($('#place-search').value,'Pier 3, Cebu City');
    $('#previous').click();await tick();const edited=$('[name=sitio_name]');edited.value='Different landmark';edited.dispatchEvent(new Event('input',{bubbles:true}));
    assert.equal(ui.reportDraft.fields.location_source,'');assert.equal(ui.reportDraft.fields.latitude,'');
    // Leaving the step cancels delayed searches; a typed label alone is not a pin.
    await submit();assert.equal(ui.reportDraft.step,1);assert.equal($('#place-search').value,'Different landmark');await submit();assert.equal(ui.reportDraft.step,1);
    assert.match($('.error').textContent,/tap the map/);
  } finally {dispose();ui.reportDraft.reset();window.localStorage.clear();clearTimeout(ui.toast.timer);}
});

test('checklist live search covers choices and traits in report order without losing drafts', async () => {
  globalThis.testApi=async path=>path==='trait-images.php'
    ? {traits:{root_type:['Prop roots'],leaf_shape:['Elliptic'],bark_texture:['Rough bark']}}
    : {criteria:structuredClone(reference.criteria)};
  await ui.checklistPage($('#page'));
  const form=$('.list-filters'), search=form.querySelector('[name=q]');
  assert.ok(form.compareDocumentPosition($('#criteria')) & window.Node.DOCUMENT_POSITION_FOLLOWING);
  assert.ok($('#criteria').compareDocumentPosition($('#trait-editors')) & window.Node.DOCUMENT_POSITION_FOLLOWING);
  const first=$('.checklist-editor'); first.open=true;
  const label=first.querySelector('[name=label]');label.value='Emerald green';label.dispatchEvent(new Event('input',{bubbles:true}));
  const find=value=>{search.value=value;search.dispatchEvent(new Event('input',{bubbles:true}));};
  find('  EMERALD green  ');assert.equal(first.hidden,false);assert.equal(first.open,true);
  find('prop roots');assert.equal(first.hidden,true);assert.equal($('#trait-editors details').hidden,false);assert.equal($('#trait-editors details').open,true);
  find('nothing-matches');assert.equal($('.filter-empty').hidden,false);
  $('.clear-filters').click();assert.equal(first.hidden,false);assert.equal(first.open,true);assert.equal(label.value,'Emerald green');assert.equal($('#trait-editors details').open,false);
  assert.match($('.result-count').textContent,/10 categories/);
  const card=$('.trait-image-editor');assert.equal(card.children[0].tagName,'IMG');assert.equal(card.children[1].tagName,'STRONG');
});

test('checklist editor retains names while adding, undoing and deleting choices, and saving photos', async () => {
  const original = structuredClone(reference.criteria[0]); let saved;
  globalThis.testApi = async (path, {body} = {}) => {
    assert.equal(path, 'checklist.php');
    if (!body) return {criteria: [original]};
    const input = JSON.parse(body.get('payload'));
    assert.equal(body.get('option_image_-1').name, 'guide.jpg');
    let id = 9000; saved = updateCriterion(original, input, () => id++);
    return {criteria: [saved], message: 'Checklist saved.'};
  };
  await ui.checklistPage($('#page'));
  set('name', 'Leaf appearance');
  $('.add').click();
  const added = $('[data-option="-1"]');
  added.querySelector('[name=label]').value = 'Mixed colors'; added.querySelector('[name=points]').value = '1';
  const removable = original.options.find(o => o.points === 1);
  $(`[data-option="${removable.id}"] .remove`).click();
  $(`[data-option="${removable.id}"] .restore`).click();
  $(`[data-option="${removable.id}"] .remove`).click();
  assert.equal($('[name=name]').value, 'Leaf appearance');
  assert.equal($('[data-option="-1"] [name=label]').value, 'Mixed colors');
  const fileInput = $('[data-image=option_image_-1]');
  Object.defineProperty(fileInput, 'files', {value: [new File(['photo'], 'guide.jpg', {type: 'image/jpeg'})]}); change(fileInput);
  const form = $('#criteria form'); await form.onsubmit({preventDefault() {}, submitter: form.querySelector('[type=submit]')});
  assert.ok(saved); assert.equal(saved.name, 'Leaf appearance');
  assert.ok(saved.options.some(o => o.label === 'Mixed colors' && o.points === 1));
  assert.ok(saved.archived_options.some(o => o.id === removable.id));
  assert.equal(saved.options.some(o => o.id === removable.id), false);
  clearTimeout(ui.toast.timer);
});

const authLayout=html=>$('#page').innerHTML=`<div class="auth">${html}</div>`;
const submitAccount=()=>$('#registration').onsubmit({preventDefault(){},submitter:$('#registration-submit')});
function basicAccount(email='guardian@example.test'){
  for(const [key,value] of Object.entries({first_name:'Test',last_name:'Guardian',email,password:'password123',password_confirmation:'password123'}))set(key,value);
  $('[name=privacy_consent]').checked=true;
}
function authApi({expert=false,completeError,loginError}={}){
  const calls=[];
  globalThis.testLogin=async(...args)=>{calls.push({path:'login',args});if(loginError)throw new Error('Connection lost');};
  globalThis.testApi=async(path,options={})=>{
    calls.push({path,...options});
    if(path==='configuration.php')return {barangays:reference.barangays};
    if(path==='verify-email.php'){
      if(options.body.code!=='123456')throw new Error('Invalid code.');
      return {verification_token:'proof'};
    }
    if(path==='complete-registration.php'){
      assert.equal(options.token,'proof');assert.equal(options.body.first_name,'Test');
      if(completeError)throw completeError;
      return {pending_approval:expert};
    }
    return {};
  };
  return calls;
}
test('registration separates account, code, and profile; invalid code and missing details cannot finish',async()=>{
  const calls=authApi();await ui.registrationPage(authLayout);
  assert.equal($('[data-step="2"]').disabled,true);basicAccount();
  set('password_confirmation','different');await submitAccount();assert.match($('.error').textContent,/passwords do not match/);assert.equal(calls.length,1);
  set('password_confirmation','password123');await submitAccount();
  assert.equal(calls.at(-1).path,'register.php');assert.equal(calls.at(-1).body.stage,'account');assert.equal(calls.at(-1).body.barangay_id,undefined);
  assert.equal($('[data-step="1"]').hidden,false);assert.equal($('[data-step="0"]').disabled,true);
  assert.match($('#email-code-status').textContent,/6-digit.*guardian@example.test/);
  set('code','000000');await submitAccount();assert.equal($('.error').textContent,'Invalid code.');
  assert.equal(calls.some(c=>c.path==='complete-registration.php'),false);
  set('code','123456');await submitAccount();assert.equal($('[data-step="2"]').hidden,false);
  await submitAccount();assert.equal(calls.some(c=>c.path==='complete-registration.php'),false);
  set('barangay_id',reference.barangays[0].id);await submitAccount();
  assert.equal(calls.at(-1).path,'login');assert.equal(calls.at(-2).body.privacy_consent,'1');
  clearTimeout(ui.toast.timer);
});
test('registration keeps each password visibility separate and explains the length rule',async()=>{
  authApi();await ui.registrationPage(authLayout);
  const first=$('[name=password]'),second=$('[name=password_confirmation]'),toggle=$('[aria-controls=register-password]');
  first.value='short';first.dispatchEvent(new Event('input'));assert.match($('#register-password-help').textContent,/8 to 25/);
  first.value='abcdefgh';first.dispatchEvent(new Event('input'));assert.match($('#register-password-help').textContent,/length accepted/);
  toggle.click();assert.equal(first.type,'text');assert.equal(second.type,'password');assert.equal(toggle.getAttribute('aria-label'),'Hide password');
  toggle.click();assert.equal(first.type,'password');assert.equal(toggle.getAttribute('aria-pressed'),'false');
  assert.equal($('[name=privacy_consent]').checked,false);assert.equal($('[name=privacy_consent]').required,true);
});
test('expert ID is collected after verification, retained when going back, and sent for approval',async()=>{
  const calls=authApi({expert:true});await ui.registrationPage(authLayout);basicAccount('expert@example.test');await submitAccount();
  set('code','123456');await submitAccount();set('role','expert');set('barangay_id',reference.barangays[0].id);
  assert.equal($('#expert-proof').hidden,false);assert.equal($('input[type=file]'),null);
  await submitAccount();assert.equal(calls.some(c=>c.path==='complete-registration.php'),false);
  set('expert_id_code',' WORK-2026/001 ');$('#registration-back').click();
  assert.equal($('[name=first_name]').value,'Test');await submitAccount();
  assert.equal($('[data-step="2"]').hidden,false);assert.equal(calls.filter(c=>c.path==='register.php').length,1);
  assert.equal($('[name=expert_id_code]').value,' WORK-2026/001 ');await submitAccount();
  assert.equal(calls.at(-1).body.expert_id_code,'WORK-2026/001');assert.match($('#page').textContent,/Application submitted/);
  assert.match($('#page').textContent,/We'll email the decision and any admin note to expert@example.test/);
  assert.match($('#page').textContent,/Check your Inbox and Spam folder for updates/);
  assert.match($('#page').textContent,/sign in to check your application status/);
  assert.equal(document.activeElement,$('#page h1'));
  assert.equal(calls.some(c=>c.path==='login'),false);
});
test('resending waits 60 seconds and changing email invalidates previous verification',async()=>{
  const calls=authApi(),originalNow=Date.now;let now=originalNow();Date.now=()=>now;
  try{
    await ui.registrationPage(authLayout);basicAccount();await submitAccount();
    assert.equal($('#resend-code').disabled,true);await $('#resend-code').onclick();assert.equal(calls.filter(c=>c.path==='register.php').length,1);
    now+=61000;await $('#resend-code').onclick();assert.equal(calls.filter(c=>c.path==='register.php').length,2);
    set('code','123456');await submitAccount();$('#registration-back').click();set('email','changed@example.test');await submitAccount();
    assert.equal($('[data-step="0"]').hidden,false);assert.match($('.error').textContent,/Wait a minute/);
    now+=61000;await submitAccount();assert.equal(calls.at(-1).body.email,'changed@example.test');assert.equal($('[data-step="1"]').hidden,false);
    assert.equal($('[name=code]').value,'');assert.equal(calls.filter(c=>c.path==='verify-email.php').length,1);
  }finally{Date.now=originalNow;authLayout('');}
});
test('expired proof returns to verification and keeps profile details',async()=>{
  const calls=authApi({completeError:Object.assign(new Error('Expired'),{status:401})});
  await ui.registrationPage(authLayout);basicAccount();await submitAccount();set('code','123456');await submitAccount();
  set('barangay_id',reference.barangays[0].id);await submitAccount();
  assert.equal($('[data-step="1"]').hidden,false);assert.match($('.error').textContent,/Verification expired/);
  assert.equal($('[name=barangay_id]').value,String(reference.barangays[0].id));assert.equal(calls.filter(c=>c.path==='complete-registration.php').length,1);
});
test('account creation succeeds even if automatic sign-in fails; it cannot resubmit the profile',async()=>{
  const calls=authApi({loginError:true});await ui.registrationPage(authLayout);basicAccount();await submitAccount();set('code','123456');await submitAccount();set('barangay_id',reference.barangays[0].id);await submitAccount();
  assert.match($('#page').textContent,/Account created/);assert.equal($('#registration'),null);assert.equal(calls.filter(c=>c.path==='complete-registration.php').length,1);
  assert.equal($('a[href="#login"]'),null);assert.equal($('#open-dashboard').hidden,false);
  let logins=0;globalThis.testLogin=async(email,password)=>{logins++;assert.equal(email,'guardian@example.test');assert.equal(password,'password123');};
  await $('#open-dashboard').onclick();assert.equal(logins,1);assert.equal($('#open-dashboard').hidden,true);
  assert.equal(calls.filter(c=>c.path==='complete-registration.php').length,1);clearTimeout(ui.toast.timer);
});
test('sign-in has one toggle, blocks duplicate submits, and restores controls after failure',async()=>{
  let rejectRequest,attempts=0;globalThis.testLogin=()=>{attempts++;return new Promise((_,reject)=>rejectRequest=reject);};
  ui.signInPage(authLayout);assert.equal(document.querySelectorAll('.password-toggle').length,1);
  set('email','guardian@example.test');set('password','password123');$('.password-toggle').click();assert.equal($('[name=password]').type,'text');
  const form=$('#login'),submit=()=>form.onsubmit({preventDefault(){},submitter:$('.signin-submit')});
  const pending=submit();await tick();await submit();assert.equal(attempts,1);assert.equal($('.signin-submit').textContent,'Signing in...');assert.equal($('[name=email]').readOnly,true);
  rejectRequest(new Error('Check your email and password.'));await pending;
  assert.equal($('.signin-submit').disabled,false);assert.equal($('[name=email]').readOnly,false);assert.match($('.error').textContent,/Check your email/);
  assert.ok($('a[href="#forgot-password"]'));assert.ok($('a[href="#register"]'));assert.ok($('a[href="#home"]'));
});
test('web password recovery requires the code and matching new passwords',async()=>{
  const calls=[];location.hash='forgot-password';
  globalThis.testApi=async(path,{body})=>{calls.push(path);if(path==='reset-password.php'&&body.code!=='123456')throw new Error('Invalid code.');return {message:'Check your email.'};};
  ui.recoveryPage(authLayout);
  const send=()=>$('#recovery').onsubmit({preventDefault(){},submitter:$('#recovery-submit')});
  set('email','guardian@example.test');assert.equal($('#recovery').checkValidity(),true);await send();assert.equal($('#reset-fields').hidden,false);
  assert.equal($('#recovery').checkValidity(),false);
  const password=$('[name=password]'),confirmation=$('[name=password_confirmation]');
  const eye=$('[aria-controls="reset-password"]'),confirmEye=$('[aria-controls="reset-password_confirmation"]');
  set('password','keep-this-value');set('password_confirmation','keep-confirm-value');
  assert.equal(password.type,'password');assert.equal(confirmation.type,'password');
  eye.click();assert.equal(password.type,'text');assert.equal(confirmation.type,'password');
  assert.equal(eye.getAttribute('aria-label'),'Hide new password');assert.equal(eye.getAttribute('aria-pressed'),'true');
  confirmEye.click();assert.equal(confirmation.type,'text');
  eye.click();confirmEye.click();assert.equal(password.type,'password');assert.equal(confirmation.type,'password');
  assert.equal(eye.getAttribute('aria-label'),'Show new password');assert.equal(eye.getAttribute('aria-pressed'),'false');
  assert.equal(password.value,'keep-this-value');assert.equal(confirmation.value,'keep-confirm-value');
  assert.deepEqual(calls,['forgot-password.php']);
  set('code','000000');set('password','newpassword123');set('password_confirmation','differentpass');await send();assert.deepEqual(calls,['forgot-password.php']);
  set('password_confirmation','newpassword123');await send();assert.equal($('#recovery .error').textContent,'Invalid code.');
  set('code','123456');await send();assert.equal(location.hash,'#login');clearTimeout(ui.toast.timer);
});

test('admin sees the ID code, confirms approval, and must give a reason to decline',async()=>{
  let decision;
  globalThis.testApi=async(path,{body}={})=>{
    assert.equal(path,'expert-applications.php');
    if(body){decision=body;return {message:'Expert approved.'};}
    return {items:[{uid:'candidate',full_name:'Test Expert',email:'expert@example.test',id_code:'WORK-2026/<001>',has_id_photo:false,status:decision?'approved':'pending'}]};
  };
  await ui.expertApplicationsPage($('#page'));
  assert.equal($('.id-code').textContent,'WORK-2026/<001>');assert.equal($('.id-photo'),null);
  const form=$('.application');const send=action=>form.onsubmit({preventDefault(){},submitter:form.querySelector(`[value=${action}]`)});
  await send('reject');assert.equal(decision,undefined);assert.match($('.error').textContent,/reason/);
  let pending=send('approve');await tick();assert.equal(decision,undefined);
  assert.ok([...form.querySelectorAll('button')].every(button=>button.disabled));
  closeConfirm('cancel');await pending;assert.equal(decision,undefined);
  assert.ok([...form.querySelectorAll('button')].every(button=>!button.disabled));
  set('note','Code checked.');pending=send('approve');await tick();closeConfirm('confirm');await pending;
  assert.deepEqual(decision,{uid:'candidate',action:'approve',note:'Code checked.'});
  assert.equal($('.application'),null);assert.match($('#page').textContent,/Approved/);clearTimeout(ui.toast.timer);
});

test('application cards remove sender setup, label the decline reason, and retain filters through an email retry',async()=>{
  let retried=false;
  globalThis.testApi=async(path,{body}={})=>{
    assert.equal(path,'expert-applications.php');
    if(body){assert.deepEqual(body,{action:'retry_email',uid:'declined'});retried=true;return {message:'Email sent.'};}
    return {items:[
      {uid:'pending',full_name:'Sample Pending',email:'pending@example.test',status:'pending'},
      {uid:'declined',full_name:'Sample Declined',email:'declined@example.test',status:'rejected',note:'A current ID is needed.\nPlease update your credentials.',reviewer_name:'Test Admin',email_status:retried?'sent':'not_configured'},
    ]};
  };
  await ui.expertApplicationsPage($('#page'));
  assert.equal($('.email-setup'),null);assert.doesNotMatch($('#page').textContent,/Connect the email sender|SMTP_HOST/);
  assert.equal($('[data-uid=declined] .pill').textContent,'Declined');
  assert.equal($('[data-uid=declined] .application-note h3').textContent,'Decline reason');
  assert.match($('[data-uid=declined] .application-note p').textContent,/current ID/);
  set('q','declined');set('status','rejected');$('.list-filters').onsubmit({preventDefault(){}});
  assert.equal($('[data-uid=pending]').hidden,true);
  assert.match($('.result-count').textContent,/1 application/);
  await $('.retry-email').onclick();
  assert.equal(retried,true);assert.equal($('[name=q]').value,'declined');assert.equal($('[name=status]').value,'rejected');
  assert.equal($('[data-uid=pending]').hidden,true);assert.equal($('.retry-email'),null);
  assert.equal($('[data-uid=declined] [role=status]').textContent,'Email sent');
  clearTimeout(ui.toast.timer);
});

test('administrator saves certificate signer and refreshes signature controls',async()=>{
  let saved;
  globalThis.testApi=async(path,{body}={})=>{
    assert.equal(path,'certificate-settings.php');
    if(body){saved=JSON.parse(body.get('payload'));assert.equal(body.get('signature').name,'signature.png');return {};}
    return {settings:{signer_name:saved?.signer_name??'',signer_title:saved?.signer_title??'',has_signature:!!saved}};
  };
  await ui.certificateSettingsPage($('#page'));
  set('signer_name','Test Coordinator');set('signer_title','Project Coordinator');
  Object.defineProperty($('[name=signature]'),'files',{value:[new File(['png'],'signature.png',{type:'image/png'})]});
  const form=$('#certificate-settings');await form.onsubmit({preventDefault(){},target:form,submitter:form.querySelector('[type=submit]')});
  assert.equal(saved.signer_name,'Test Coordinator');assert.equal(saved.signer_title,'Project Coordinator');
  assert.ok($('[name=remove_signature]'));clearTimeout(ui.toast.timer);
});
