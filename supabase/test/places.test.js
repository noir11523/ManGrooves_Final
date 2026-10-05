import test from 'node:test';
import assert from 'node:assert/strict';
import {placeResults,searchPlaces} from '../functions/api/core/places.js';
test('address suggestions reject invalid coordinates and selection coordinates stay exact',async()=>{
 const features=[{geometry:{coordinates:[123.88,10.28]},properties:{name:'Pier 3',street:'Quezon Boulevard',city:'Cebu City'}},{geometry:{coordinates:[500,100]}},{geometry:{coordinates:['123.8','10.2']}}];
 assert.deepEqual(placeResults({features}),[{label:'Pier 3, Quezon Boulevard, Cebu City',latitude:10.28,longitude:123.88}]);
 let queried=false;
 const service={limited:async()=>{},get:async()=>({center_lat:10.28,center_lng:123.88})};
 assert.deepEqual(await searchPlaces(service,{uid:'user'}, {q:'pi'}),{places:[]});
 const result=await searchPlaces(service,{uid:'user'}, {q:'Pier 3'},async url=>{
  queried=true;assert.equal(url.searchParams.get('q'),'Pier 3');assert.equal(url.searchParams.get('lat'),'10.28');return {ok:true,json:async()=>({features})};
 });
 assert.ok(queried);assert.equal(result.places[0].longitude,123.88);
 await assert.rejects(searchPlaces(service,{uid:'user'}, {q:'Pier 3'},async()=>{throw new Error('offline');}),/still tap the map/);
});

test('reverse address lookup uses the exact chosen coordinates and rejects invalid points', async () => {
 const service={limited:async()=>{},get:async()=>{throw new Error('Must not substitute the barangay center.');}};
 const result=await searchPlaces(service,{uid:'user'},{latitude:'10.2833',longitude:'123.8833'},async url=>{
  assert.equal(url.pathname,'/reverse');assert.equal(url.searchParams.get('lat'),'10.2833');assert.equal(url.searchParams.get('lon'),'123.8833');
  return {ok:true,json:async()=>({features:[{geometry:{coordinates:[123.883,10.283]},properties:{street:'Coastal Road',city:'Cebu'}}]})};
 });
 assert.equal(result.places[0].label,'Coastal Road, Cebu');
 for(const query of [{latitude:'',longitude:'0'},{latitude:'NaN',longitude:'1'},{latitude:'91',longitude:'1'},{latitude:'10'}]) await assert.rejects(searchPlaces(service,{uid:'user'},query),/valid point/);
});
