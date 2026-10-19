import {readFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {context} from './admin-context.js';
import {Store} from '../functions/api/core/store.js';

export async function addInayawanSites(db, apply=false) {
  const store=new Store(db),entries=JSON.parse(await readFile(new URL('../data/inayawan-sites.json',import.meta.url),'utf8'));
  const barangay=(await store.rows('barangays')).find(b=>b.name.toLowerCase()==='inayawan');
  if(!barangay) throw new Error('Inayawan must exist before adding these sites.');
  return db.runTransaction(async tx=>{
    const sites=await store.transactionRows(tx,'clusters');
    const missing=entries.filter(entry=>!sites.some(s=>s.source_key===entry.key||(s.barangay_id===barangay.id&&s.name.trim().toLowerCase()===entry.name.toLowerCase())));
    if(!apply||!missing.length) return {apply,sites:missing.map(s=>s.name),message:apply?'No duplicate sites added.':'Preview: sites will be inactive until pinned.'};
    const sequenceRef=store.ref('meta','sequence'),sequence=(await tx.get(sequenceRef)).data();
    const lockRef=store.ref('meta','clusters'),lock=(await tx.get(lockRef)).data();
    let id=Math.max(1000,sequence?.next??1000,...sites.map(s=>Number(s.id)+1));
    const created_at=new Date().toISOString();
    for(const entry of missing) {
      const site={id,name:entry.name,sitio_name:entry.sitio_name,source_key:entry.key,
        barangay_id:barangay.id,barangay_name:barangay.name,cluster_code:`MGC-${id}`,
        location_pending:true,active:0,visibility:'shared',center_lat:null,center_lng:null,radius_meters:100,
        initial_seedlings:0,verified_count:0,latest_health:'Unknown',created_at,updated_at:created_at,
        created_by_name:'Administrator',version:randomUUID()};
      tx.create(store.ref('clusters',id),site);id++;
    }
    tx.set(sequenceRef,{next:id});tx.set(lockRef,{version:(lock?.version??0)+1});
    return {apply,sites:missing.map(s=>s.name),message:'Sites added. An administrator or expert must set each pin before use.'};
  });
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href) {
  const {db,apply}=await context();console.log(JSON.stringify(await addInayawanSites(db,apply),null,2));
}
