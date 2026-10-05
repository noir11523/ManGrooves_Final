import {readFile,writeFile} from 'node:fs/promises';
import {createInterface} from 'node:readline/promises';
import {publicConfig} from './public-config.js';
const argument=name=>{const i=process.argv.indexOf(`--${name}`);return i<0?undefined:process.argv[i+1];};
const files=[new URL('../client-config.json',import.meta.url),new URL('../../mobile/flutter_app/supabase-config.json',import.meta.url)];
const terminal=createInterface({input:process.stdin,output:process.stdout});
try {
  const supplied=argument('file');
  const config=publicConfig(supplied?JSON.parse(await readFile(supplied,'utf8')):{BACKEND:'supabase',
    SUPABASE_URL:argument('url')??await terminal.question('Supabase Project URL: '),
    SUPABASE_PUBLISHABLE_KEY:argument('key')??await terminal.question('Public publishable key (not a secret): ')});
  for(const file of files) {
    let previous;
    try { previous=JSON.parse(await readFile(file,'utf8')); } catch(error) { if(error.code!=='ENOENT')throw error; }
    if(previous&&previous.SUPABASE_URL?.replace(/\/+$/,'')!==config.SUPABASE_URL&&!process.argv.includes('--replace-project')) {
      throw new Error('Existing settings point to another project. Check the URL; use --replace-project only for an intentional switch.');
    }
  }
  for(const file of files) await writeFile(file,JSON.stringify(config,null,2)+'\n');
  console.log('Saved matching public settings for the website and Flutter. No cloud changes were made.');
  console.log('Next: follow docs/SUPABASE_MIGRATION.md to deploy, then run npm --prefix supabase run check:setup.');
} finally { terminal.close(); }
