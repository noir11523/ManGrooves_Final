import {publicConfig} from './public-config.js';
import {build} from 'esbuild';
import {cp,mkdir,readFile,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
const root=new URL('../',import.meta.url),out=new URL('web/dist/',root);
let config;
try { config=JSON.parse(await readFile(new URL('client-config.json',root),'utf8')); }
catch { if(!process.argv.includes('--check')) throw new Error('Copy supabase/config.example.json to client-config.json and enter the public project settings first.'); }
if(config) config=publicConfig(config);
await mkdir(out,{recursive:true});
await build({entryPoints:[fileURLToPath(new URL('web/src/app.js',root))],bundle:true,
  outfile:fileURLToPath(new URL('app.js',out)),minify:true,sourcemap:false,
  loader:{'.png':'file','.svg':'file'},assetNames:'assets/[name]-[hash]'});
await cp(new URL('web/index.html',root),new URL('index.html',out));
await cp(new URL('../../public/assets/img/',import.meta.url),new URL('assets/img/',out),{recursive:true,filter:path=>!path.replaceAll('\\','/').includes('/img/checklist')});
await writeFile(new URL('config.json',out),JSON.stringify(config?{BACKEND:'supabase',SUPABASE_URL:config.SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY:config.SUPABASE_PUBLISHABLE_KEY}:{SETUP_REQUIRED:true},null,2));
await writeFile(new URL('_headers',out),`/*\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: strict-origin-when-cross-origin\n/config.json\n  Cache-Control: no-store\n/index.html\n  Cache-Control: no-cache\n`);
console.log(config?'Website ready in supabase/web/dist.':'Build check passed. This output has no project connection; do not publish it.');
