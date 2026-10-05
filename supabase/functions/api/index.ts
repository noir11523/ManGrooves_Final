import { createClient } from '@supabase/supabase-js';
import { Buffer } from 'node:buffer';
import { Database } from './database.js';
import { Auth } from './auth.js';
import { Bucket } from './bucket.js';
import { createApi } from './core/api.js';

// Node-compatible libraries and shared domain code use Buffer on both runtimes.
Object.assign(globalThis,{Buffer});
const url=Deno.env.get('SUPABASE_URL');
const key=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
if(!url||!key) throw new Error('Supabase function environment is missing.');
const client=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
const authClient=()=>createClient(url,Deno.env.get('SUPABASE_ANON_KEY')??key,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
const app=createApi({db:new Database(client),auth:new Auth(client,authClient),bucket:new Bucket(client),projectId:new URL(url).hostname.split('.')[0]});
app.listen(8000);
