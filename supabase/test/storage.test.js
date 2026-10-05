import test from 'node:test';
import assert from 'node:assert/strict';
import {objectExists,Bucket} from '../functions/api/bucket.js';
test('Storage missing-file HEAD responses permit seeding; other errors remain failures',async()=>{
 for(const status of [400,404]) {
  assert.equal(await objectExists({async exists(){return {data:false,error:{status}};}},'guide.png'),false);
 }
 assert.equal(await objectExists({async exists(){return {data:true,error:null};}},'guide.png'),true);
 await assert.rejects(objectExists({async exists(){return {data:false,error:new Error('unavailable')};}},'guide.png'),/unavailable/);
 const bucket=new Bucket({storage:{from(name){assert.equal(name,'mangrooves');return {async exists(){return {data:false,error:{status:404}};}};}}});
 assert.deepEqual(await bucket.file('reports/1/missing.jpg').exists(),[false]);
});
