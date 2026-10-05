import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {spawn} from 'node:child_process';
import {randomBytes} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {publicConfig} from '../supabase/scripts/public-config.js';

const root=fileURLToPath(new URL('../',import.meta.url)),out=path.join(root,'vercel/dist');
const vc=path.join(root,'vercel/node_modules/vercel/dist/vc.js');
const sb=path.join(root,'supabase/node_modules/supabase/dist/supabase.js');
function run(script,args,{cwd=out,input='',quiet=false}={}){
  return new Promise((resolve,reject)=>{
    const child=spawn(process.execPath,[script,...args],{cwd,windowsHide:true,env:{...process.env,VERCEL_TELEMETRY_DISABLED:'1',NO_COLOR:'1'},stdio:['pipe','pipe','pipe']});
    let stdout='',stderr='';child.stdout.on('data',chunk=>stdout+=chunk);child.stderr.on('data',chunk=>stderr+=chunk);
    child.on('error',reject);child.stdin.end(input);
    child.on('close',code=>{
      if(code!==0){const safe=(stderr||stdout).replaceAll(input.trim()||'___NO_SECRET___','[redacted]');reject(new Error(safe.slice(-5000)));}
      else{if(!quiet&&stderr.trim())console.log(stderr.trim());resolve(stdout);}
    });
  });
}
const config=publicConfig(JSON.parse(await readFile(path.join(root,'supabase/client-config.json'),'utf8')));
await run(vc,['whoami'],{quiet:true}).catch(()=>{throw new Error('Sign in first: .\\vercel\\node_modules\\.bin\\vercel.cmd login');});
await import('./build.mjs');
await run(vc,['link','--yes','--project','mangrooves-php']);
// The connected source repository is not the prepared deployment directory.
// A source-only Git push must not replace the PHP package with legacy files.
const project=JSON.parse(await readFile(path.join(out,'.vercel/project.json'),'utf8'));
await run(vc,['api',`/v9/projects/${project.projectId}`,'--method','PATCH','--input','-','--silent'],{input:JSON.stringify({nodeVersion:'22.x',commandForIgnoringBuildStep:'if [ -f api/index.php ] && [ -f app/Cloud/bootstrap.php ] && [ -f assets/cloud/cloud.js ]; then exit 1; else exit 0; fi'}),quiet:true});
let key;const keyFile=path.join(root,'vercel/.local-key');
try{key=(await readFile(keyFile,'utf8')).trim();}catch{key=randomBytes(32).toString('base64');await writeFile(keyFile,key,{mode:0o600});}
if(Buffer.from(key,'base64').length!==32)throw new Error('The local APP_KEY is invalid.');
console.log('Saving the project connection and encrypted-session key to Vercel.');
for(const [name,value] of Object.entries({SUPABASE_URL:config.SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY:config.SUPABASE_PUBLISHABLE_KEY,APP_KEY:key})){
  await run(vc,['env','add',name,'production,preview','--force','--yes','--sensitive'],{input:value+'\n',quiet:true});
}
console.log('Publishing the PHP website…');
const deployment=JSON.parse(await run(vc,['deploy','--prod','--yes','--json']));
const data=deployment.deployment??deployment;
let host=data.url??data.deploymentUrl??deployment.url;
if(!host)throw new Error('Deployment returned no URL. Run vercel inspect in vercel/dist.');
host=host.replace(/^https:\/\//,'');
if(!/^[a-zA-Z0-9.-]+\.vercel\.app$/.test(host))throw new Error('Unexpected deployment URL.');
const detail=JSON.parse(await run(vc,['inspect',host,'--json'],{quiet:true}));
const aliases=(detail.alias??detail.aliases??data.alias??[]).map(a=>typeof a==='string'?a:a.alias??a.domain).filter(a=>typeof a==='string'&&/^[a-zA-Z0-9.-]+\.vercel\.app$/.test(a));
const origins=[...new Set(['https://mangrooves-4236e.web.app','https://mangrooves-4236e.firebaseapp.com','http://127.0.0.1:5002','http://localhost:5002','http://127.0.0.1:8086','http://localhost:8086',`https://${host}`,...aliases.map(a=>`https://${a}`)])];
const ref=new URL(config.SUPABASE_URL).hostname.split('.')[0];
console.log('Allowing photo uploads from the exact website addresses.');
await run(sb,['secrets','set',`WEB_ORIGINS=${origins.join(',')}`,'--project-ref',ref],{cwd:root});
await run(sb,['functions','deploy','api','--project-ref',ref,'--use-api'],{cwd:root});
const url=`https://${aliases.find(a=>a.startsWith('mangrooves-php.') )??aliases[0]??host}`;
await mkdir(path.join(root,'vercel/.vercel'),{recursive:true});
await writeFile(path.join(root,'vercel/.vercel/deployment.json'),JSON.stringify({url,deployment:`https://${host}`,origins,published_at:new Date().toISOString()},null,2));
// These checks read public pages only; they never create test accounts or reports.
for(const route of ['/index.php','/login.php','/register.php','/privacy.php','/assets/cloud/cloud.js']){
  const response=await fetch(url+route);if(!response.ok)throw new Error(`Published page check failed: ${route} (${response.status})`);
  if(route.endsWith('.php')&&!(await response.text()).includes('csrf-token'))throw new Error(`PHP did not render correctly: ${route}`);
}
const apkResponse=await fetch(url+'/downloads/ManGROOVES-Supabase.apk',{method:'HEAD'});
if(!apkResponse.ok||!apkResponse.headers.get('content-type')?.includes('android.package-archive')||!apkResponse.headers.get('content-disposition')?.includes('attachment'))throw new Error('The Android APK download is not available.');
const publishedHash=await fetch(url+'/downloads/ManGROOVES-Supabase.apk.sha256');
if(!publishedHash.ok||(await publishedHash.text()).trim()!==(await readFile(path.join(out,'downloads/ManGROOVES-Supabase.apk.sha256'),'utf8')).trim())throw new Error('The APK download does not match this release.');
const cors=await fetch(config.SUPABASE_URL+'/functions/v1/api/configuration.php',{method:'OPTIONS',headers:{Origin:new URL(url).origin,'Access-Control-Request-Method':'POST','Access-Control-Request-Headers':'authorization,content-type'}});
if(cors.headers.get('access-control-allow-origin')!==new URL(url).origin)throw new Error('The website is published, but photo-upload permission still needs checking.');
console.log(`Website published and public pages checked: ${url}`);
console.log('The Flutter APK continues to use the same Supabase project. Real email-code delivery depends on the project SMTP settings and must be checked in an inbox.');
