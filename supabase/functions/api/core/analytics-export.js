const conditions=['Healthy','Stressed','At Risk','Unknown'];
const nextStep=c=>c.latest_health==='Unknown'?'Confirm condition':c.priority==='High'?'Inspect site':c.needs_follow_up?'Follow up':c.latest_health==='Stressed'?'Schedule visit':'Routine monitoring';

export function writeMonitoringReport(pdf,a,generatedAt) {
  const selected=(key,options)=>a.filters[key]?(options.find(o=>String(o.id)===String(a.filters[key]))?.name??a.filters[key]):'All';
  const generated=new Date(generatedAt).toLocaleString('en-PH',{timeZone:'Asia/Manila',dateStyle:'medium',timeStyle:'short'});
  const filters=[`Site: ${selected('cluster_id',a.options.clusters)}`,`Species: ${selected('species_id',a.options.species)}`,`Latest condition: ${a.filters.health||'All'}`];
  if(a.filters.barangay_id)filters.push(`Barangay ID: ${a.filters.barangay_id}`);
  pdf.header('Mangrove monitoring report',[
    `Period: ${a.filters.date_from} to ${a.filters.date_to}  |  Generated: ${generated} (Asia/Manila)`,
    filters.join('  |  '),
  ]);
  pdf.metrics([['Total Verified Reports',a.verification.verified],['Monitored sites',a.monitored_clusters],['Sites needing attention',a.clusters_needing_attention]]);
  if(a.verification.pending||a.verification.rejected)pdf.note(`Pending: ${a.verification.pending}  |  Rejected: ${a.verification.rejected}  (excluded from verified totals)`);
  pdf.section('Site condition');
  pdf.note('Latest verified visit per site.');
  pdf.moveDown(.4);
  pdf.conditionBar(a.latest_health);
  pdf.section('Monthly observations');
  if(a.verification.verified){
    pdf.table(['Month',...conditions,'Visits'],[
      ...a.growth.filter(m=>m.verified_reports>0).map(m=>[m.month_label,...conditions.map(h=>m.health?.[h]??0),m.verified_reports]),
      ['Total',...conditions.map(h=>a.health[h]),a.verification.verified],
    ],{widths:[1.4,1,1,1,1,.8]});
    pdf.note('Only months with verified visits are listed.');
  }else pdf.note('No verified reports in this period.');
  pdf.section('Sites and next steps');
  if(a.clusters.length){
    pdf.table(['Site / latest report','Condition','Visit date','Reports','Living count','Next step'],a.clusters.map(c=>[
      `${c.name}\n${[c.barangay_name,c.city_municipality].filter(Boolean).join(', ')}\n${c.report_code}`,
      c.latest_health,c.last_monitoring_date,c.verified_count,c.observed_alive_count??'Not recorded',nextStep(c),
    ]),{widths:[2.8,1.1,1.2,.8,1,1.4]});
  }else pdf.note('No verified sites match these filters.');
  pdf.section('Follow-ups');
  const p=a.progress;
  pdf.fontSize(9).text(`Verified follow-up reports: ${p.followup_reports}  |  Sites awaiting a visit: ${p.awaiting_followup}`);
  if(p.followup_reports)pdf.text(`Latest comparable condition: ${p.improved} improved, ${p.unchanged} unchanged, ${p.declined} declined.`);
  pdf.moveDown(.5).note('Visit dates use Asia/Manila. Reports must be verified by the period end. Site condition uses the latest verified visit; report totals include earlier visits at matching sites.');
  pdf.note('Survival rate: Insufficient data. Comparable baseline and follow-up measurements are required.');
  const quality=a.data_quality??{},notes=[];
  if(quality.missing_verification_date)notes.push(`${quality.missing_verification_date} verified report(s) missing a verification date`);
  if(quality.invalid_verification_date)notes.push(`${quality.invalid_verification_date} invalid verification date(s)`);
  if(quality.invalid_submission_date)notes.push(`${quality.invalid_submission_date} invalid visit date(s)`);
  if(notes.length)pdf.note(`Excluded from dated totals: ${notes.join('; ')}.`);
  if(quality.unassigned_reports)pdf.note(`${quality.unassigned_reports} verified report(s) are included in totals but have no active site in the site chart.`);
  if(quality.missing_map_coordinates)pdf.note(`${quality.missing_map_coordinates} site(s) have no usable map coordinates.`);
}
