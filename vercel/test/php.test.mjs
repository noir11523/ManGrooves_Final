import test,{before,after} from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {spawn} from 'node:child_process';
import {randomBytes} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {readFile,readdir} from 'node:fs/promises';
import {JSDOM} from '../../supabase/node_modules/jsdom/lib/api.js';

const root=fileURLToPath(new URL('../',import.meta.url));
let php,mock,origin,logs='',disabled=false,expired=false;
const calls=[];
const users={guardian:{id:1,uid:'g',role:'guardian',first_name:'Clement',last_name:'Guardian',full_name:'Clement Guardian',email:'guardian@example.test',status:'active'},expert:{id:2,uid:'e',role:'expert',first_name:'Test',full_name:'Test Expert',email:'expert@example.test',status:'active'},admin:{id:3,uid:'a',role:'system_admin',first_name:'Test',full_name:'Test Admin',email:'admin@example.test',status:'active'}};
const listen=server=>new Promise(resolve=>server.listen(0,'127.0.0.1',()=>resolve(server.address().port)));
before(async()=>{
  mock=createServer(async(req,res)=>{
    let raw='';for await(const chunk of req)raw+=chunk;const input=raw?JSON.parse(raw):{};
    res.setHeader('Content-Type','application/json');const send=(data,status=200)=>{res.statusCode=status;res.end(JSON.stringify(data));};
    if(req.url.startsWith('/auth/v1/token')){
      if(input.password==='incorrect')return send({error_code:'invalid_credentials'},400);
      const role=input.email?.split('@')[0]??input.refresh_token?.replace('refresh-','')??'guardian';
      return send({access_token:`user-${role}`,refresh_token:`refresh-${role}`,expires_in:expired?1:3600});
    }
    const endpoint=new URL(req.url,'http://localhost').pathname.split('/').at(-1),role=req.headers.authorization?.replace('Bearer user-','');
    calls.push({endpoint,region:req.headers['x-region']});
    if(endpoint==='explore.php')return send({ok:true,clusters:[],summary:{verified_reports:12,clusters:3,species:5,guardians:7}});
    if(endpoint==='configuration.php')return send({ok:true,barangays:[{id:1,name:'Coastal site'}]});
    if(endpoint==='complete-registration.php')return send({ok:req.headers.authorization==='Bearer proof',pending_approval:true});
    if(endpoint==='register.php')return send({ok:true,message:'Check your email.'});
    if(role==='pending'||disabled)return send({ok:false,message:'Your account is waiting for admin approval.'},403);
    if(!users[role])return send({ok:false,message:'Sign in again.'},401);
    if(endpoint==='me.php')return send({ok:true,user:users[role]});
    if(endpoint==='notifications.php')return send({ok:true,unread:2,items:[]});
    if(endpoint==='dashboard.php')return send({ok:true,user:users[role],stats:{total_reports:1,verified_reports:1},latest_reports:[{id:10,report_code:'Report #10',status:'verified',cluster_name:'Coast',display_health:'Healthy',submitted_at:'2026-10-03'}],reminders:role==='guardian'?[{id:10,cluster_id:1,cluster_name:'Coast',follow_up_note:'Check the roots on your next visit.'}]:[],clusters:[]});
    if(endpoint==='logout.php'||endpoint==='account-security.php')return send({ok:true});
    return send({ok:true,items:[],page:1,pages:1,total:0});
  });
  const port=await listen(mock),reserve=createServer();const appPort=await listen(reserve);await new Promise(r=>reserve.close(r));origin=`http://127.0.0.1:${appPort}`;
  php=spawn(process.env.PHP_BINARY??'C:\\xampp\\php\\php.exe',['-S',`127.0.0.1:${appPort}`,'-t',`${root}/dist`,`${root}/serve.php`],{windowsHide:true,env:{...process.env,APP_LOCAL_TEST:'1',APP_KEY:randomBytes(32).toString('base64'),SUPABASE_URL:`http://127.0.0.1:${port}`,SUPABASE_PUBLISHABLE_KEY:'public-test'}});
  php.stderr.on('data',data=>logs+=data);php.stdout.on('data',data=>logs+=data);
  for(let attempt=0;attempt<50;attempt++){try{await fetch(origin+'/login.php');return;}catch{await new Promise(r=>setTimeout(r,100));}}
  throw new Error('PHP test server did not start. '+logs);
});
after(async()=>{php?.kill();await new Promise(r=>mock.close(r));assert.doesNotMatch(logs,/PHP (Fatal|Warning|Parse|Deprecated)/);});
async function browser(){
  let cookie='',csrf='';
  return {get cookie(){return cookie;},get csrf(){return csrf;},set cookie(v){cookie=v;},async request(path,body,extra={}){
    const res=await fetch(origin+path,{redirect:'manual',...extra,headers:{Cookie:cookie,Accept:'application/json',...(body?{'Content-Type':'application/json','X-CSRF-Token':csrf}:{}),...extra.headers},method:body?'POST':extra.method??'GET',body:body?JSON.stringify(body):undefined});
    const set=res.headers.get('set-cookie');if(set)cookie=set.split(';')[0];
    const text=await res.text();if(text.startsWith('{')){const data=JSON.parse(text);if(data.csrf)csrf=data.csrf;return {res,text,data};}
    const match=text.match(/name="csrf-token" content="([^"]+)"/);if(match)csrf=match[1];return {res,text};
  }};
}
async function login(role='guardian'){const b=await browser();await b.request('/login.php');const result=await b.request('/cloud-session.php',{action:'login',email:`${role}@example.test`,password:'Example123'});return {b,result};}
test('PHP home renders before any API call and loads real counts separately',async()=>{
  const b=await browser(),start=calls.length,{res,text}=await b.request('/index.php');assert.equal(res.status,200);assert.match(text,/Protect mangroves/);assert.match(text,/href="\/register.php"/);assert.doesNotMatch(text,/id="authModal"/);assert.match(text,/data-home-stats/);assert.equal(calls.length,start);assert.match(res.headers.get('cache-control'),/no-store/);
  const totals=await b.request('/cloud-api.php?route=explore.php&summary_only=1');assert.equal(totals.data.summary.verified_reports,12);assert.equal(calls.at(-1).region,'ap-northeast-2');
  const dom=new JSDOM(text),doc=dom.window.document;
  assert.equal(doc.querySelectorAll('h1').length,1);
  assert.match(doc.querySelector('.home-role-guardian').textContent,/guided field checklist/);
  assert.doesNotMatch(text,/No environmental experience required|No professional experience needed|No environmental degree required/);
  assert.equal(doc.querySelector('.home-hero-roles'),null);
  assert.equal(doc.querySelectorAll('.home-benefit-grid article').length,3);
  const articles=[...doc.querySelectorAll('.home-news-card')];assert.equal(articles.length,3);
  assert.deepEqual(articles.map(card=>new URL(card.querySelector('a').href).hostname),['www.sunstar.com.ph','www.facebook.com','www.facebook.com']);
  for(const card of articles){const link=card.querySelector('a'),image=card.querySelector('img');assert.equal(link.target,'_blank');assert.equal(link.rel,'noopener noreferrer');assert.ok(link.getAttribute('aria-label').startsWith('Read article:'));assert.ok(image.getAttribute('src').startsWith('/assets/img/'));assert.equal(image.getAttribute('loading'),'lazy');}
  assert.match(articles[1].textContent,/Illustrative photo/);
  assert.equal(doc.querySelector('#publicNavigation a[href="#for-experts"]'),null);
  assert.equal(doc.querySelector('a[download]').textContent.trim(),'Android APK');
  assert.match(doc.querySelector('#for-experts').textContent,/work or professional ID code/);
  const routes=new Set();
  for(const link of doc.querySelectorAll('a[href]')){
    const url=new URL(link.getAttribute('href'),origin+'/index.php');
    if(url.origin!==origin)continue;
    if(url.hash&&['/','/index.php'].includes(url.pathname))assert.ok(doc.getElementById(url.hash.slice(1)),url.hash);
    else if(!url.hash)routes.add(url.pathname);
  }
  for(const route of routes)assert.equal((await fetch(origin+route,{method:'HEAD'})).status,200,route);
  dom.window.close();
});
test('private JSON reads use one authoritative API call and still reject disabled accounts',async()=>{
  const {b}=await login();const start=calls.length;
  assert.equal((await b.request('/cloud-api.php?route=reports.php')).res.status,200);
  assert.deepEqual(calls.slice(start).map(c=>c.endpoint),['reports.php']);
  disabled=true;
  try { assert.equal((await b.request('/cloud-api.php?route=reports.php')).res.status,403); }
  finally { disabled=false; }
});
test('the PHP dashboard renders explicit follow-up requests and image restoration reaches the API',async()=>{
  const {b}=await login();const dashboard=await b.request('/dashboard.php');
  assert.equal(dashboard.res.status,200);assert.match(dashboard.text,/Check the roots on your next visit/);
  assert.match(dashboard.text,/submit-report\.php\?parent=10&amp;cluster=1/);assert.doesNotMatch(dashboard.text,/Overdue|days until/i);
  const staff=(await login('admin')).b;
  const restored=await staff.request('/cloud-api.php?route=trait-images.php',{trait:'root_type',value:'Prop roots',remove:true});
  assert.equal(restored.res.status,200);assert.equal(calls.at(-1).endpoint,'trait-images.php');
});
test('map security policy allows the actual tile provider',async()=>{
  const b=await browser(),{res}=await b.request('/login.php');
  const source=await readFile(new URL('../../supabase/web/src/ui.js',import.meta.url),'utf8');
  const provider=new URL(source.match(/L\.tileLayer\('([^']+)'/)[1]).origin;
  const policy=new Map(res.headers.get('content-security-policy').split(';').map(part=>{const [name,...values]=part.trim().split(/\s+/);return [name,values];}));
  for(const directive of ['img-src','connect-src'])assert.ok(policy.get(directive).includes(provider),`${directive} must allow ${provider}`);
});
test('APK is downloadable and the profile menu has no install action',async()=>{
  const {b}=await login();const dashboard=await b.request('/dashboard.php');
  assert.doesNotMatch(dashboard.text,/data-install-app|>Install app</);
  assert.match(dashboard.text,/Android APK/);
  const topbar=dashboard.text.match(/<header class="app-topbar">[\s\S]*?<\/header>/)?.[0];
  assert.match(topbar,/Profile settings/);assert.doesNotMatch(topbar,/Install app|Download Android APK/);
  assert.doesNotMatch(dashboard.text,/class="sidebar-user"/);assert.match(topbar,/Clement Guardian/);
  const response=await fetch(origin+'/downloads/ManGROOVES-Supabase.apk',{method:'HEAD'});
  assert.equal(response.status,200);assert.match(response.headers.get('content-type'),/android.package-archive/);
  assert.match(response.headers.get('content-disposition'),/attachment/);assert.ok(Number(response.headers.get('content-length'))>1000000);
  const expected=await readFile(root+'/dist/downloads/ManGROOVES-Supabase.apk.sha256','utf8');
  assert.equal(await (await fetch(origin+'/downloads/ManGROOVES-Supabase.apk.sha256')).text(),expected);
});
test('signed-in PHP dashboard and secure session survive a separate HTTP request',async()=>{
  const {b,result}=await login();assert.equal(result.res.status,200);assert.match(result.res.headers.get('set-cookie'),/HttpOnly/i);assert.match(result.res.headers.get('set-cookie'),/SameSite=Lax/i);assert.doesNotMatch(b.cookie,/user-guardian|refresh-guardian|Example123/);
  const {res,text}=await b.request('/dashboard.php');assert.equal(res.status,200);assert.match(text,/Hi, Clement!/);assert.match(text,/Report #10/);assert.match(text,/2 unread/);
  const token=await b.request('/cloud-session.php',{action:'token'});assert.equal(token.data.access_token,'user-guardian');
});
test('all roles keep account actions in the top bar and reachable mobile navigation',async()=>{
  for(const role of ['guardian','expert','admin']){
    const {b}=await login(role);
    const {text}=await b.request('/dashboard.php');
    const dom=new JSDOM(text),doc=dom.window.document;
    const sidebar=doc.querySelector('.app-sidebar'),topbar=doc.querySelector('.app-topbar');
    assert.equal(sidebar.querySelectorAll('a[href="/notifications.php"],a[href="/settings.php"],form[action="/logout.php"]').length,0,role);
    assert.equal(sidebar.querySelectorAll('a[download]').length,1,role);
    assert.equal(doc.querySelectorAll('form[action="/logout.php"]').length,1,role);
    assert.ok(topbar.querySelector('form[action="/logout.php"] input[type="hidden"]'),role+' keeps CSRF-protected sign out');
    assert.equal(topbar.querySelectorAll('a[href="/settings.php"]').length,1,role);
    assert.equal(topbar.querySelectorAll('a[href="/notifications.php"]').length,1,role);
    assert.equal(topbar.querySelector('.notification-count').textContent,'2');
    const bottom=[...doc.querySelectorAll('.mobile-bottom-nav > a')].map(a=>a.getAttribute('href'));
    if(role==='guardian')assert.equal(doc.querySelector('.mobile-bottom-nav a[href="/submit-report.php"] span').textContent,'Submit Report');
    if(role!=='admin')assert.equal(sidebar.querySelector('a[href="/submit-report.php"] span').textContent,'Submit Report');
    const more=[...topbar.querySelector('[aria-label="Account menu"]').parentElement.querySelectorAll('a')].map(a=>a.getAttribute('href'));
    assert.equal(new Set(bottom).size,bottom.length,role);
    assert.equal(more.some(href=>bottom.includes(href)||href==='/analytics.php'),false,role);
    const insights=topbar.querySelector('[aria-label="Analytics and timelines"]').parentElement;
    assert.deepEqual([...insights.querySelectorAll('a')].map(a=>a.textContent),['Analytics','Health history','Growth timeline']);
    // Follow every workspace entry to catch removed access and incorrect role routes.
    const routes=new Set([...sidebar.querySelectorAll('nav a'),...topbar.querySelectorAll('a'),...doc.querySelectorAll('.mobile-bottom-nav a')].map(a=>a.getAttribute('href')));
    for(const route of routes)assert.equal((await b.request(route)).res.status,200,role+' '+route);
    for(const route of bottom){
      const page=new JSDOM((await b.request(route)).text);
      assert.equal(page.window.document.querySelector('.mobile-bottom-nav [aria-current="page"]')?.getAttribute('href'),route,role+' active tab '+route);
      page.window.close();
    }
    const out=await b.request('/logout.php',{}, {headers:{'Content-Type':'application/x-www-form-urlencoded'}});
    assert.equal(out.res.status,302,role);
    assert.equal((await b.request('/dashboard.php')).res.status,302,role);
    dom.window.close();
  }
});
test('CSRF and route allowlists reject forged actions and external targets',async()=>{
  const {b}=await login();assert.equal((await b.request('/cloud-session.php',{action:'token'},{headers:{'X-CSRF-Token':'bad'}})).res.status,419);
  for(const route of ['https://evil.test','../users.php','account-security.php','submit-report.php'])assert.equal((await b.request('/cloud-api.php?route='+encodeURIComponent(route),{})).res.status,404);
  assert.equal((await b.request('/logout.php')).res.status,405);
});
test('role restrictions cover staff/admin pages and pending expert sign-in',async()=>{
  const {b}=await login();for(const page of ['verification','users','expert-applications','certificate-settings','checklist'])assert.equal((await b.request(`/admin/${page}.php`)).res.status,403);
  const {b:expert}=await login('expert');for(const page of ['/submit-report.php','/admin/verification.php','/admin/validation-history.php'])assert.equal((await expert.request(page)).res.status,200);
  assert.equal((await login('pending')).result.res.status,403);
  const {b:admin}=await login('admin');assert.equal((await admin.request('/admin/expert-applications.php')).res.status,200);assert.equal((await admin.request('/submit-report.php')).res.status,403);
});
test('modified cookies, revoked accounts, and logout cannot reuse access',async()=>{
  let {b}=await login();b.cookie=b.cookie.slice(0,-5)+'AAAAA';assert.equal((await b.request('/dashboard.php')).res.status,302);
  ({b}=await login());disabled=true;assert.equal((await b.request('/dashboard.php')).res.status,302);disabled=false;
  ({b}=await login());await b.request('/cloud-session.php',{action:'logout'});assert.equal((await b.request('/cloud-session.php',{action:'token'})).res.status,401);
});
test('short-lived access tokens refresh and password changes clear the browser session',async()=>{
  expired=true;const {b}=await login();expired=false;assert.equal((await b.request('/dashboard.php')).res.status,200);
  assert.equal((await b.request('/cloud-session.php',{action:'password',current:'incorrect',next:'NewPass123',confirmation:'NewPass123'})).res.status,400);
  assert.equal((await b.request('/cloud-session.php',{action:'password',current:'Example123',next:'NewPass123',confirmation:'NewPass123'})).res.status,200);
  assert.equal((await b.request('/dashboard.php')).res.status,302);
});
test('registration proof passes only to the registration endpoint',async()=>{
  const b=await browser();await b.request('/register.php');const out=await b.request('/cloud-api.php?route=complete-registration.php',{first_name:'Test'},{headers:{'X-Registration-Proof':'proof'}});assert.equal(out.res.status,200);assert.equal(out.data.pending_approval,true);
  assert.equal((await b.request('/cloud-api.php?route=complete-registration.php',{})).res.status,401);
});
test('source, database files and secrets cannot be served; assets remain accessible',async()=>{
  const b=await browser();for(const path of ['/app/Cloud/Client.php','/public/index.php','/.env','/database/seed.sql','/vercel.json','/unknown.php'])assert.equal((await b.request(path)).res.status,404,path);
  assert.equal((await b.request('/assets/css/app.css')).res.status,200);
  const all=[];async function files(dir){for(const file of await readdir(dir,{withFileTypes:true})){if(file.name==='.vercel')continue;if(file.isDirectory())await files(dir+'/'+file.name);else all.push(dir+'/'+file.name);}}await files(root+'/dist');
  assert.equal(all.some(p=>/migration-data|\.sql$|\.local-key|client-config\.json|firebase|node_modules/.test(p)),false);
  const js=await readFile(root+'/dist/assets/cloud/cloud.js','utf8');assert.match(js,/cloud-session\.php/);assert.doesNotMatch(js,/createClient\(/);
});
