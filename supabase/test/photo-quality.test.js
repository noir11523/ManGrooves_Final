import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {validatePhotoFile} from '../functions/api/core/photo-quality.js';
import {reportPhotoHashes} from '../functions/api/core/report-photos.js';
import {cleanImage} from '../functions/api/core/images.js';
const fixture=name=>readFileSync(new URL(`./fixtures/quality/${name}`,import.meta.url));
for(const name of ['clear.jpg','clear.png','clear.webp','close-up.jpg','motion-trails.jpg','blur.jpg','out-of-focus.jpg','dark.jpg','bright.jpg','low-contrast.jpg','low-resolution.jpg'])test(`accepts decodable photo regardless of appearance: ${name}`,()=>{
  assert.ok(validatePhotoFile(fixture(name)).width>0);
  assert.equal(reportPhotoHashes([fixture(name)]).length,1);
});
test('rejects corrupt, unsupported, oversized and forged images without accepting a renamed extension',()=>{
  for(const bytes of [Buffer.from('GIF89a'),fixture('clear.jpg').subarray(0,200),Buffer.alloc(5*1024*1024+1)])assert.throws(()=>validatePhotoFile(bytes),e=>e.code==='photo_unclear');
  const broken=Buffer.from(fixture('clear.jpg'));broken.fill(0,200,broken.length-2);
  assert.throws(()=>validatePhotoFile(broken),e=>e.code==='photo_unclear');
  assert.equal(cleanImage(fixture('clear.png')).contentType,'image/png');
  assert.ok(validatePhotoFile(fixture('clear.jpg')).width>0,'decoding still works after corrupt input');
});

test('Flutter ships the same upload safety limits as the server and browser',()=>{
  const config=JSON.parse(readFileSync(new URL('../functions/api/core/photo-quality-config.json',import.meta.url)));
  const mobile=JSON.parse(readFileSync(new URL('../../mobile/flutter_app/assets/config/photo_quality.json',import.meta.url)));
  assert.deepEqual(config,mobile);
});
