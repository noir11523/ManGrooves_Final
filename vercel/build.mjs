import {build} from 'esbuild';
import postcss from 'postcss';
import {cp,mkdir,readFile,writeFile,rm,readdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {createHash} from 'node:crypto';

const root=fileURLToPath(new URL('../',import.meta.url)),out=path.join(root,'vercel','dist');
const apkName='ManGROOVES-Supabase.apk',apkDir=path.join(root,'mobile/flutter_app/dist');
const release=JSON.parse(await readFile(path.join(apkDir,apkName+'.json'),'utf8'));
const version=(await readFile(path.join(root,'mobile/flutter_app/pubspec.yaml'),'utf8')).match(/^version:\s*(\S+)/m)?.[1];
const apk=await readFile(path.join(apkDir,apkName));
const apkHash=createHash('sha256').update(apk).digest('hex');
if(release.backend!=='supabase'||release.version!==version||release.sha256?.toLowerCase()!==apkHash||apk.readUInt32LE(0)!==0x04034b50)throw new Error('Build the current Supabase release APK before publishing the website.');
await mkdir(out,{recursive:true});
// Delete only generated folders inside this exact output directory; keep CLI linking.
for(const name of ['api','app','public','assets','downloads']){
  const target=path.resolve(out,name);
  if(path.dirname(target)!==out)throw new Error('Invalid build target.');
  await rm(target,{recursive:true,force:true});
}
const copy=async(from,to=from)=>{await mkdir(path.dirname(path.join(out,to)),{recursive:true});await cp(path.join(root,from),path.join(out,to),{recursive:true});};
await copy('vercel/api/index.php','api/index.php');
await copy('app/Cloud');
for(const name of ['Helpers','Csrf'])await copy(`app/Core/${name}.php`);
for(const name of ['layout','home','dashboard'])await copy(`app/Views/${name}.php`);
await copy('app/Views/cloud');
for(const name of ['public-nav','sidebar','topbar','mobile-nav','brand','footer','flashes','privacy-dialog','privacy-content'])await copy(`app/Views/partials/${name}.php`);
await copy('public/index.php');
await copy('public/assets/css/app.css','assets/css/app.css');
for(const name of ['app','maps'])await copy(`public/assets/js/${name}.js`,`assets/js/${name}.js`);
async function images(dir,destination){for(const entry of await readdir(dir,{withFileTypes:true})){
  if(entry.isSymbolicLink())continue;
  if(entry.isDirectory()){if(entry.name!=='checklist')await images(path.join(dir,entry.name),path.join(destination,entry.name));}
  else if(/\.(png|jpe?g|webp|svg|gif|ico)$/i.test(entry.name)){await mkdir(destination,{recursive:true});await cp(path.join(dir,entry.name),path.join(destination,entry.name));}
}}
await images(path.join(root,'public/assets/img'),path.join(out,'assets/img'));
await copy('public/manifest.webmanifest','manifest.webmanifest');
await mkdir(path.join(out,'downloads'),{recursive:true});
await writeFile(path.join(out,'downloads',apkName),apk);
await writeFile(path.join(out,'downloads',apkName+'.sha256'),`${apkHash}  ${apkName}\n`);
const client=path.join(root,'vercel/src/client.js');
await build({entryPoints:[path.join(root,'vercel/src/cloud.js')],outfile:path.join(out,'assets/cloud/cloud.js'),bundle:true,minify:true,sourcemap:false,
  loader:{'.png':'file','.svg':'file'},assetNames:'[name]-[hash]',plugins:[{name:'php-session-client',setup(api){
    api.onResolve({filter:/^\.\/client\.js$/},args=>args.importer.includes(`${path.sep}supabase${path.sep}web${path.sep}src${path.sep}`)?{path:client}:null);
  }}]});
const cssFile=path.join(out,'assets/cloud/cloud.css');
const tree=postcss.parse(await readFile(cssFile,'utf8'));
tree.walkRules(rule=>{
  if(rule.parent.type==='atrule' && /keyframes$/i.test(rule.parent.name))return;
  rule.selectors=rule.selectors.map(selector=>selector.includes(':root')?selector.replaceAll(':root','.cloud-panel'):selector==='body'?'.cloud-panel':`.cloud-panel ${selector}`);
});
await writeFile(cssFile,tree.toString()+`\n.cloud-panel{font-family:inherit;background:transparent;min-width:0;--green:#2d5a27;--border:#ddcfb9;--muted:#5f6b61}.cloud-panel .row{margin:0;--bs-gutter-x:0}.cloud-panel .row>*{width:auto;max-width:100%;margin-top:0}.cloud-panel .row>*:not(.card):not(.option-editor){padding:0}.cloud-panel .card{display:block}.cloud-panel .page-head h1{font-size:1.7rem}.cloud-public{padding:24px max(16px,5vw)}.cloud-public>.auth{max-width:580px}.cloud-panel .leaflet-control a{padding:0}.cloud-panel .leaflet-popup-content p{margin:12px 0}.cloud-panel .actions>button{min-height:44px}.cloud-panel [hidden]{display:none!important}@media(max-width:700px){.cloud-panel .auth{margin:0 auto}.cloud-panel .page-head{gap:8px}}\n`);
await writeFile(path.join(out,'vercel.json'),JSON.stringify({
  $schema:'https://openapi.vercel.sh/vercel.json',framework:null,buildCommand:null,installCommand:null,outputDirectory:'.',
  functions:{'api/index.php':{runtime:'vercel-php@0.9.0',maxDuration:60,excludeFiles:'downloads/**'}},
  routes:[
    {src:'/downloads/ManGROOVES-Supabase\\.apk',dest:'/downloads/'+apkName,headers:{'Content-Type':'application/vnd.android.package-archive','Content-Disposition':'attachment; filename="'+apkName+'"','X-Content-Type-Options':'nosniff','Cache-Control':'public, max-age=0, must-revalidate'}},
    {src:'/downloads/ManGROOVES-Supabase\\.apk\\.sha256',dest:'/downloads/'+apkName+'.sha256',headers:{'Content-Type':'text/plain','Cache-Control':'public, max-age=0, must-revalidate'}},
    {src:'/assets/(.*)',dest:'/assets/$1',headers:{'X-Content-Type-Options':'nosniff','Cache-Control':'public, max-age=3600'}},{src:'/manifest.webmanifest',dest:'/manifest.webmanifest'},{src:'/(.*)',dest:'/api/index.php'}]
},null,2));
await writeFile(path.join(out,'package.json'),JSON.stringify({private:true,engines:{node:'22.x'}},null,2));
await writeFile(path.join(out,'.vercelignore'),'.env*\n*.sql\n*.log\nnode_modules\n');
console.log('PHP website built in vercel/dist. Only website code and public assets are included.');
