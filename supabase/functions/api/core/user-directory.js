import {publicUser} from './domain.js';
import {filterRows} from './list-query.js';

export function userDirectory(users,barangays,badges,awards,applications,query={},reports=[]) {
  const places=new Map(barangays.map(b=>[b.id,b])),catalog=new Map(badges.map(b=>[b.id,b]));
  const apps=new Map(applications.map(a=>[a.uid,a])),byUser=new Map();
  for(const award of awards){const list=byUser.get(award.user_id)??[];const badge=catalog.get(award.badge_id);list.push({id:award.badge_id,name:award.badge_name_snapshot??badge?.badge_name??'Earned badge',code:badge?.code??'',earned_at:award.earned_at,description:badge?.description??'',threshold:badge?.threshold??null,metric:badge?.metric??null});byUser.set(award.user_id,list);}
  const totals=new Map();
  for(const report of reports){const count=totals.get(report.user_id)??{total:0,verified:0,pending:0,rejected:0};count.total++;if(Object.hasOwn(count,report.status)&&report.status!=='total')count[report.status]++;totals.set(report.user_id,count);}
  const summary={active_experts:users.filter(u=>u.role==='expert'&&u.status==='active').length,active_guardians:users.filter(u=>u.role==='guardian'&&u.status==='active').length,pending_experts:users.filter(u=>u.status==='pending_approval').length};
  let rows=users.map(user=>{
    const place=places.get(user.barangay_id),earned=byUser.get(user.id)??[],app=apps.get(user.uid);
    const names=earned.map(b=>b.code+' '+b.name).join(' ').toLowerCase();
    const badge_tier=['gold','silver','bronze'].find(t=>new RegExp(`\\b${t}[ _]`).test(names))??(earned.length?'other':'none');
    return {...publicUser(user),city_municipality:place?.city_municipality??user.city_municipality??null,province:place?.province??user.province??null,status:user.status,created_at:user.created_at??null,badges:earned,badge_tier,report_counts:totals.get(user.id)??{total:0,verified:0,pending:0,rejected:0},application_uid:app?.uid??null,application_status:app?.status??null,
      role_label:['pending_approval','rejected'].includes(user.status)?'Expert applicant':user.role==='expert'?'Expert':user.role==='guardian'?'Coastal Guardian':'Administrator'};
  });
  const fields=['full_name','email','phone','barangay_name','city_municipality','address_line'];
  const matches=filterRows(rows,query,fields,['status','barangay_id']);
  const typed=String(query.q??'').trim();
  // Local 09... and stored +639... numbers should find the same account.
  if(/^[+\d\s().-]+$/.test(typed)&&typed.replace(/\D/g,'').length>=4){
    const national=value=>String(value??'').replace(/\D/g,'').replace(/^(?:63|0)(?=9)/,'');
    const ids=new Set(matches.map(u=>u.id)),needle=national(typed);
    for(const user of filterRows(rows,{...query,q:''},fields,['status','barangay_id']))if(national(user.phone).includes(needle))ids.add(user.id);
    rows=rows.filter(u=>ids.has(u.id));
  }else rows=matches;
  if(query.role==='applicant')rows=rows.filter(u=>['pending_approval','rejected'].includes(u.status));
  else if(query.role)rows=rows.filter(u=>u.role===query.role&&!['pending_approval','rejected'].includes(u.status)&&(query.status||u.status==='active'));
  if(query.badge_tier)rows=rows.filter(u=>query.badge_tier==='earned'?u.badges.length>0:u.badge_tier===query.badge_tier);
  rows.sort((a,b)=>a.full_name.localeCompare(b.full_name)||a.id-b.id);
  return {rows,summary};
}
