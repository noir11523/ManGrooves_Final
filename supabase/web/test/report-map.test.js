import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {fileURLToPath} from 'node:url';
import {JSDOM} from 'jsdom';

// Real Leaflet controls, markers and camera; only API responses are mocked.
const dom=new JSDOM('<main id="page"></main>',{url:'https://mangrooves.example/report-map.php'});
for(const name of ['window','document','navigator','HTMLElement','Element','SVGElement','Event','KeyboardEvent'])Object.defineProperty(globalThis,name,{value:dom.window[name],configurable:true});
dom.window.SVGSVGElement.prototype.createSVGRect=()=>({});
dom.window.HTMLElement.prototype.scrollIntoView=()=>{};
Object.defineProperty(dom.window.HTMLElement.prototype,'clientWidth',{get(){return this.id==='report-map'?600:0;}});
Object.defineProperty(dom.window.HTMLElement.prototype,'clientHeight',{get(){return this.id==='report-map'?360:0;}});
const L=(await import('leaflet')).default;
const makeMap=L.map;
L.map=(...args)=>globalThis.testCanvas=makeMap(...args);
globalThis.testLeaflet=L;
const bundle=await build({stdin:{contents:'export {reportMapPage} from "./report-map.js";export {mapPoint} from "./ui.js";',resolveDir:fileURLToPath(new URL('../src/',import.meta.url))},bundle:true,write:false,format:'esm',platform:'node',plugins:[{name:'adapters',setup(b){
  b.onResolve({filter:/client\.js$/},()=>({path:'client',namespace:'stub'}));
  b.onResolve({filter:/^leaflet$/},()=>({path:'leaflet',namespace:'stub'}));
  b.onLoad({filter:/.*/,namespace:'stub'},({path})=>({contents:path==='client'?'export const api=(...args)=>globalThis.testApi(...args);export const apiUrl=p=>p;export const friendly=e=>e.message;':'export default globalThis.testLeaflet;'}));
}}]});
const {reportMapPage,mapPoint}=await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`);
const root=document.querySelector('#page'),$=s=>root.querySelector(s);
const tick=()=>new Promise(resolve=>setTimeout(resolve,10));
const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return {promise,resolve,reject};};
const place={label:'Parkmall, Mandaue',latitude:10.3264,longitude:123.9347};
const row=(id=1)=>({id,report_code:`Report #${id}`,latitude:10.2833+id*.001,longitude:123.8833,status:'verified',display_health:'Healthy',sitio_name:`Saved coast ${id}`});
const search=async term=>{const input=$('#map-place');input.value=term;input.dispatchEvent(new Event('input'));input.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true}));await tick();};
const markers=()=>Object.values(globalThis.testCanvas._layers).filter(layer=>layer instanceof L.CircleMarker);

test('map and search work before reports finish, selected pin survives pagination and filters',async()=>{
  const first=deferred(),requests=[];
  globalThis.testApi=async(path,{query})=>{
    requests.push([path,query]);
    if(path==='places.php')return {places:[place,{label:'Invalid',latitude:999,longitude:0}]};
    if(requests.filter(([p])=>p==='reports.php').length===1)return first.promise;
    return {items:[row(2)],pages:2};
  };
  const dispose=reportMapPage(root,{status:'verified'});
  try {
    assert.ok($('.leaflet-container'));assert.ok($('.leaflet-control-zoom'));
    assert.match($('#map-count').textContent,/Loading/);
    await search('Parkmall');assert.equal($('#map-places').children.length,1);
    $('#map-places button').click();
    const center=globalThis.testCanvas.getCenter();
    assert.equal(center.lat,place.latitude);assert.equal(center.lng,place.longitude);
    first.resolve({items:[row(1),{...row(3),latitude:''}],pages:2});await tick();await tick();
    assert.equal(markers().length,2);assert.match($('#map-count').textContent,/2 pins · 3 reports/);
    assert.match($('#map-empty').textContent,/1 report has no map location/);
    assert.ok($('.search-map-pin'));assert.equal(globalThis.testCanvas.getCenter().lat,place.latitude);
    $('[name=status]').value='pending';$('[name=status]').dispatchEvent(new Event('change'));await tick();
    assert.equal(requests.filter(([p])=>p==='reports.php').at(-1)[1].status,'pending');
    assert.equal(new URL(window.location.href).searchParams.get('status'),'pending');
    assert.equal(globalThis.testCanvas.getCenter().lat,place.latitude);
    markers()[0].fire('click');assert.equal($('.leaflet-popup a').getAttribute('href'),'#report/2');
    $('#clear-map-place').click();assert.equal($('.search-map-pin'),null);assert.equal($('#map-place').value,'');
  } finally {dispose();}
});

test('late address replies cannot replace a newer result, selection, or disposed page',async()=>{
  const old=deferred(),late=deferred();
  globalThis.testApi=async(path,{query})=>path==='reports.php'?{items:[],pages:1}:query.q==='Old coast'?old.promise:query.q==='Late coast'?late.promise:{places:[place]};
  const dispose=reportMapPage(root);
  await search('Old coast');await search('Parkmall');$('#map-places button').click();
  old.resolve({places:[{...place,label:'Old coast'}]});await tick();
  assert.equal($('#map-place').value,place.label);assert.equal($('#map-places').children.length,0);
  await search('Late coast');dispose();root.innerHTML='<p>Another page</p>';
  late.resolve({places:[place]});await tick();assert.equal(root.textContent,'Another page');
});

test('empty results, request errors, retry, and tile failure keep the map usable',async()=>{
  let fail=true;
  globalThis.testApi=async(path)=>{
    if(path==='places.php')throw new Error('Offline');
    if(fail)throw new Error('Connection interrupted.');
    return {items:[],pages:1};
  };
  const dispose=reportMapPage(root);
  try {
    await tick();assert.equal($('#map-report-error').hidden,false);assert.ok($('.leaflet-container'));
    await search('Unknown coast');assert.match($('#map-search-status').textContent,/unavailable/);
    const tiles=Object.values(globalThis.testCanvas._layers).find(layer=>layer instanceof L.TileLayer);
    tiles.fire('tileerror');assert.equal($('#map-tile-error').hidden,false);
    $('#map-tile-error button').click();assert.equal($('#map-tile-error').hidden,true);
    fail=false;$('#map-report-error button').click();await tick();
    assert.equal($('#map-report-error').hidden,true);assert.match($('#map-empty').textContent,/No reports match/);
    assert.ok($('.leaflet-control-zoom'));
  } finally {dispose();}
});

test('new filters discard older report replies; saved locations remain searchable without geocoding',async()=>{
  const old=deferred();let first=true;
  globalThis.testApi=async path=>{
    if(path==='places.php')throw new Error('Offline');
    if(first){first=false;return old.promise;}
    return {items:[row(9)],pages:1};
  };
  const dispose=reportMapPage(root);
  try {
    $('[name=health]').value='Healthy';$('[name=health]').dispatchEvent(new Event('change'));await tick();
    old.resolve({items:[row(1)],pages:1});await tick();assert.equal(markers().length,1);
    await search('Saved coast');assert.equal($('#map-places button').textContent,'Saved coast 9');
    $('#map-places button').click();assert.ok(Math.abs(globalThis.testCanvas.getCenter().lat-row(9).latitude)<1e-8);
  } finally {dispose();}
});

test('missing and invalid coordinates cannot create a misleading zero-coordinate pin',()=>{
  for(const latitude of [null,undefined,'',false,'bad',Infinity,90])assert.equal(mapPoint({latitude,longitude:123}),null);
  assert.deepEqual(mapPoint({latitude:'0',longitude:'0'}),[0,0]);
  assert.deepEqual(mapPoint({center_lat:10.2,center_lng:123.8}),[10.2,123.8]);
});
