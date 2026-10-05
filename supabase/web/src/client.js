import { createClient } from '@supabase/supabase-js';
let client, base;
export async function initialize(onChange) {
  const response=await fetch('/config.json',{cache:'no-store'});
  if(!response.ok) throw new Error('Website setup is not finished. Add your Supabase configuration and rebuild.');
  const config=await response.json();
  if(!/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/.test(config.SUPABASE_URL)||!config.SUPABASE_PUBLISHABLE_KEY) throw new Error('Check your Supabase project URL and publishable key.');
  base=`${config.SUPABASE_URL.replace(/\/$/,'')}/functions/v1/api/`;
  client=createClient(config.SUPABASE_URL,config.SUPABASE_PUBLISHABLE_KEY);
  let previous;
  client.auth.onAuthStateChange((_event,session)=>{
    const id=session?.user?.id??null;
    if(id===previous) return;
    previous=id; setTimeout(()=>onChange(session?.user??null),0);
  });
}
export function apiUrl(path) { return new URL(path,base).href; }
export async function api(path,{body,query,anonymous=false,blob=false,token}={}) {
  const url=new URL(apiUrl(path));
  for(const [key,value] of Object.entries(query??{})) if(value!==''&&value!=null) url.searchParams.set(key,value);
  const headers={Accept:blob?'*/*':'application/json'};
  if(token) headers.Authorization=`Bearer ${token}`;
  else if(!anonymous) {
    const {data,error}=await client.auth.getSession();
    if(error) throw error;
    if(!data.session) throw Object.assign(new Error('Sign in to continue.'),{status:401});
    headers.Authorization=`Bearer ${data.session.access_token}`;
  }
  if(body&&!(body instanceof FormData)) headers['Content-Type']='application/json';
  const response=await fetch(url,{method:body?'POST':'GET',headers,
    body:body instanceof FormData?body:body?JSON.stringify(body):undefined,
    signal:AbortSignal.timeout(body instanceof FormData?120000:60000)});
  if(blob&&response.ok) return response.blob();
  let data;
  try { data=await response.json(); } catch { throw new Error('Could not reach ManGROOVES. Check your connection.'); }
  if(!response.ok||!data.ok) throw Object.assign(new Error(data.message??'Could not complete the request.'),{status:response.status});
  return data;
}
export async function login(email,password) { const {data,error}=await client.auth.signInWithPassword({email,password}); if(error) throw error; return data; }
export async function logout() {
  try { await api('logout.php',{body:{}}); } catch { /* Always allow local sign-out when offline. */ }
  await client.auth.signOut({scope:'local'});
}
export async function changePassword(current,next,confirmation) {
  if(current===next) throw new Error('Choose a different new password.');
  if(next!==confirmation) throw new Error('The new passwords do not match.');
  const {data}=await client.auth.getSession();
  await login(data.session?.user.email,current);
  const result=await api('account-security.php',{body:{action:'password',new_password:next,new_password_confirmation:confirmation}});
  await client.auth.signOut({scope:'local'}); return result;
}
export function friendly(error) {
  if(error?.code==='invalid_credentials') return 'Email or password is incorrect.';
  if(error?.status===429) return 'Too many attempts. Try again later.';
  if(error instanceof TypeError) return 'Check your internet connection and try again.';
  return error?.message??'Could not complete the request.';
}
