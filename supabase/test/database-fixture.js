import {PGlite} from '@electric-sql/pglite';
import {readFile} from 'node:fs/promises';
import {Database} from '../functions/api/database.js';
export async function databaseFixture() {
  const pg=new PGlite();
  await pg.exec(`create role anon; create role authenticated; create role service_role;
    create schema auth; create schema storage;
    create table auth.users(id uuid primary key,email text);
    create table auth.sessions(id uuid primary key,user_id uuid references auth.users(id));
    create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);`);
  await pg.exec(await readFile(new URL('../migrations/202610020001_app.sql',import.meta.url),'utf8'));
  await pg.exec(await readFile(new URL('../migrations/202610020002_expert_applications.sql',import.meta.url),'utf8'));
  await pg.exec(await readFile(new URL('../migrations/202610050001_public_summary.sql',import.meta.url),'utf8'));
  const client={async rpc(name,args) {
    if(!/^app_[a-z_]+$/.test(name)) throw new Error('Bad test RPC');
    const entries=Object.entries(args), parameters=entries.map(([key],i)=>`${key} := $${i+1}`).join(',');
    try { const result=await pg.query(`select public.${name}(${parameters}) as result`,entries.map(([,v])=>typeof v==='object'&&v!==null?JSON.stringify(v):v)); return {data:result.rows[0].result,error:null}; }
    catch(error) { return {data:null,error}; }
  }};
  return {pg,client,db:new Database(client)};
}
