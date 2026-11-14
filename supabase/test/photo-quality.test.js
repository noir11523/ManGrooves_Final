import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {validatePhotoQuality} from '../functions/api/core/photo-quality.js';
import {reportPhotoHashes} from '../functions/api/core/report-photos.js';
import {cleanImage} from '../functions/api/core/images.js';
const fixture=name=>readFileSync(new URL(`./fixtures/quality/${name}`,import.meta.url));
for(const name of ['clear.jpg','clear.png','clear.webp','close-up.jpg'])test(`quality accepts ${name}`,()=>{
  const metrics=validatePhotoQuality(fixture(name));assert.ok(metrics.contrast>9);assert.ok(metrics.laplacian>=45||metrics.sharpTiles>=2);
});
for(const [name,message] of [['blur.jpg','Photo is blurry.'],['out-of-focus.jpg','Photo is blurry.'],['dark.jpg','Photo is too dark.'],['bright.jpg','Photo is too bright.'],['low-contrast.jpg','Photo quality is too low.'],['low-resolution.jpg','Photo resolution is too low.']])test(`quality rejects ${name}`,()=>{
  assert.throws(()=>reportPhotoHashes([fixture('clear.jpg'),fixture(name)]),error=>error.status===422&&error.code==='photo_unclear'&&error.photo_indices[0]===1&&error.message.startsWith(message));
});
test('rejects corrupt, unsupported, oversized and forged images without accepting a renamed extension',()=>{
  for(const bytes of [Buffer.from('GIF89a'),fixture('clear.jpg').subarray(0,200),Buffer.alloc(5*1024*1024+1)])assert.throws(()=>validatePhotoQuality(bytes),e=>e.code==='photo_unclear');
  const broken=Buffer.from(fixture('clear.jpg'));broken.fill(0,200,broken.length-2);
  assert.throws(()=>validatePhotoQuality(broken),e=>e.code==='photo_unclear');
  assert.equal(cleanImage(fixture('clear.png')).contentType,'image/png');
  assert.ok(validatePhotoQuality(fixture('clear.jpg')).laplacian>45,'decoding still works after corrupt input');
});

test('regional sharpness accepts a close-up even when global variance is below the blur threshold',()=>{
  const metrics=validatePhotoQuality(fixture('close-up.jpg'));
  assert.ok(metrics.laplacian<45);assert.ok(metrics.sharpTiles>=2);
});
test('Flutter ships the same configurable quality thresholds as the server and browser',()=>{
  const config=JSON.parse(readFileSync(new URL('../functions/api/core/photo-quality-config.json',import.meta.url)));
  const mobile=JSON.parse(readFileSync(new URL('../../mobile/flutter_app/assets/config/photo_quality.json',import.meta.url)));
  assert.deepEqual(config,mobile);
});
