import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {context,argument} from './admin-context.js';
import {prepareImport,applyImport} from './migration-runner.js';
const source=argument('file');
if(!source) throw new Error('Pass --file with the private snapshot from scripts/export-supabase.php.');
const workspace=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const prepared=await prepareImport(source,workspace);
const {converted,photos}=prepared;
console.log(`Validated ${converted.authUsers.length} accounts, ${converted.documents.reports.length} reports, ${photos.size} photos.`);
if(process.argv.includes('--validate-only')) {
  console.log('Local validation passed. No cloud connection or writes.');
} else {
  const target=await context();
  console.log(`Target: ${target.projectId}`);
  if(!target.apply) console.log('Dry run complete. No cloud writes. Review the snapshot, then repeat with --apply.');
  else {
    const result=await applyImport(prepared,target,message=>console.log(message));
    console.log(result.alreadyImported?'This snapshot was already imported. No changes made.':'Import complete. Test all roles before distributing the Supabase APK.');
  }
}
