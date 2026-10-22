export function writeMonitoringReport(pdf,a,generatedAt) {
  const heading=text=>pdf.moveDown().fontSize(15).text(text).moveDown(.3).fontSize(10);
  pdf.fontSize(20).text('ManGROOVES').fontSize(16).text('Mangrove Monitoring and Decision Support Report');
  pdf.moveDown().fontSize(10).text(`Monitoring period: ${a.filters.date_from} to ${a.filters.date_to}`);
  pdf.text(`Generated: ${new Date(generatedAt).toLocaleString('en-PH',{timeZone:'Asia/Manila',dateStyle:'medium',timeStyle:'short'})} (Asia/Manila)`);
  pdf.text('Scope: authorized monitoring sites; system-generated analysis, not an official approval.');
  for(const [key,label] of [['cluster_id','Site'],['species_id','Species'],['health','Latest condition']]) {
    const value=a.filters[key];const options=key==='cluster_id'?a.options.clusters:key==='species_id'?a.options.species:[];
    pdf.text(`${label}: ${value?(options.find(o=>String(o.id)===String(value))?.name??value):'All'}`);
  }
  heading('Monitoring overview');
  pdf.text(`Verified reports: ${a.verification.verified} | Monitored clusters: ${a.monitored_clusters} | Clusters needing attention: ${a.clusters_needing_attention}`);
  pdf.text(`Survival rate: Insufficient data. ${a.survival_reason}`);
  heading('Latest verified cluster conditions');
  pdf.table(['Condition','Monitoring sites','Share of sites'],Object.entries(a.latest_health).map(([h,n])=>[h,n,`${a.monitored_clusters?(n/a.monitored_clusters*100).toFixed(1):'0'}%`]));
  heading('Monthly health observations');
  pdf.table(['Month','Healthy','Stressed','At Risk','Unknown','Visits'],a.growth.map(m=>[m.month_label,...['Healthy','Stressed','At Risk','Unknown'].map(h=>m.health?.[h]??'-'),m.verified_reports||'-']));
  pdf.text('A dash means no observations were recorded; it is not a zero living-mangrove count.');
  heading('Follow-up monitoring');
  const p=a.progress;pdf.text(`Verified follow-up reports: ${p.followup_reports} | Sites with follow-ups: ${p.clusters_with_followups} | Sites awaiting an observation: ${p.awaiting_followup}`);
  pdf.text(`Latest comparable conditions: ${p.improved} improved, ${p.unchanged} unchanged, ${p.declined} declined.`);
  heading('Priority monitoring areas and supporting evidence');
  if(!a.priority_areas.length)pdf.text('No sites require additional attention under the selected filters.');
  for(const c of a.priority_areas){pdf.moveDown(.5).text(`${c.name} (${c.barangay_name||'Monitoring site'})`).text(`Priority: ${c.priority} | Condition: ${c.latest_health} | Trend: ${c.trend}`).text(`Visit: ${c.last_monitoring_date} | Evidence: ${c.report_code} | Cluster ID: ${c.id}`).text(c.reason);}
  heading('Decision-support guidance');
  if(!a.insights.length)pdf.text('Continue routine monitoring. No additional priority is identified under these filters.');
  for(const i of a.insights)pdf.text(`${i.title}. ${i.evidence} ${i.action}`);
  pdf.text('Restoration or replanting decisions require qualified site assessment.');
  heading('Methodology and limitations');
  for(const text of Object.values(a.methodology))pdf.text(text).moveDown(.4);
  pdf.text(`Excluded legacy reports without a verification date: ${a.data_quality.missing_verification_date}. Sites without usable coordinates: ${a.data_quality.missing_map_coordinates}. Verified reports without an eligible site: ${a.data_quality.unassigned_reports}.`);
}
