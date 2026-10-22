import test from 'node:test';
import assert from 'node:assert/strict';
import directory from '../functions/api/data/cebu-barangays.json' with {type:'json'};
import {cebuBarangays} from '../functions/api/core/barangays.js';
import {mobileNumber,profileDetails} from '../functions/api/core/profile-fields.js';
import {userDirectory} from '../functions/api/core/user-directory.js';

test('Cebu directory covers 53 municipalities/cities, disambiguates names and keeps the legacy Inayawan ID',()=>{
 const rows=cebuBarangays([{id:1,name:'Inayawan',center_lat:10.2833,center_lng:123.8833}]);
 assert.equal(rows.length,1203);assert.equal(new Set(rows.map(b=>b.id)).size,1203);
 assert.equal(new Set(rows.map(b=>b.city_municipality)).size,53);
 for(const city of ['Cebu City','Mandaue City','Lapu-Lapu City'])assert.ok(rows.some(b=>b.city_municipality===city));
 for(const b of rows){assert.equal(b.province,'Cebu');assert.ok(b.psgc_code);assert.ok(b.center_lat>9&&b.center_lat<12);assert.ok(b.center_lng>123&&b.center_lng<125);assert.ok(b.monitoring_radius_meters>=5000);}
 assert.equal(rows.find(b=>b.id===1).name,'Inayawan');assert.equal(rows.find(b=>b.id===1).center_lat,10.2833);
 assert.ok(rows.filter(b=>b.name==='Poblacion').length>1);
 assert.equal(new Set(rows.map(b=>b.name+'|'+b.city_municipality)).size,1203);
 assert.deepEqual(directory.length,rows.length);
});
test('profile accepts Philippine mobile formats, accepts optional street details and requires a listed Cebu barangay',async()=>{
 for(const value of ['09171234567','+63 917 123 4567','639171234567'])assert.equal(mobileNumber(value),'+639171234567');
 for(const value of ['', '12345','+15551234567'])assert.throws(()=>mobileNumber(value));
 const service={get:async(_,id)=>directory.find(b=>b.id===id)};
 const input={barangay_id:1,phone:'09171234567',address_line:'12 Test Street'};
 assert.equal((await profileDetails(service,input)).city_municipality,'Cebu City');
 assert.equal((await profileDetails(service,{...input,address_line:''})).address_line,null);
 await assert.rejects(profileDetails(service,{...input,barangay_id:-55}));
});
test('user badges and roles distinguish applicants and suspended experts without hiding application access',()=>{
 const users=[['a','active'],['b','inactive'],['c','rejected'],['d','pending_approval']].map(([uid,status],i)=>({id:i+1,uid,first_name:uid,last_name:'Expert',full_name:uid,email:uid+'@example.test',role:'expert',status,barangay_id:1}));
 const badges=[{id:1,code:'gold',badge_name:'Gold Guardian'}],awards=[{user_id:1,badge_id:1}],apps=[{uid:'c',status:'rejected'}];
 const run=q=>userDirectory(users,directory,badges,awards,apps,q);
 assert.equal(run({role:'expert'}).rows.length,1);assert.equal(run({role:'expert',status:'inactive'}).rows[0].id,2);
 assert.equal(run({role:'applicant'}).rows.length,2);assert.equal(run({status:'rejected'}).rows[0].application_uid,'c');
 assert.equal(run({badge_tier:'gold'}).rows[0].id,1);assert.equal(run({badge_tier:'none'}).rows.length,3);
 assert.equal(run({}).summary.active_experts,1);
  users[0].phone='+639171234567';
  for(const q of ['09171234567','0917','+63 917 123 4567'])assert.equal(run({q}).rows[0].id,1);
  assert.equal(run({q:'09171234567',status:'inactive'}).rows.length,0);
});

test('badge column keeps actual milestone names and counts only the matching user reports',()=>{
 const users=[1,2].map(id=>({id,uid:String(id),full_name:`User ${id}`,role:'guardian',status:'active'}));
 const badges=[{id:7,code:'first_report',badge_name:'First Report',description:'One verified report',threshold:1,metric:'verified_reports'}];
 const reports=[{user_id:1,status:'verified'},{user_id:1,status:'pending'},{user_id:1,status:'rejected'},{user_id:2,status:'verified'}];
 const {rows}=userDirectory(users,[],badges,[{user_id:1,badge_id:7}],[],{},reports);
 assert.equal(rows[0].badges[0].name,'First Report');assert.equal(rows[0].badges[0].description,'One verified report');
 assert.deepEqual(rows[0].report_counts,{total:3,verified:1,pending:1,rejected:1});
 assert.deepEqual(rows[1].report_counts,{total:1,verified:1,pending:0,rejected:0});assert.equal(rows[1].badges.length,0);
});
