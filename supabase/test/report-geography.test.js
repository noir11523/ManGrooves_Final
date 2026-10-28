import test from 'node:test';
import assert from 'node:assert/strict';
import {reportBarangay,withReportGeography,boundaryCode} from '../functions/api/core/report-geography.js';
import {searchPlaces} from '../functions/api/core/places.js';
import {cebuBarangays} from '../functions/api/core/barangays.js';

test('report pins use their containing barangay and municipality, not profile or closest center',()=>{
  assert.equal(reportBarangay(10.273,123.866).name,'Cogon Pardo');
  assert.equal(reportBarangay(10.268,123.873).name,'Inayawan');
  assert.equal(reportBarangay(10.29706,123.90428).name,'San Roque');
  const old={id:5,barangay_id:1,barangay_name:'Inayawan',latitude:10.273,longitude:123.866,guardian_name:'Original author'};
  const corrected=withReportGeography(old);
  assert.equal(corrected.barangay_name,'Cogon Pardo');assert.equal(corrected.city_municipality,'Cebu City');
  assert.equal(corrected.guardian_name,old.guardian_name);assert.equal(old.barangay_id,1);
  assert.equal(withReportGeography({center_lat:10.273,center_lng:123.866},undefined,true).barangay_id,corrected.barangay_id);
  for(const pair of [[null,123.9],['',123.9],[NaN,123.9],[14.6,120.98],[10,120]])assert.equal(boundaryCode(...pair),null);
});

test('reference codes preserve existing database barangay IDs',()=>{
  const rows=cebuBarangays([{id:42,name:'Cogon Pardo',city_municipality:'Cebu City'}]);
  assert.equal(reportBarangay(10.273,123.866,rows).id,42);
});

test('barangay still resolves offline and nearby addresses across a boundary cannot replace it',async()=>{
  const service={limited:async()=>{},rows:async()=>cebuBarangays()};
  const query={latitude:10.273,longitude:123.866};
  const offline=await searchPlaces(service,{uid:'test',barangay_id:1},query,async()=>{throw Error('offline');});
  assert.equal(offline.barangay.name,'Cogon Pardo');assert.equal(offline.places[0].label,'Cogon Pardo, Cebu City, Cebu');
  const other=await searchPlaces(service,{uid:'test',barangay_id:1},query,async()=>({ok:true,json:async()=>({features:[{geometry:{coordinates:[123.90428,10.29706]},properties:{name:'Distant shop',district:'Wrong barangay'}}]})}));
  assert.equal(other.places[0].label,'Cogon Pardo, Cebu City, Cebu');assert.equal(other.places[0].latitude,query.latitude);
});
