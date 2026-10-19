import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import catalog from '../functions/api/data/observation-photos.json' with {type:'json'};
import reference from '../data/reference.json' with {type:'json'};
import {withPhotoCredits,planReferencePhotos} from '../functions/api/core/reference-photos.js';
import {allowReferenceJpegs} from '../scripts/reference-photo-storage.js';

test('every catalog photo is a packaged, credited individual JPEG with the expected checksum',async()=>{
 const paths=new Set();
 for(const p of catalog.photos){
  assert.ok(!paths.has(p.path));paths.add(p.path);
  const bytes=await readFile(new URL('../../public/assets/'+p.path,import.meta.url));
  assert.equal(bytes.subarray(0,3).toString('hex'),'ffd8ff');
  assert.equal(createHash('sha256').update(bytes).digest('hex'),p.sha256);
  assert.ok(p.author && p.license && p.original && p.changes);
  assert.ok(bytes.length<800000);
 }
 for(const group of [...Object.values(catalog.choices),...Object.values(catalog.traits)])for(const path of Object.values(group))assert.ok(paths.has(path),path);
 for(const s of reference.species)for(const key of ['root_type','leaf_shape','bark_texture'])assert.ok(catalog.traits[key][s[key]],`${key}: ${s[key]}`);
 for(const c of reference.criteria)for(const o of c.options)if(['unknown','none_of_the_above','all_of_the_above','no_animals'].includes(o.code))assert.ok(!catalog.choices[c.code]?.[o.code]);
});

test('photo installation preserves custom pictures, edited labels, scores and IDs, and is idempotent',()=>{
 const original=structuredClone(reference.criteria);
 for(const c of original)for(const o of c.options)o.image_path=null;
 original[0].options[0].image_path='../mobile-api/checklist-photo.php?path=checklist/custom.jpg';
 original[0].options[1].label='Administrator changed this choice';
 const initial=structuredClone(original);
 const custom={root_type:{'Prop roots':'custom-photo.jpg'}};
 const plan=planReferencePhotos(original,custom,reference.species);
 assert.deepEqual(original,initial);
 const next=original.map(c=>plan.criteria.find(x=>x.id===c.id)??c);
 assert.equal(next[0].options[0].image_path,initial[0].options[0].image_path);
 assert.equal(next[0].options[1].image_path,null);
 for(let i=0;i<next.length;i++)assert.deepEqual(next[i].options.map(({image_path,...o})=>o),initial[i].options.map(({image_path,...o})=>o));
 assert.equal(plan.trait_images.root_type['Prop roots'],'custom-photo.jpg');
 assert.equal(planReferencePhotos(next,plan.trait_images,reference.species).criteria.length,0);
 assert.deepEqual(planReferencePhotos(next,plan.trait_images,reference.species).trait_images,plan.trait_images);
});

test('replaced custom photos cannot inherit an unrelated source credit',()=>{
 const c=structuredClone(reference.criteria[0]);
 assert.ok(withPhotoCredits(c).options[0].image_credit.source);
 c.options[0].image_path='custom.jpg';
 assert.equal(withPhotoCredits(c).options[0].image_credit,null);
});

test('reference JPEG support preserves bucket visibility, limits and existing formats',async()=>{
 const writes=[];
 const bucket={public:true,file_size_limit:5242880,allowed_mime_types:['image/png','image/svg+xml']};
 const client={storage:{getBucket:async()=>({data:bucket}),updateBucket:async(name,settings)=>{writes.push({name,settings});bucket.allowed_mime_types=settings.allowedMimeTypes;return {};}}};
 await allowReferenceJpegs(client);await allowReferenceJpegs(client);
 assert.deepEqual(writes,[{name:'mangrooves-reference',settings:{public:true,fileSizeLimit:5242880,allowedMimeTypes:['image/png','image/svg+xml','image/jpeg']}}]);
});
