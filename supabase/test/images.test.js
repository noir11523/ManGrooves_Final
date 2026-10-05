import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {cleanImage} from '../functions/api/core/images.js';
test('Edge-compatible image sanitizer handles raster types and strips private JPEG metadata',async()=>{
 for(const type of ['jpg','png','webp']) {
   const bytes=await readFile(new URL(`fixtures/photo.${type}`,import.meta.url));
   const clean=cleanImage(bytes); assert.equal(clean.extension,type);
   assert.equal(cleanImage(clean.bytes).extension,type);
   assert.throws(()=>cleanImage(bytes.subarray(0,bytes.length-20)));
 }
 const jpeg=await readFile(new URL('fixtures/photo.jpg',import.meta.url)),secret=Buffer.from('private GPS location');
 const header=Buffer.from([255,225,0,secret.length+2]);
 const result=cleanImage(Buffer.concat([jpeg.subarray(0,2),header,secret,jpeg.subarray(2)]));
 assert.equal(result.bytes.includes(secret),false);
 const exif=Buffer.from('ffe1002245786966000049492a0008000000010012010300010000000600000000000000','hex');
 const oriented=cleanImage(Buffer.concat([jpeg.subarray(0,2),exif,jpeg.subarray(2)]));
 assert.equal(oriented.bytes.readUInt16LE(30),6,'retain orientation without retaining personal EXIF');
 assert.throws(()=>cleanImage(Buffer.from('<svg onload="alert(1)"></svg>')));
});
