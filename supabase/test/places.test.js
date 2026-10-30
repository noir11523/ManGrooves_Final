import test from 'node:test';
import assert from 'node:assert/strict';
import {placeResults,searchPlaces} from '../functions/api/core/places.js';
import {reportBarangay} from '../functions/api/core/report-geography.js';
test('address suggestions reject invalid coordinates and selection coordinates stay exact',async()=>{
 const features=[{geometry:{coordinates:[123.88,10.28]},properties:{name:'Pier 3',street:'Quezon Boulevard',city:'Cebu City'}},{geometry:{coordinates:[500,100]}},{geometry:{coordinates:['123.8','10.2']}},{geometry:{coordinates:[125,10.28]},properties:{name:'Outside Cebu'}},{geometry:{coordinates:[123.88,10.28]},properties:{name:'Wrong country',country:'Japan'}}];
 assert.deepEqual(placeResults({features}),[{name:'Pier 3',address:'Quezon Boulevard, Basak Pardo, Cebu City, Cebu, Philippines',label:'Pier 3, Quezon Boulevard, Basak Pardo, Cebu City, Cebu, Philippines',latitude:10.28,longitude:123.88}]);
 let queried=false;
 const service={limited:async()=>{},get:async()=>({center_lat:10.28,center_lng:123.88})};
 assert.deepEqual(await searchPlaces(service,{uid:'user'}, {q:'pi'}),{places:[]});
 const result=await searchPlaces(service,{uid:'user'}, {q:'Pier 3'},async url=>{
  queried=true;assert.equal(url.searchParams.get('q'),'Pier 3');assert.equal(url.searchParams.get('lat'),'10.28');
  assert.equal(url.searchParams.get('location_bias_scale'),'0.5');assert.equal(url.searchParams.get('bbox'),'116.8,4.5,126.7,21.2');assert.equal(url.searchParams.get('limit'),'15');
  return {ok:true,json:async()=>({features})};
 });
 assert.ok(queried);assert.equal(result.places[0].name,'Pier 3');assert.equal(result.places[0].longitude,123.88);
 await assert.rejects(searchPlaces(service,{uid:'user'}, {q:'Pier 3'},async()=>{throw new Error('offline');}),/still tap the map/);
});

test('official barangay search returns a pin inside the named boundary, including when the source center is off',async()=>{
 const service={limited:async()=>{},get:async()=>({center_lat:10.28,center_lng:123.88})};
 const result=await searchPlaces(service,{uid:'user'},{q:'Basak Pardo'},async()=>{throw new Error('Offline geocoder');});
 assert.ok(result.places.some(place=>place.label==='Basak Pardo, Cebu City, Philippines'));
 const barangay=result.places.find(place=>place.name==='Basak Pardo');
 assert.equal(reportBarangay(barangay.latitude,barangay.longitude)?.name,'Basak Pardo');
});

test('Philippine place search includes locations outside Cebu and rejects foreign geocoder results',async()=>{
 const features=[
  {geometry:{coordinates:[125.6,7.05]},properties:{name:'Tagunol',district:'Talomo',city:'Davao City',state:'Davao Region',country:'Philippines'}},
  {geometry:{coordinates:[140,35.6]},properties:{name:'False Philippines result',city:'Tokyo',country:'Philippines'}},
  {geometry:{coordinates:[116.9,5.9]},properties:{name:'Sabah',city:'Kota Kinabalu',state:'Sabah',country:'Malaysia'}},
  {geometry:{coordinates:[139.7,35.6]},properties:{name:'Tokyo',city:'Tokyo',country:'Japan'}}
 ];
 assert.deepEqual(placeResults({features},'Tagunol'),[{
  name:'Tagunol',address:'Talomo, Davao City, Davao Region, Philippines',
  label:'Tagunol, Talomo, Davao City, Davao Region, Philippines',latitude:7.05,longitude:125.6
 }]);
 const service={limited:async()=>{},get:async()=>({center_lat:10.28,center_lng:123.88})};
 const result=await searchPlaces(service,{uid:'user'},{q:'Tagunol',bias_latitude:7.05,bias_longitude:125.6},async url=>{
  assert.equal(url.searchParams.get('lat'),'7.05');assert.equal(url.searchParams.get('lon'),'125.6');
  assert.equal(url.searchParams.get('bbox'),'116.8,4.5,126.7,21.2');
  return {ok:true,json:async()=>({features})};
 });
 assert.equal(result.places[0].name,'Tagunol');
});

test('Google geocoding uses a server-side key, restricts searches to the Philippines, and rejects out-of-country coordinates',async()=>{
 const previous=process.env.GOOGLE_MAPS_API_KEY;process.env.GOOGLE_MAPS_API_KEY='server-only-test-key';
 try{
  const service={limited:async()=>{},get:async()=>({center_lat:10.28,center_lng:123.88})};
  const result=await searchPlaces(service,{uid:'google-user'},{q:'Tagunol',bias_latitude:7.05,bias_longitude:125.6},async(url,options)=>{
   assert.equal(url.origin+url.pathname,'https://maps.googleapis.com/maps/api/geocode/json');
   assert.equal(url.searchParams.get('key'),'server-only-test-key');assert.equal(url.searchParams.get('components'),'country:PH');
   assert.equal(url.searchParams.get('region'),'ph');assert.equal(url.searchParams.get('bounds'),'4.5,116.8|21.2,126.7');
   assert.equal(options.headers.Accept,'application/json');
   return {ok:true,json:async()=>({results:[
    {formatted_address:'Tagunol, Davao City, Philippines',address_components:[{types:['country'],short_name:'PH'}],geometry:{location:{lat:7.05,lng:125.6}}},
    {formatted_address:'Tokyo, Japan',address_components:[{types:['country'],short_name:'JP'}],geometry:{location:{lat:35.6,lng:139.7}}},
    {formatted_address:'Bad data, Somewhere, Philippines',geometry:{location:{lat:35.6,lng:139.7}}}
   ]})};
  });
  assert.equal(result.attribution,'Google Maps Geocoding');assert.equal(result.places[0].name,'Tagunol');assert.equal(result.places.length,1);
 }finally{if(previous===undefined)delete process.env.GOOGLE_MAPS_API_KEY;else process.env.GOOGLE_MAPS_API_KEY=previous;}
});

test('reverse address lookup uses the exact chosen coordinates and rejects invalid points', async () => {
 const service={limited:async()=>{},get:async()=>{throw new Error('Must not substitute the barangay center.');}};
 const result=await searchPlaces(service,{uid:'user'},{latitude:'10.2833',longitude:'123.8833'},async url=>{
  assert.equal(url.pathname,'/reverse');assert.equal(url.searchParams.get('lat'),'10.2833');assert.equal(url.searchParams.get('lon'),'123.8833');
  return {ok:true,json:async()=>({features:[{geometry:{coordinates:[123.883,10.283]},properties:{street:'Coastal Road',city:'Cebu'}}]})};
 });
 assert.equal(result.places[0].label,'Coastal Road, Mambaling, Cebu City, Cebu, Philippines');
 assert.equal(result.barangay.name,'Mambaling');assert.equal(result.places[0].latitude,10.2833);
 for(const query of [{latitude:'',longitude:'0'},{latitude:'NaN',longitude:'1'},{latitude:'91',longitude:'1'},{latitude:'10'},{latitude:'3',longitude:'101'}]) await assert.rejects(searchPlaces(service,{uid:'user'},query),/valid point/);
});
