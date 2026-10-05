import {publicConfig} from './public-config.js';
import {readFile} from 'node:fs/promises';
import {createClient} from '@supabase/supabase-js';
import {Database} from '../functions/api/database.js';
import {Bucket} from '../functions/api/bucket.js';
import {Auth} from '../functions/api/auth.js';
export function argument(name) { const i=process.argv.indexOf(`--${name}`);return i>=0?process.argv[i+1]:undefined; }
export async function context() {
  const config=publicConfig(JSON.parse(await readFile(new URL('../client-config.json',import.meta.url),'utf8')));
  if(!/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/.test(config.SUPABASE_URL)) throw new Error('Configure your real Supabase project URL first.');
  const projectId=new URL(config.SUPABASE_URL).hostname.split('.')[0];
  if(argument('project')!==projectId) throw new Error('Pass --project with the project reference matching supabase/client-config.json.');
  const secret=process.env.MANGROOVES_SUPABASE_SECRET_KEY;
  if(!secret) throw new Error('Set MANGROOVES_SUPABASE_SECRET_KEY locally. Never paste it in chat or commit it.');
  const client=createClient(config.SUPABASE_URL,secret,{auth:{persistSession:false,autoRefreshToken:false}});
  const auth=new Auth(client);
  auth.listUsers=async count=>{const {data,error}=await client.auth.admin.listUsers({page:1,perPage:count});if(error)throw error;return data;};
  auth.importUsers=async users=>{
    for(const user of users) {
      const {data:existing,error:lookup}=await client.auth.admin.getUserById(user.uid);
      if(lookup&&lookup.status!==404&&lookup.code!=='user_not_found') throw lookup;
      if(existing?.user) {
        if(existing.user.email.toLowerCase()!==user.email.toLowerCase()) throw new Error('Imported account ID conflicts with an existing email.');
        continue; // Resume never resets an already imported password.
      }
      const {error}=await client.auth.admin.createUser({id:user.uid,email:user.email,
        password_hash:user.passwordHash.toString(),email_confirm:true,
        ban_duration:user.disabled?'876000h':'none',user_metadata:{display_name:user.displayName}});
      if(error) throw new Error(`Account import failed (${error.code??error.status}). The migration remains locked.`);
    }
    return {failureCount:0};
  };
  const db=new Database(client);
  return {client,db,auth,bucket:new Bucket(client),projectId,apply:process.argv.includes('--apply')};
}
