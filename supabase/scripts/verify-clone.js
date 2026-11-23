// Read-only. Log counts only. Differences can be legitimate writes since the restore point.
import {isDeepStrictEqual} from 'node:util';
import {backupSource} from './backup-source.js';

async function snapshot(client) {
  const collections=async()=>{
    const result=await client.from('app_collections').select('name,revision').order('name');
    if(result.error)throw Error('Cannot read collection revisions.');
    return result.data;
  };
  const baseline=await collections(), docs=new Map(), accounts=new Map();
  for(const {name,revision} of baseline){
    let after='';
    for(;;){
      const result=await client.rpc('app_read',{p_collection:name,p_after:after,p_limit:500});
      if(result.error || result.data.revision!==revision)throw Error('Collection read failed or changed. Retry verification.');
      const rows=result.data.documents;
      for(const row of rows)docs.set(name+'/'+row.document_id,row);
      if(rows.length<500)break;
      after=rows.at(-1).document_id;
    }
  }
  if(!isDeepStrictEqual(baseline,await collections()))throw Error('Records changed during comparison. Retry verification.');
  for(let page=1;;page++){
    const {data,error}=await client.auth.admin.listUsers({page,perPage:200});
    if(error)throw Error('Cannot read Auth accounts.');
    for(const u of data.users){
      accounts.set(u.id,{email:u.email,phone:u.phone,emailConfirmed:!!u.email_confirmed_at,
        identities:(u.identities??[]).map(i=>[i.provider,i.id]).sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b)))});
    }
    if(data.users.length<200)break;
  }
  return {baseline,docs,accounts};
}

const [target]=process.argv.slice(2);
const source=await backupSource();
if(!target || target===source.project)throw Error('Supply the separate restore project reference.');
const clone=await backupSource(target);
const [live,restored]=await Promise.all([snapshot(source.client),snapshot(clone.client)]);
let ok=isDeepStrictEqual(live.baseline,restored.baseline);
for(const [name,key] of [['Application records and revisions','docs'],['Auth accounts and linked identities','accounts']]){
  const keys=new Set([...live[key].keys(),...restored[key].keys()]);
  const different=[...keys].filter(id=>!isDeepStrictEqual(live[key].get(id),restored[key].get(id))).length;
  console.log(name+': '+live[key].size+' in source, '+restored[key].size+' in clone, '+different+' differences.');
  if(different)ok=false;
}
if(!ok)throw Error('Compare differences with the backup timestamp before cutover.');
