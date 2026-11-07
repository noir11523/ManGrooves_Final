import test from 'node:test';
import assert from 'node:assert/strict';
import {validateReportPhotos,checkReportPhotos,photoConflictMessage} from '../src/report-photos.js';
const photo=(content,name='photo.jpg')=>new File([content],name,{type:'image/jpeg'});
test('renamed duplicate photos are rejected across overview, close-up and additional views',async()=>{
 const original=photo('first photograph');
 await assert.rejects(validateReportPhotos([original,photo('first photograph','renamed.jpg')]),/already added/);
 await assert.rejects(validateReportPhotos([original,photo('second'),photo('first photograph','extra.jpg')]),/already added/);
 await validateReportPhotos([original,photo('second'),photo('third')]);
});
test('preflight checks selected contents and reports the correct slot without an overview',async()=>{
 let calls=0;
 const failure=Object.assign(new Error('This photo was used in an earlier report.'),{code:'photo_already_submitted',photo_indices:[0]});
 await assert.rejects(checkReportPhotos([null,photo('old')],async(path,{body})=>{
   calls++;assert.equal(path,'check-report-photos.php');assert.equal(await body.get('photo_0').text(),'old');
   assert.equal(JSON.parse(body.get('payload')).submission_token,'draft-token');throw failure;
 },'draft-token'),error=>error===failure);
 assert.equal(calls,1);assert.deepEqual(failure.photo_indices,[1]);assert.match(photoConflictMessage(failure),/^Close-up:/);
 await assert.rejects(checkReportPhotos([photo('same'),photo('same')],async()=>{calls++;},'draft-token'),/already added/);
 assert.equal(calls,1);
});
test('all selected photos share the upload size budget',async()=>{
 await assert.rejects(validateReportPhotos([photo(new Uint8Array(5*1024*1024+1))]),/5 MB/);
 await assert.rejects(validateReportPhotos(Array.from({length:4},()=>photo(new Uint8Array(4*1024*1024)))),/12 MB/);
});
