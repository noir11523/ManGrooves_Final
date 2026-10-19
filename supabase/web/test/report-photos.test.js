import test from 'node:test';
import assert from 'node:assert/strict';
import {validateReportPhotos} from '../src/report-photos.js';
const photo=(content,name='photo.jpg')=>new File([content],name,{type:'image/jpeg'});
test('renamed duplicate photos are rejected across overview, close-up and additional views',async()=>{
 const original=photo('first photograph');
 await assert.rejects(validateReportPhotos([original,photo('first photograph','renamed.jpg')]),/already added/);
 await assert.rejects(validateReportPhotos([original,photo('second'),photo('first photograph','extra.jpg')]),/already added/);
 await validateReportPhotos([original,photo('second'),photo('third')]);
});
test('all selected photos share the upload size budget',async()=>{
 await assert.rejects(validateReportPhotos([photo(new Uint8Array(5*1024*1024+1))]),/5 MB/);
 await assert.rejects(validateReportPhotos(Array.from({length:4},()=>photo(new Uint8Array(4*1024*1024)))),/12 MB/);
});
