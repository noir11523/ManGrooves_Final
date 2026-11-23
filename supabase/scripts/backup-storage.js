// Read-only export for the Windows migration workstation. Keep the output outside Apache.
import {createCipheriv,randomBytes} from 'node:crypto';
import {mkdir,mkdtemp,writeFile,readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {backupSource} from './backup-source.js';
import {protectKey,sha256,unpack} from './backup-crypto.js';

const {client,project}=await backupSource();
const root=join(process.env.LOCALAPPDATA,'ManGROOVES','backups');
await mkdir(root,{recursive:true});
const folder=await mkdtemp(join(root,'storage-'));
const secret=randomBytes(32);
const keyPath=join(folder,'key.dpapi');
await writeFile(keyPath,protectKey('Protect',secret),{flag:'wx'});
const recoveryKey=protectKey('Unprotect',await readFile(keyPath));
async function saveVerified(name,bytes) {
  const iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',secret,iv);
  const ciphertext=Buffer.concat([cipher.update(bytes),cipher.final()]);
  const path=join(folder,name);
  await writeFile(path,Buffer.concat([iv,cipher.getAuthTag(),ciphertext]),{flag:'wx'});
  if(sha256(unpack(recoveryKey,await readFile(path)))!==sha256(bytes))throw Error('Backup verification failed.');
}
async function inventory(bucket,prefix='') {
  const all=[];
  for(let offset=0;;offset+=100){
    const {data,error}=await bucket.list(prefix,{limit:100,offset,sortBy:{column:'name',order:'asc'}});
    if(error)throw Error('Could not list all Storage objects.');
    for(const entry of data){
      const path=prefix?prefix+'/'+entry.name:entry.name;
      if(entry.id)all.push({path,id:entry.id,updated_at:entry.updated_at,metadata:entry.metadata});
      else all.push(...await inventory(bucket,path));
    }
    if(data.length<100)return all;
  }
}
const manifest={project,created_at:new Date().toISOString(),buckets:[]};
let index=0;
for(const name of ['mangrooves','mangrooves-reference']){
  const {data:settings,error}=await client.storage.getBucket(name);
  if(error)throw Error('Could not read bucket settings for '+name);
  const bucket=client.storage.from(name),items=await inventory(bucket),files=[];
  for(const item of items){
    const response=await bucket.download(item.path);
    if(response.error)throw Error('Could not download all objects in '+name);
    const bytes=Buffer.from(await response.data.arrayBuffer());
    if(item.metadata?.size!=null&&Number(item.metadata.size)!==bytes.length)throw Error('Size mismatch in '+name);
    const blob=String(++index)+'.enc';
    await saveVerified(blob,bytes);
    files.push({...item,blob,size:bytes.length,sha256:sha256(bytes)});
  }
  if(JSON.stringify(items)!==JSON.stringify(await inventory(bucket)))throw Error('Bucket changed during backup. Run again.');
  manifest.buckets.push({settings,files});
  console.log(name+': '+files.length+' objects verified.');
}
await saveVerified('manifest.enc',Buffer.from(JSON.stringify(manifest)));
console.log('Verified encrypted Storage backup: '+folder);
