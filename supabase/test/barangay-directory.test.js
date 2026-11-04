import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {packBarangayDirectory,encodeBarangayDirectory,unpackBarangayDirectory} from '../functions/api/core/barangay-directory.js';

test('compact location data preserves identities, duplicate names, coordinates and unmapped barangays',async()=>{
  const text=await readFile(new URL('../functions/api/data/philippine-barangays.json',import.meta.url),'utf8');
  const directory=JSON.parse(text),rows=unpackBarangayDirectory(directory);
  assert.equal(rows.length,42046);assert.equal(new Set(rows.map(row=>row.id)).size,42046);
  assert.equal(rows.filter(row=>row.center_lat==null&&row.center_lng==null).length,690);
  assert.deepEqual(unpackBarangayDirectory(packBarangayDirectory(rows)),rows);
  assert.deepEqual(unpackBarangayDirectory(encodeBarangayDirectory(rows)),rows);
  assert.ok(Buffer.byteLength(text)<1024*1024,'Directory must fit the Edge deployment limit.');
  assert.throws(()=>unpackBarangayDirectory({version:1,municipalities:[],barangays:[['0730600024','Cogon Pardo',0,10.273,123.866]]}),/Missing barangay municipality/);
});
