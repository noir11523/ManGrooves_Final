import test from 'node:test';
import assert from 'node:assert/strict';
import {placeResults,searchPlaces} from '../functions/api/core/places.js';
import {reportBarangay} from '../functions/api/core/report-geography.js';

test('Tagunol resolves locally and unrelated Tabunok suggestions are removed',async()=>{
 const service={limited:async()=>{},get:async()=>({province:'Cebu',center_lat:10.28,center_lng:123.88})};
 const result=await searchPlaces(service,{uid:'tagunol-test'},{q:'Tagunol'},async()=>({ok:true,json:async()=>({features:[
  {geometry:{coordinates:[123.8398,10.2636]},properties:{name:'Tabunok',city:'Talisay',country:'Philippines'}},
  {geometry:{coordinates:[125.6,7.05]},properties:{name:'Tagunol',city:'Davao City',country:'Philippines'}}
 ]})}));
 assert.equal(result.places[0].name,'Tagunol Street');
 assert.match(result.places[0].address,/Basak San Nicolas, Cebu City/);
 assert.ok(result.places.every(p=>!p.name.includes('Tabunok')));
 assert.equal(reportBarangay(result.places[0].latitude,result.places[0].longitude).name,'Basak San Nicolas');
});

test('barangay matches do not suppress landmarks and nearby duplicate names rank first',async()=>{
 let called=false;
 const service={limited:async()=>{},get:async()=>({province:'Cebu',center_lat:10.29,center_lng:123.90})};
 const result=await searchPlaces(service,{uid:'kalubihan-test'},{q:'Kalubihan'},async()=>{
  called=true;return {ok:true,json:async()=>({features:[
   {geometry:{coordinates:[123.898,10.297]},properties:{name:'Kalubihan Hall',city:'Cebu City',country:'Philippines'}}
  ]})};
 });
 assert.ok(called);assert.match(result.places[0].label,/Cebu City/);
 assert.ok(result.places.some(p=>p.name==='Kalubihan Hall'));
 assert.ok(result.places.length<=6);
});
test('address suggestions reject invalid coordinates and selection coordinates stay exact',async()=>{
 const features=[{geometry:{coordinates:[123.88,10.28]},properties:{name:'Pier 3',street:'Quezon Boulevard',city:'Cebu City'}},{geometry:{coordinates:[500,100]}},{geometry:{coordinates:['123.8','10.2']}},{geometry:{coordinates:[125,10.28]},properties:{name:'Outside Cebu'}},{geometry:{coordinates:[123.88,10.28]},properties:{name:'Wrong country',country:'Japan'}}];
 assert.deepEqual(placeResults({features}),[{name:'Pier 3',address:'Quezon Boulevard, Basak Pardo, Cebu City, Cebu, Philippines',label:'Pier 3, Quezon Boulevard, Basak Pardo, Cebu City, Cebu, Philippines',latitude:10.28,longitude:123.88}]);
 let queried=false;
 const service={limited:async()=>{},get:async()=>({province:'Cebu',center_lat:10.28,center_lng:123.88})};
 assert.deepEqual(await searchPlaces(service,{uid:'user'}, {q:'pi'}),{places:[]});
 const result=await searchPlaces(service,{uid:'user'}, {q:'Pier 3'},async url=>{
  queried=true;assert.equal(url.searchParams.get('q'),'Pier 3');assert.equal(url.searchParams.get('lat'),'10.28');
  assert.equal(url.searchParams.get('location_bias_scale'),'0.1');assert.equal(url.searchParams.get('countrycode'),'PH');assert.equal(url.searchParams.get('bbox'),'123.2,9.3,124.6,11.7');assert.equal(url.searchParams.get('limit'),'15');
  return {ok:true,json:async()=>({features})};
 });
 assert.ok(queried);assert.equal(result.places[0].name,'Pier 3');assert.equal(result.places[0].longitude,123.88);
 await assert.rejects(searchPlaces(service,{uid:'user'}, {q:'Pier 3'},async()=>{throw new Error('offline');}),/still tap the map/);
});

test('official barangay search returns a pin inside the named boundary, including when the source center is off',async()=>{
 const service={limited:async()=>{},get:async()=>({province:'Cebu',center_lat:10.28,center_lng:123.88})};
 const result=await searchPlaces(service,{uid:'user'},{q:'Basak Pardo'},async()=>{throw new Error('Offline geocoder');});
 assert.ok(result.places.some(place=>place.label==='Basak Pardo, Cebu City, Cebu, Philippines'));
 const barangay=result.places.find(place=>place.name==='Basak Pardo');
 assert.equal(reportBarangay(barangay.latitude,barangay.longitude)?.name,'Basak Pardo');
});

test('Cebu place search excludes locations outside Cebu and rejects foreign geocoder results',async()=>{
 const features=[
  {geometry:{coordinates:[125.6,7.05]},properties:{name:'Tagunol',district:'Talomo',city:'Davao City',state:'Davao Region',country:'Philippines'}},
  {geometry:{coordinates:[140,35.6]},properties:{name:'False Philippines result',city:'Tokyo',country:'Philippines'}},
  {geometry:{coordinates:[116.9,5.9]},properties:{name:'Sabah',city:'Kota Kinabalu',state:'Sabah',country:'Malaysia'}},
  {geometry:{coordinates:[139.7,35.6]},properties:{name:'Tokyo',city:'Tokyo',country:'Japan'}}
 ];
 assert.deepEqual(placeResults({features},'Tagunol'),[]);
 const service={limited:async()=>{},get:async()=>({province:'Cebu',center_lat:10.28,center_lng:123.88})};
 const result=await searchPlaces(service,{uid:'user'},{q:'Tagunol',bias_latitude:7.05,bias_longitude:125.6},async url=>{
  assert.equal(url.searchParams.get('lat'),'10.28');assert.equal(url.searchParams.get('lon'),'123.88');
  assert.equal(url.searchParams.get('bbox'),'123.2,9.3,124.6,11.7');
  return {ok:true,json:async()=>({features})};
 });
 assert.equal(result.places[0].name,'Tagunol Street');
});

test('Google geocoding uses a server-side key, restricts results to Cebu, and rejects out-of-country coordinates',async()=>{
 const previous=process.env.GOOGLE_MAPS_API_KEY;process.env.GOOGLE_MAPS_API_KEY='server-only-test-key';
 try{
  const service={limited:async()=>{},get:async()=>({province:'Cebu',center_lat:10.28,center_lng:123.88})};
  const result=await searchPlaces(service,{uid:'google-user'},{q:'Tagunol',bias_latitude:7.05,bias_longitude:125.6},async(url,options)=>{
   assert.equal(url.origin+url.pathname,'https://maps.googleapis.com/maps/api/geocode/json');
   assert.equal(url.searchParams.get('key'),'server-only-test-key');assert.equal(url.searchParams.get('components'),'country:PH');
   assert.equal(url.searchParams.get('region'),'ph');assert.equal(url.searchParams.get('bounds'),'9.3,123.2|11.7,124.6');
   assert.equal(options.headers.Accept,'application/json');
   return {ok:true,json:async()=>({results:[
    {formatted_address:'Tagunol Street, Cebu City, Philippines',address_components:[{types:['country'],short_name:'PH'}],geometry:{location:{lat:10.28,lng:123.88}}},
    {formatted_address:'Tokyo, Japan',address_components:[{types:['country'],short_name:'JP'}],geometry:{location:{lat:35.6,lng:139.7}}},
    {formatted_address:'Bad data, Somewhere, Philippines',geometry:{location:{lat:35.6,lng:139.7}}}
   ]})};
  });
  assert.equal(result.attribution,'Google Maps Geocoding');assert.equal(result.places[0].name,'Tagunol Street');assert.ok(result.places.every(p=>p.label.includes('Philippines')));assert.ok(!result.places.some(p=>p.name==='Tokyo'||p.name==='Bad data'));
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
 for(const query of [{latitude:'',longitude:'0'},{latitude:'NaN',longitude:'1'},{latitude:'91',longitude:'1'},{latitude:'10'},{latitude:'3',longitude:'101'}]) await assert.rejects(searchPlaces(service,{uid:'user'},query),/Cebu/);
});
