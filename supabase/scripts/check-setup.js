import {readFile} from 'node:fs/promises';
import {publicConfig} from './public-config.js';
let failures=0;
const fail=message=>{console.error(`NOT READY: ${message}`);failures++;};
async function readConfig(file) {
  try { return publicConfig(JSON.parse(await readFile(file,'utf8'))); }
  catch(error) { fail(error.code==='ENOENT'?'Public configuration is missing. Run npm --prefix supabase run configure first.':error.message);return null; }
}
const config=await readConfig(new URL('../client-config.json',import.meta.url));
const mobile=await readConfig(new URL('../../mobile/flutter_app/supabase-config.json',import.meta.url));
if(config&&mobile) {
  if(JSON.stringify(config)!==JSON.stringify(mobile))fail('Website and Flutter settings differ. Run configure again.');
  else console.log('OK: Website and Flutter use matching public settings.');
  const endpoint=`${config.SUPABASE_URL}/functions/v1/api`;
  const i=process.argv.indexOf('--origin'),origin=i>=0?process.argv[i+1]:undefined;
  if(origin&&(!URL.canParse(origin)||new URL(origin).origin!==origin||!origin.startsWith('https://')))fail('Pass --origin as your exact HTTPS website origin, with no trailing slash.');
  try {
    const response=await fetch(`${endpoint}/configuration.php`,{headers:origin?{Origin:origin}:{},signal:AbortSignal.timeout(20000)});
    const body=await response.json();
    if(!response.ok||!body.ok)fail('The API is not ready. Deploy the database and api function first.');
    else if(body.backend!=='supabase'||body.api_id!=='org.mangrooves.mobile-api'||body.project_id!==new URL(config.SUPABASE_URL).hostname.split('.')[0])fail('The API identity does not match this project.');
    else if(!body.barangays?.length)fail('The database has no barangays. Seed or import data.');
    else console.log('OK: Deployed API identity and barangay data verified.');
    if(origin&&response.headers.get('access-control-allow-origin')!==origin)fail('WEB_ORIGINS does not include this website.');
    else if(origin)console.log('OK: Website origin is allowed.');
    const protectedResponse=await fetch(`${endpoint}/me.php`,{signal:AbortSignal.timeout(20000)});
    await protectedResponse.text();
    if(protectedResponse.status!==401)fail('Protected-route sign-in check did not return 401.');
    else console.log('OK: Anonymous users cannot read a profile.');
    const guide=await fetch(`${config.SUPABASE_URL}/storage/v1/object/public/mangrooves-reference/img/guides/roots.png`,{method:'HEAD',signal:AbortSignal.timeout(20000)});
    if(!guide.ok)fail('Packaged guide photos have not been uploaded. Run the seed command.');
    else console.log('OK: Public guide artwork is available.');
  } catch {fail('Could not reach the deployment. Check the project URL, internet connection, and whether the project is paused.');}
}
console.log(failures?'Setup is incomplete. No data or cloud settings were changed.':'Setup checks passed. Still test sign-in, report uploads, and all roles on the live project.');
process.exitCode=failures?1:0;
