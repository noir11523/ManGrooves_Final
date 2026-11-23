// With no target this only verifies the local backup. Writes are opt-in, to an isolated clone.
import {readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {protectKey,sha256,unpack} from './backup-crypto.js';
import {backupSource} from './backup-source.js';

const [folder,flag,target,...extra] = process.argv.slice(2);
if (!folder || extra.length || (flag && (flag!=='--to-clone' || !target))) {
  throw Error('Usage: node restore-storage.js BACKUP_FOLDER [--to-clone PROJECT_REF]');
}
const key = protectKey('Unprotect',await readFile(join(folder,'key.dpapi')));
const readBlob = async name => unpack(key,await readFile(join(folder,name)));
const manifest = JSON.parse(await readBlob('manifest.enc'));
async function fileBytes(file) {
  if (!/^\d+\.enc$/.test(file.blob)) throw Error('Invalid backup entry.');
  const bytes = await readBlob(file.blob);
  if (bytes.length!==file.size || sha256(bytes)!==file.sha256) throw Error('Backup file verification failed.');
  return bytes;
}
for (const {files} of manifest.buckets) for (const file of files) await fileBytes(file);
const total = manifest.buckets.reduce((sum,bucket)=>sum+bucket.files.length,0);
console.log(total+' encrypted objects recovered and verified locally.');
if (target) {
  const config = JSON.parse(await readFile(new URL('../client-config.json',import.meta.url),'utf8'));
  if (target===manifest.project || target===new URL(config.SUPABASE_URL).hostname.split('.')[0]) {
    throw Error('Choose a separate restore project.');
  }
  const {client} = await backupSource(target);
  const {data:buckets,error} = await client.storage.listBuckets();
  if (error) throw Error('Cannot inspect the target buckets.');
  for (const {settings,files} of manifest.buckets) {
    const name=settings.id, existing=buckets.find(bucket=>bucket.id===name);
    if(existing && existing.public!==settings.public) throw Error('Target bucket visibility differs.');
    if(!existing) {
      const response=await client.storage.createBucket(name,{public:settings.public,
        fileSizeLimit:settings.file_size_limit,allowedMimeTypes:settings.allowed_mime_types});
      if(response.error) throw Error('Could not restore bucket settings for '+name);
    }
    const bucket=client.storage.from(name);
    for(const file of files) {
      let result=await bucket.download(file.path);
      if(result.error) {
        const status=Number(result.error.statusCode??result.error.status);
        if(status!==404 && !/^(object|resource) not found$/i.test(result.error.message)) throw Error('Could not inspect an existing target object.');
        const options={contentType:file.metadata?.mimetype,cacheControl:String(file.metadata?.cacheControl??'3600').replace(/^max-age=/,'')};
        const bytes=await fileBytes(file);
        const put=await bucket.upload(file.path,bytes,{...options,upsert:false});
        if(put.error) {
          if(Number(put.error.statusCode??put.error.status)!==409 && !/already exists|duplicate/i.test(put.error.message)) {
            throw Error('Could not restore an object ('+String(put.error.statusCode??put.error.status)+').');
          }
          // Physical clones can retain the catalog row while its file bytes are missing.
          const split=file.path.lastIndexOf('/'), base=file.path.slice(split+1), prefix=file.path.slice(0,Math.max(0,split));
          const listing=await bucket.list(prefix,{search:base,limit:100});
          const entry=listing.data?.find(item=>item.name===base);
          if(listing.error || !entry || entry.id!==file.id) throw Error('Conflicting target object. Restore stopped.');
          const again=await bucket.download(file.path);
          if(!again.error) {
            if(sha256(Buffer.from(await again.data.arrayBuffer()))!==file.sha256) throw Error('Target object changed. Restore stopped.');
          } else {
            const missing=Number(again.error.statusCode??again.error.status)===404 || /^(object|resource) not found$/i.test(again.error.message);
            if(!missing || (await bucket.update(file.path,bytes,options)).error) throw Error('Could not recover the missing bytes for a restored catalog row.');
          }
        }
        result=await bucket.download(file.path);
      }
      if(result.error || sha256(Buffer.from(await result.data.arrayBuffer()))!==file.sha256) throw Error('Target checksum differs. Restore stopped.');
    }
    console.log(name+': '+files.length+' files verified in the clone.');
  }
}
