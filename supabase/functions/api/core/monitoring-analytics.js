import {AppError,manilaDate} from './domain.js';

const healthValues=['Healthy','Stressed','At Risk','Unknown'];
const distribution=()=>Object.fromEntries(healthValues.map(h=>[h,0]));
const healthOf=r=>healthValues.includes(r.final_health)?r.final_health:'Unknown';
const chronological=(a,b)=>String(a.submitted_at).localeCompare(String(b.submitted_at))||Number(a.id)-Number(b.id);
const dateValid=s=>/^\d{4}-\d{2}-\d{2}$/.test(s)&&!Number.isNaN(Date.parse(s))&&new Date(s).toISOString().slice(0,10)===s;
const label=r=>`Report #${r.display_report_number||r.report_number||r.id}`;
export const analyticsMethodology={
  period:'Visit dates use report submission time in Asia/Manila. Only verified reports whose verification date is on or before the period end are included.',
  scope:'Site, species and condition filters select sites by their latest eligible visit in the period. Earlier visits at those sites remain in the trend and report totals.',
  latest:'One latest eligible visit per site, ordered by submission time, then report ID. These are conditions observed in the selected period, not a claim of continuous monitoring.',
  trend:'Monthly counts represent verified visits, not individual trees. Condition comparisons require an explicitly linked, verified parent visit at the same site. Healthy > Stressed > At Risk; Unknown is not ranked.',
  priority:'Operational guidance: At Risk = High; Stressed or an outstanding follow-up request = Moderate; Unknown = Insufficient data; otherwise Routine. This is not an ecological risk prediction.',
  survival:'Survival rate requires verified baseline and follow-up measurements of the same population and survey area. Existing living counts do not establish this comparability; no survival percentage is calculated.'
};

export function analyticsForUser(user,rows,clusters,query={}) {
  const today=manilaDate(),start=new Date(`${today}T00:00:00Z`);start.setUTCDate(1);start.setUTCMonth(start.getUTCMonth()-11);
  const from=query.date_from||start.toISOString().slice(0,10),to=query.date_to||today;
  if(!dateValid(from)||!dateValid(to))throw new AppError('Choose valid start and end dates.');
  if(from>to)throw new AppError('Start date must be on or before end date.');
  if(query.health&&!healthValues.includes(query.health))throw new AppError('Choose a valid mangrove condition.');
  for(const key of ['cluster_id','species_id','barangay_id'])if(query[key]&&!/^\d+$/.test(String(query[key])))throw new AppError('Choose a valid site or species filter.');
  const personal=user.role==='guardian';
  const allowed=personal?rows.filter(r=>r.user_id===user.id):rows;
  const sites=new Map(clusters.filter(c=>!c.deleted_at&&!c.location_pending&&Number(c.active??1)!==0).map(c=>[c.id,c]));
  const inPeriod=r=>manilaDate(r.submitted_at)>=from&&manilaDate(r.submitted_at)<=to;
  const verifiedByEnd=r=>r.status==='verified'&&r.verified_at&&manilaDate(r.verified_at)<=to;
  const period=allowed.filter(inPeriod);
  const historical=allowed.filter(r=>verifiedByEnd(r)&&manilaDate(r.submitted_at)<=to).sort(chronological);
  const eligible=historical.filter(inPeriod);
  const latest=new Map();for(const r of eligible)if(sites.has(r.cluster_id))latest.set(r.cluster_id,r);
  const matching=(r)=> (!query.cluster_id||r.cluster_id===Number(query.cluster_id))&&(!query.barangay_id||r.barangay_id===Number(query.barangay_id))&&(!query.species_id||r.final_species_id===Number(query.species_id))&&(!query.health||healthOf(r)===query.health);
  const selectedIds=new Set([...latest].filter(([,r])=>matching(r)).map(([id])=>id));
  const scoped=r=>sites.has(r.cluster_id)?selectedIds.has(r.cluster_id):!query.cluster_id&&matching(r);
  const verified=eligible.filter(scoped);
  const health=distribution();for(const r of verified)health[healthOf(r)]++;
  const byId=new Map(historical.map(r=>[r.id,r])),resolved=new Set(allowed.filter(r=>r.status!=='rejected'&&manilaDate(r.submitted_at)<=to).map(r=>r.parent_report_id));
  const changeOf=r=>{
    const parent=byId.get(r.parent_report_id),rank={'Healthy':2,'Stressed':1,'At Risk':0};
    if(!parent||parent.cluster_id!==r.cluster_id||chronological(parent,r)>=0||rank[healthOf(parent)]==null||rank[healthOf(r)]==null)return 'Not comparable';
    return rank[healthOf(r)]>rank[healthOf(parent)]?'Improved':rank[healthOf(r)]<rank[healthOf(parent)]?'Declined':'Unchanged';
  };
  const siteRows=[...selectedIds].map(id=>{
    const c=sites.get(id),r=latest.get(id),condition=healthOf(r),follow=!!r.needs_follow_up&&!resolved.has(r.id);
    const priority=condition==='At Risk'?'High':condition==='Unknown'?'Insufficient data':condition==='Stressed'||follow?'Moderate':'Routine';
    const reason=condition==='Unknown'?'Latest verified visit has no confirmed health classification.':condition==='At Risk'?'Latest verified visit is At Risk.':condition==='Stressed'?'Latest verified visit is Stressed.':follow?'Another observation was requested and has not been submitted.':'Latest verified visit is Healthy with no outstanding follow-up request.';
    const lat=c.center_lat??c.latitude,lng=c.center_lng??c.longitude;
    const valid=lat!=null&&lng!=null&&Number.isFinite(Number(lat))&&Number.isFinite(Number(lng))&&Math.abs(Number(lat))<=90&&Math.abs(Number(lng))<=180;
    return {id,name:c.name,barangay_name:c.barangay_name,latest_health:condition,report_id:r.id,report_code:label(r),last_monitoring_date:manilaDate(r.submitted_at),verified_at:manilaDate(r.verified_at),trend:changeOf(r),priority,reason,
      needs_follow_up:follow,species_id:r.final_species_id??null,species_name:r.final_species_name??null,
      observed_alive_count:r.observed_alive_count??null,verified_count:verified.filter(v=>v.cluster_id===id).length,
      latitude:valid?Number(lat):null,longitude:valid?Number(lng):null};
  });
  const priorityOrder={'High':0,'Moderate':1,'Insufficient data':2,'Routine':3};
  siteRows.sort((a,b)=>priorityOrder[a.priority]-priorityOrder[b.priority]||a.name.localeCompare(b.name));
  const months=new Map();for(const r of verified){const key=manilaDate(r.submitted_at).slice(0,7);if(!months.has(key))months.set(key,{month:key,month_label:new Date(`${key}-01T00:00:00Z`).toLocaleDateString('en',{month:'short',year:'numeric',timeZone:'UTC'}),verified_reports:0,health:distribution(),survival_rate:null});const m=months.get(key);m.verified_reports++;m.health[healthOf(r)]++;}
  // Null months represent no monitoring, never zero trees or a carried-forward condition.
  const growth=[];const cursor=new Date(`${from.slice(0,7)}-01T00:00:00Z`);let monthCount=0;
  while(cursor.toISOString().slice(0,7)<=to.slice(0,7)&&monthCount++<1200){const key=cursor.toISOString().slice(0,7);growth.push(months.get(key)??{month:key,month_label:cursor.toLocaleDateString('en',{month:'short',year:'numeric',timeZone:'UTC'}),verified_reports:0,health:null,survival_rate:null});cursor.setUTCMonth(cursor.getUTCMonth()+1);}
  if(monthCount>1200)throw new AppError('Choose a monitoring period of 100 years or less.');
  const attention=siteRows.filter(c=>c.priority!=='Routine');
  const progress={followup_reports:verified.filter(r=>r.parent_report_id&&byId.get(r.parent_report_id)?.cluster_id===r.cluster_id).length,
    clusters_with_followups:new Set(verified.filter(r=>r.parent_report_id&&byId.get(r.parent_report_id)?.cluster_id===r.cluster_id&&sites.has(r.cluster_id)).map(r=>r.cluster_id)).size,
    awaiting_followup:siteRows.filter(c=>c.needs_follow_up).length,
    improved:siteRows.filter(c=>c.trend==='Improved').length,unchanged:siteRows.filter(c=>c.trend==='Unchanged').length,declined:siteRows.filter(c=>c.trend==='Declined').length};
  const latestHealth=distribution();for(const c of siteRows)latestHealth[c.latest_health]++;
  const options={clusters:[...sites.values()].filter(c=>!personal||allowed.some(r=>r.cluster_id===c.id)).map(c=>({id:c.id,name:c.name})),species:[...new Map(historical.filter(r=>r.final_species_id).map(r=>[r.final_species_id,{id:r.final_species_id,name:r.final_species_name||`Species #${r.final_species_id}`}])).values()]};
  return {scope:personal?'personal':'all_users',capabilities:{can_view_survival:!personal,can_export_pdf:user.role==='system_admin'},
    filters:{date_from:from,date_to:to,cluster_id:query.cluster_id||null,species_id:query.species_id||null,health:query.health||null,barangay_id:query.barangay_id||null},options,methodology:analyticsMethodology,
    verification:{total:verified.length,verified:verified.length,pending:period.filter(r=>r.status==='pending'&&matching(r)).length,rejected:period.filter(r=>r.status==='rejected'&&matching(r)).length,corrected:verified.filter(r=>r.corrected).length},
    report_ids:verified.map(r=>r.id),health,latest_health:latestHealth,monitored_clusters:siteRows.length,clusters_needing_attention:attention.length,clusters:siteRows,map:siteRows.filter(c=>c.latitude!=null),growth,progress,
    priority_areas:attention,high_risk:attention.map(c=>({...c,id:c.report_id,cluster_id:c.id,cluster_name:c.name,final_health:c.latest_health})),high_risk_total:attention.length,
    overall_survival:null,survival_eligible_clusters:0,survival_status:'Insufficient data',survival_reason:analyticsMethodology.survival,
    data_quality:{missing_verification_date:period.filter(r=>r.status==='verified'&&!r.verified_at).length,missing_map_coordinates:siteRows.filter(c=>c.latitude==null).length,unassigned_reports:verified.filter(r=>!sites.has(r.cluster_id)).length},
    insights:attention.map(c=>({cluster_id:c.id,report_id:c.report_id,title:`${c.name}: ${c.priority.toLowerCase()} priority`,evidence:`${c.reason} Recorded ${c.last_monitoring_date}.`,action:c.latest_health==='Unknown'?'Ask an expert to clarify the condition.':c.priority==='High'?'Prioritize a field assessment and review the recent photos.':'Arrange another observation and review the site timeline.'}))};
}
