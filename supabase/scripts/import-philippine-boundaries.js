import {readFile} from 'node:fs/promises';
import {gunzipSync} from 'node:zlib';
import {context,argument} from './admin-context.js';

const source=argument('file')??'supabase/functions/api/data/philippine-boundaries.json.gz';
const batchSize=100;
const {client,projectId}=await context();
const rows=JSON.parse(gunzipSync(await readFile(source)).toString('utf8'));
if(!Array.isArray(rows)||rows.length<40000)throw new Error('The national boundary file is missing or incomplete.');
if(rows.some(row=>!/^\d{10}$/.test(row.psgc_code)||!row.geometry))throw new Error('The national boundary file contains an invalid record.');
for(let start=0;start<rows.length;start+=batchSize) {
  const {error}=await client.rpc('app_upsert_barangay_boundaries',{p_rows:rows.slice(start,start+batchSize)});
  if(error)throw new Error(`Boundary upload stopped at ${start} of ${rows.length}: ${error.message}`);
  if((start+batchSize)%2000===0||start+batchSize>=rows.length)console.log(`${Math.min(start+batchSize,rows.length)} / ${rows.length} boundaries uploaded to ${projectId}.`);
}
const {data,error}=await client.rpc('app_barangay_boundary_count');
if(error)throw error;
if(data!==rows.length)throw new Error(`Supabase has ${data} boundaries; expected ${rows.length}.`);
console.log(`Verified ${data} Philippine barangay boundaries in ${projectId}.`);
