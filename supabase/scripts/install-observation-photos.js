import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {context} from './admin-context.js';
import {objectExists} from '../functions/api/bucket.js';
import {allowReferenceJpegs} from './reference-photo-storage.js';
import {planReferencePhotos} from '../functions/api/core/reference-photos.js';
import catalog from '../functions/api/data/observation-photos.json' with {type:'json'};

export async function installPhotos({client,db,projectId,apply}) {
  const criteria=await db.collection('criteria').get();
  const species=await db.collection('species').get();
  const traitRef=db.collection('meta').doc('trait_images');
  const traits=await traitRef.get();
  const before={criteria:criteria.docs.map(d=>d.data()),species:species.docs.map(d=>d.data()),trait_images:traits.data()??{}};
  const plan=planReferencePhotos(before.criteria,before.trait_images,before.species);
  const traitCount=Object.values(plan.trait_images).reduce((n,g)=>n+Object.keys(g).length,0);
  // Verify packaged bytes before touching Storage or reference settings.
  const files=[];
  for(const photo of catalog.photos){
    if(!/^img\/observations\/v[12]-[a-z0-9_-]+\.jpg$/.test(photo.path))throw new Error('Invalid reference photo path.');
    const bytes=await readFile(new URL('../../public/assets/'+photo.path,import.meta.url));
    if(createHash('sha256').update(bytes).digest('hex')!==photo.sha256)throw new Error('Photo checksum mismatch: '+photo.path);
    files.push({path:photo.path,bytes});
  }
  console.log(`${apply?'Apply':'Dry run'} ${projectId}: ${files.length} photos; ${plan.criteria.length} categories to update; ${traitCount} trait mappings. Custom photos, scores and report history are preserved.`);
  if(!apply)return plan;
  const backup=new URL('../../tmp/reference-photo-backups/',import.meta.url);
  await mkdir(backup,{recursive:true});
  await writeFile(new URL(projectId+'-'+Date.now()+'.json',backup),JSON.stringify(before,null,2));
  const storage=client.storage.from('mangrooves-reference');
  await allowReferenceJpegs(client);
  for(const {path,bytes} of files){
    if(await objectExists(storage,path))continue;
    const {error}=await storage.upload(path,bytes,{contentType:'image/jpeg',cacheControl:'31536000',upsert:false});if(error)throw error;
  }
  await db.runTransaction(async tx=>{
    const current=await tx.get(db.collection('criteria'));
    const currentSpecies=await tx.get(db.collection('species'));
    const currentTraits=await tx.get(traitRef);
    const next=planReferencePhotos(current.docs.map(d=>d.data()),currentTraits.data(),currentSpecies.docs.map(d=>d.data()));
    for(const item of next.criteria)tx.set(db.collection('criteria').doc(item.id),item);
    if(JSON.stringify(next.trait_images)!==JSON.stringify(currentTraits.data()??{}))tx.set(traitRef,next.trait_images);
  });
  console.log('Photo references saved. Backup is in tmp/reference-photo-backups.');
  return plan;
}
if(process.argv[1] && resolve(process.argv[1])===fileURLToPath(import.meta.url))await installPhotos(await context());
