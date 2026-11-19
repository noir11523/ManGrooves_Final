import test from 'node:test';
import assert from 'node:assert/strict';
import {isMonitoringSiteAllowed} from '../functions/api/core/monitoring-site-coverage.js';
import {manageSites} from '../functions/api/core/sites.js';
import {searchPlaces} from '../functions/api/core/places.js';

const cebuCity={province:'Cebu',city_municipality:'Cebu City'};
const mandaue={province:'Cebu',city_municipality:'Mandaue City'};
const lapuLapu={province:'Cebu',city_municipality:'Lapu-Lapu City'};
const talisay={province:'Cebu',city_municipality:'Talisay City'};
const elsewhere={province:'Bohol',city_municipality:'Tagbilaran City'};

test('report pin checks use coordinates and read changed coverage even with a cached address',async()=>{
  let coverage=null,area={...mandaue,name:'Alang-Alang'};
  const service={limited:async()=>{},get:async()=>coverage,findBarangay:async()=>area};
  const fetcher=async()=>({ok:true,json:async()=>({features:[]})});
  const pin={latitude:'10.33',longitude:'123.94',report_coverage:'1'};
  const check=()=>searchPlaces(service,{uid:'reporter'},pin,fetcher);
  assert.equal((await check()).monitoring_coverage.allowed,false);
  assert.match((await check()).monitoring_coverage.message,/Cebu City/);
  coverage={mode:'cities',cities:['Mandaue City']};
  assert.equal((await check()).monitoring_coverage.allowed,true);
  coverage=null;
  assert.equal((await check()).monitoring_coverage.allowed,false);
  coverage={mode:'province'};
  assert.equal((await check()).monitoring_coverage.allowed,true);
  area=elsewhere;
  assert.equal((await check()).monitoring_coverage.allowed,false);
  area=null;
  assert.equal((await check()).monitoring_coverage.allowed,false);
  await assert.rejects(searchPlaces(service,{uid:'reporter'},{...pin,latitude:''},fetcher),/valid location/);
});

test('Cebu City is the default scope without backend configuration',()=>{
  assert.equal(isMonitoringSiteAllowed(cebuCity),true);
  for(const other of [mandaue,lapuLapu,talisay,elsewhere,null])assert.equal(isMonitoringSiteAllowed(other),false);
});

test('selected cities can be changed without editing application code',()=>{
  const config={mode:'cities',cities:['Cebu City','Mandaue City','Lapu-Lapu City']};
  for(const city of [cebuCity,mandaue,lapuLapu])assert.equal(isMonitoringSiteAllowed(city,config),true);
  assert.equal(isMonitoringSiteAllowed(talisay,config),false);
  assert.equal(isMonitoringSiteAllowed(elsewhere,config),false);
  assert.equal(isMonitoringSiteAllowed(cebuCity,{mode:'cities',cities:[]}),false);
});

test('province mode allows Cebu but never locations outside Cebu',()=>{
  for(const city of [cebuCity,mandaue,lapuLapu,talisay])assert.equal(isMonitoringSiteAllowed(city,{mode:'province'}),true);
  assert.equal(isMonitoringSiteAllowed(elsewhere,{mode:'province'}),false);
  assert.equal(isMonitoringSiteAllowed(elsewhere,{mode:'province',cities:['Tagbilaran City']}),false);
});

test('invalid configuration never expands site coverage',()=>{
  assert.equal(isMonitoringSiteAllowed(mandaue,{mode:'unknown'}),false);
  assert.equal(isMonitoringSiteAllowed(mandaue,{mode:'cities',cities:'Mandaue City'}),false);
  assert.equal(isMonitoringSiteAllowed({...cebuCity,city_municipality:' cebu city '},{mode:'cities',cities:['Cebu City']}),true);
});

test('site catalog retains existing sites but only offers allowed barangays for placement',async()=>{
  const areas=[{...cebuCity,id:1,name:'Inayawan'},{...mandaue,id:2,name:'Alang-Alang'},
    {...lapuLapu,id:3,name:'Poblacion'},{...elsewhere,id:4,name:'Downtown'}];
  const existing=[{id:11,name:'Old Mandaue site'},{id:12,name:'Cebu City site'}];
  const service={rows:async collection=>collection==='clusters'?existing:areas,
    get:async()=>({mode:'cities',cities:['Cebu City','Lapu-Lapu City']})};
  const result=await manageSites(service,{role:'system_admin',status:'active'},null);
  assert.equal(result.sites.length,2);
  assert.deepEqual(result.barangays.map(b=>b.id),[1,3]);
});

test('site creation is restricted and existing site names may be edited without moving',async()=>{
  const directory=[{...cebuCity,id:1,name:'Inayawan'}, {...mandaue,id:2,name:'Alang-Alang'}];
  let config={mode:'cities',cities:['Cebu City']};
  let previous=null, saved=null;
  const tx={get:async ref=>({data:()=>ref.collection==='users'?{role:'system_admin',status:'active'}:
    ref.collection==='meta'?(ref.id==='monitoring_site_coverage'?config:{}):previous}),
    set:(_,value)=>{if(value.name)saved=value;}};
  const service={ids:async()=>[9],get:async (collection,id)=>directory.find(b=>collection==='barangays'&&b.id===id),
    findBarangay:async()=>directory[1],ref:(collection,id)=>({collection,id}),
    db:{runTransaction:callback=>callback(tx)},transactionRows:async()=>[],audit:()=>{}};
  const actor={role:'system_admin',status:'active',uid:'test',id:4,full_name:'Tester'};
  const input={barangay_id:2,center_lat:10.32,center_lng:123.93,name:'Test site',radius_meters:100};
  await assert.rejects(manageSites(service,actor,input),/allowed Cebu area/);
  config={mode:'cities',cities:['Cebu City','Mandaue City']};
  const added=await manageSites(service,actor,input);
  assert.equal(added.site.barangay_id,2);
  assert.equal(saved.name,'Test site');
  previous={...added.site,id:9};config={mode:'cities',cities:['Cebu City']};
  const renamed=await manageSites(service,actor,{...input,id:9,name:'Renamed site'});
  assert.equal(renamed.site.name,'Renamed site');
});
