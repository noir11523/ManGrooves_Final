// Keep global report IDs intact. Only account-facing numbers and catalog ownership change.
export function reportCatalogPlan(reports, sites, audit = []) {
  const groups=new Map(), reportUpdates=[], counters=[], siteUpdates=[];
  for(const report of reports){if(!groups.has(report.user_id))groups.set(report.user_id,[]);groups.get(report.user_id).push(report);}
  for(const [user_id,rows] of groups){
    rows.sort((a,b)=>String(a.submitted_at).localeCompare(String(b.submitted_at))||a.id-b.id);
    const used=new Set(rows.map(r=>Number(r.report_number)).filter(n=>n>0));
    let next=1;
    for(const report of rows){
      while(used.has(next))next++;
      const number=Number(report.report_number)||next;used.add(number);
      if(!report.report_number)reportUpdates.push({id:report.id,user_id,report_number:number,report_code:`Report #${number}`});
    }
    counters.push({user_id,last_number:Math.max(0,...used)});
  }
  // These are the three reference sites explicitly created in database/seed.sql.
  const referenceCodes=new Set(['MGC-INY-001','MGC-INY-002','MGC-INY-003']);
  for(const site of sites){
    if(site.visibility)continue;
    const authored=audit.find(a=>a.action==='admin.site_created'&&Number(a.entity_id)===Number(site.id));
    if(referenceCodes.has(site.cluster_code)||authored){
      siteUpdates.push({id:site.id,visibility:'shared',created_by:authored?.user_id??null,created_by_name:authored?.actor_name??'Reference catalog'});
    }else{
      const first=reports.filter(r=>r.cluster_id===site.id).sort((a,b)=>String(a.submitted_at).localeCompare(String(b.submitted_at))||a.id-b.id)[0];
      siteUpdates.push({id:site.id,visibility:'personal',created_by:site.created_by??first?.user_id??null,created_by_name:site.created_by_name??first?.guardian_name??'Unknown creator'});
    }
  }
  return {reportUpdates,counters,siteUpdates};
}
