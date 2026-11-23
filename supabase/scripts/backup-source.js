import {execFileSync} from 'node:child_process';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {createClient} from '@supabase/supabase-js';
import {publicConfig} from './public-config.js';

export async function backupSource(ref) {
  const config=publicConfig(JSON.parse(await readFile(new URL('../client-config.json',import.meta.url),'utf8')));
  const project=ref??new URL(config.SUPABASE_URL).hostname.split('.')[0];
  if(!/^[a-z0-9]{20}$/.test(project))throw Error('Invalid Supabase project reference.');
  const cli=fileURLToPath(new URL('../node_modules/supabase/dist/supabase.js',import.meta.url));
  let keys;
  try {
    keys=JSON.parse(execFileSync(process.execPath,[cli,'projects','api-keys','--project-ref',project,'--output','json'],{stdio:['ignore','pipe','pipe'],encoding:'utf8'}));
  } catch {
    throw Error('Could not obtain backup access to the selected Supabase project.');
  }
  const key=keys.find(k=>k.name==='service_role')?.api_key;
  if(!key)throw Error('A private backup reader is required.');
  return {project,client:createClient('https://'+project+'.supabase.co',key,{auth:{persistSession:false,autoRefreshToken:false}})};
}
