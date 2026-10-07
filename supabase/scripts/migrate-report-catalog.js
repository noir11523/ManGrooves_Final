import {mkdir,writeFile} from 'node:fs/promises';
import {context} from './admin-context.js';
import {Store} from '../functions/api/core/store.js';
import {reportCatalogPlan} from '../functions/api/core/report-catalog-migration.js';

const {db,apply}=await context(),store=new Store(db);
const names=['reports','clusters','audit_logs','verification_logs','photo_claims','notifications'];
async function allDocuments(name){const docs=[];let cursor;do{const query=db.collection(name),page=await (cursor?query.startAfter(cursor):query).get();docs.push(...page.docs);cursor=page.size===500?page.docs.at(-1):null;}while(cursor);return {docs};}
const snapshots=Object.fromEntries(await Promise.all(names.map(async name=>[name,await allDocuments(name)])));
const rows=name=>snapshots[name].docs.map(d=>d.data());
const plan=reportCatalogPlan(rows('reports'),rows('clusters'),rows('audit_logs'));
console.log(JSON.stringify({apply,reports:plan.reportUpdates.length,accounts:plan.counters.length,sites:plan.siteUpdates}));
if(apply){
  await mkdir(new URL('../../tmp/report-catalog/',import.meta.url),{recursive:true});
  await writeFile(new URL(`../../tmp/report-catalog/backup-${Date.now()}.json`,import.meta.url),JSON.stringify(Object.fromEntries(names.map(name=>[name,snapshots[name].docs.map(d=>({id:d.id,data:d.data()}))]))));
  await db.runTransaction(async tx=>{
    const lockRef=store.ref('meta','clusters'),lock=(await tx.get(lockRef)).data();
    const reports=await store.transactionRows(tx,'reports'),sites=await store.transactionRows(tx,'clusters');
    const fresh=reportCatalogPlan(reports,sites,rows('audit_logs'));
    const labels=new Map(fresh.reportUpdates.map(r=>[r.id,r]));
    for(const report of fresh.reportUpdates)tx.update(store.ref('reports',report.id),report);
    for(const site of fresh.siteUpdates)tx.update(store.ref('clusters',site.id),site);
    for(const counter of fresh.counters){const ref=store.ref('meta',`report_sequence_${counter.user_id}`),old=(await tx.get(ref)).data();tx.set(ref,{last_number:Math.max(old?.last_number??0,counter.last_number)});}
    for(const name of ['verification_logs','photo_claims','notifications'])for(const doc of snapshots[name].docs){
      const current=(await tx.get(doc.ref)).data(),label=labels.get(current?.report_id);if(!current||!label)continue;
      if(name==='notifications'){
        const replace=value=>typeof value==='string'?value.replace(/Report #\d+|MG-[A-Z0-9-]+/g,label.report_code):value;
        tx.update(doc.ref,{title:replace(current.title),message:replace(current.message)});
      }else tx.update(doc.ref,{report_code:label.report_code,report_number:label.report_number});
    }
    tx.set(lockRef,{version:(lock?.version??0)+1});
  });
  console.log('Report numbers and catalog ownership migrated. Original report IDs and site status are unchanged.');
}
