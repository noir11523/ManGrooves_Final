// Run on the Windows workstation. With no arguments, archive the whole working folder,
// including .git, ignored files and local configuration, outside the web server.
import {spawn} from 'node:child_process';
import {createCipheriv,createDecipheriv,randomBytes} from 'node:crypto';
import {createReadStream,createWriteStream} from 'node:fs';
import {mkdir,mkdtemp,readFile,readdir,writeFile} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {pipeline} from 'node:stream/promises';
import {protectKey} from './backup-crypto.js';

const root=fileURLToPath(new URL('../../',import.meta.url));
const [mode,archive,target,...extra]=process.argv.slice(2);
if(extra.length || (mode && (!archive || !['verify','restore'].includes(mode) || (mode==='restore')!==Boolean(target)))) {
  throw Error('Usage: node backup-workspace.js [verify FOLDER | restore FOLDER EMPTY_DIRECTORY]');
}
function tar(args,stdio) {
  const child=spawn('tar.exe',args,{stdio,windowsHide:true});
  const done=new Promise((ok,fail)=>{
    child.on('error',fail);
    child.on('close',code=>code===0?ok():fail(Error('Archive operation failed (tar exit '+code+').')));
  });
  return {child,done};
}
const backups=join(process.env.LOCALAPPDATA,'ManGROOVES','backups');
await mkdir(backups,{recursive:true});
const folder=archive?resolve(archive):await mkdtemp(join(backups,'workspace-'));
const packed=join(folder,'project.tar.enc');
const keyFile=join(folder,'key.dpapi'),infoFile=join(folder,'integrity.json');
if(!mode){
  const key=randomBytes(32),iv=randomBytes(12);
  await writeFile(keyFile,protectKey('Protect',key),{flag:'wx'});
  const cipher=createCipheriv('aes-256-gcm',key,iv);
  const {child,done}=tar(['-cf','-','-C',root,'.'],['ignore','pipe','inherit']);
  await Promise.all([pipeline(child.stdout,cipher,createWriteStream(packed,{flags:'wx'})),done]);
  await writeFile(infoFile,JSON.stringify({iv:iv.toString('hex'),tag:cipher.getAuthTag().toString('hex')}),{flag:'wx'});
}
const key=protectKey('Unprotect',await readFile(keyFile));
const {iv,tag}=JSON.parse(await readFile(infoFile,'utf8'));
async function replay(args) {
  const decipher=createDecipheriv('aes-256-gcm',key,Buffer.from(iv,'hex'));
  decipher.setAuthTag(Buffer.from(tag,'hex'));
  const {child,done}=tar(args,['pipe','ignore','inherit']);
  await Promise.all([pipeline(createReadStream(packed),decipher,child.stdin),done]);
}
await replay(['-tf','-']);
console.log('Encrypted project archive verified: '+folder);
if(mode==='restore'){
  await mkdir(target,{recursive:true});
  if((await readdir(target)).length)throw Error('Choose an empty restore directory.');
  await replay(['-xf','-','-C',target]);
  console.log('Project restored to '+resolve(target));
}
