const csrf = () => document.querySelector('meta[name=csrf-token]').content;
async function responseData(response, blob = false) {
  if(blob && response.ok) return response.blob();
  let result;
  try {result=await response.json();} catch {throw new Error('Could not connect. Please try again.');}
  if(!response.ok || !result.ok) throw Object.assign(new Error(result.message??'Could not complete this request.'),{status:response.status});
  if(result.csrf) document.querySelector('meta[name=csrf-token]').content=result.csrf;
  return result;
}
async function session(body) {
  return responseData(await fetch('/cloud-session.php',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json','X-CSRF-Token':csrf(),Accept:'application/json'},body:JSON.stringify(body)}));
}
// Public guide photos need no session; all private images use api(...,{blob:true}).
export function apiUrl(path) {
  const project = document.querySelector('meta[name=cloud-api-base]').content;
  const url=new URL(path,project);
  if(!url.href.startsWith(project)) throw new Error('Invalid file link.');
  return url.href;
}
const pendingReads = new Map();
let pendingToken;
function uploadSession() {
  if (!pendingToken) pendingToken = session({action:'token'}).finally(() => { pendingToken = null; });
  return pendingToken;
}
export function api(path,options={}) {
  // Share simultaneous identical reads only; never cache writes or stale permissions.
  if (options.body || options.blob) return performApi(path,options);
  const key=JSON.stringify([path,Object.entries(options.query??{}).sort(([a],[b])=>a.localeCompare(b)),options.token??null]);
  if (!pendingReads.has(key)) pendingReads.set(key,performApi(path,options).finally(()=>pendingReads.delete(key)));
  return pendingReads.get(key);
}
async function performApi(path,{body,query,anonymous=false,blob=false,token}={}) {
  const parsed=new URL(path,'https://api.invalid/');
  if(parsed.origin!=='https://api.invalid' || !/^\/[a-z-]+\.php$/.test(parsed.pathname)) throw new Error('Invalid request.');
  const params=new URLSearchParams(parsed.search);
  for(const [key,value] of Object.entries(query??{})) if(value!==''&&value!=null)params.set(key,value);
  const direct=blob || body instanceof FormData;
  let url,headers={Accept:blob?'*/*':'application/json'};
  if(direct) {
    const auth=await uploadSession();
    url=new URL(parsed.pathname.slice(1),auth.base);url.search=params.toString();
    headers.Authorization=`Bearer ${auth.access_token}`;
  } else {
    params.set('route',parsed.pathname.slice(1));url=`/cloud-api.php?${params}`;
    headers['X-CSRF-Token']=csrf();
    if(token)headers['X-Registration-Proof']=token;
  }
  if(body && !(body instanceof FormData))headers['Content-Type']='application/json';
  return responseData(await fetch(url,{method:body?'POST':'GET',headers,credentials:direct?'omit':'same-origin',
    body:body instanceof FormData?body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(direct?120000:60000)}),blob);
}
export async function login(email,password){const result=await session({action:'login',email,password});location.assign('/dashboard.php');return result;}
export async function logout(){await session({action:'logout'});location.assign('/login.php');}
export async function changePassword(current,next,confirmation){const result=await session({action:'password',current,next,confirmation});location.assign('/login.php');return result;}
export function friendly(error){return error instanceof TypeError?'Check your connection and try again.':error?.message??'Could not complete the request.';}
export async function initialize(){ /* PHP validates the account before rendering. */ }
