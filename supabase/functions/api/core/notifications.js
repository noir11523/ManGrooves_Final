import {createHash} from 'node:crypto';
import {now, requireRole} from './domain.js';
import {newest, reportLabel} from './analytics.js';
import {followUpAvailable} from './follow-up.js';

export const followUpKey = report => `followup_${report.id}${report.follow_up_requested_at ? `_${report.follow_up_requested_at}` : ''}`;
const staff = user => ['expert','system_admin'].includes(user.role);
const reviewNotice = notice => notice.type === 'report_ready' || /^review_\d+$/.test(notice.type??'');
const followUpNotice = notice => ['followup_requested','followup_due','followup_due_soon','followup_overdue'].includes(notice.type) || /^followup_\d+/.test(notice.type??'');
const obsoleteFollowUp = (notice,report) => !report || !followUpAvailable(report)
  || (notice.event_key ? notice.event_key!==followUpKey(report)
    : !!report.follow_up_requested_at&&Date.parse(notice.created_at)<Date.parse(report.follow_up_requested_at));

// The claim and notice must commit with the event, or together during catch-up.
export async function queueNotification(service, tx, id, userId, key, type, title, message, reportId=null, extra={}) {
  const claim=service.ref('notification_keys',`${userId}_${key}`);
  if((await tx.get(claim)).exists)return false;
  tx.create(claim,{id});
  service.notification(tx,id,userId,type,title,message,reportId,{...extra,event_key:key});
  return true;
}

export function notificationTarget(notice,user,reports,applications) {
  if(notice.type==='expert_application')return user.role==='system_admin'&&applications.has(notice.application_uid)
    ?{page:'expert-applications',uid:notice.application_uid}:null;
  if(notice.type==='badge_earned')return ['guardian','expert'].includes(user.role)?{page:'badges'}:null;
  const report=reports.get(notice.report_id);
  if(report&&(report.user_id===user.id||staff(user)))return {page:'report',id:report.id,
    review:reviewNotice(notice)&&staff(user)&&report.user_id!==user.id&&report.status==='pending'};
  return null;
}

export async function userNotifications(service,user) {
  const reports=await service.rows('reports',staff(user)?[]:[['user_id','==',user.id]]);
  const reportMap=new Map(reports.map(r=>[r.id,r]));
  const applications=user.role==='system_admin'?await service.rows('expert_applications'):[];
  const appMap=new Map(applications.map(a=>[a.uid,a]));
  const candidates=[];
  if(staff(user))for(const r of reports.filter(r=>r.status==='pending'&&r.user_id!==user.id))candidates.push({
    key:`review_${r.id}`,type:'report_ready',title:'Report ready for review',message:`${reportLabel({...r,display_report_number:r.staff_report_number??r.id})} needs a condition and species check.`,report:r,
    valid:async tx=>{const current=(await tx.get(service.ref('reports',r.id))).data();return current?.status==='pending'&&current.user_id!==user.id;},
  });
  if(['guardian','expert'].includes(user.role))for(const r of reports.filter(r=>r.user_id===user.id&&followUpAvailable(r)))candidates.push({
    key:followUpKey(r),type:'followup_requested',title:'Follow-up requested',message:`Another observation was requested for ${r.cluster_name||r.sitio_name||reportLabel(r)}.`,report:r,
    valid:async tx=>{const current=(await tx.get(service.ref('reports',r.id))).data();return current?.user_id===user.id&&followUpAvailable(current)&&followUpKey(current)===followUpKey(r);},
  });
  if(user.role==='system_admin')for(const application of applications.filter(a=>a.status==='pending')){
    const profile=await service.get('users',application.uid);
    if(profile?.status!=='pending_approval'||profile.role!=='expert')continue;
    candidates.push({
    key:`expert_application_${application.uid}`,type:'expert_application',title:'New expert application',message:`${application.full_name||'An applicant'} is waiting for approval.`,extra:{application_uid:application.uid},
    valid:async tx=>{const a=(await tx.get(service.ref('expert_applications',application.uid))).data(),profile=(await tx.get(service.ref('users',application.uid))).data();return a?.status==='pending'&&profile?.status==='pending_approval'&&profile.role==='expert';},
    });
  }
  for(const c of candidates){
    if((await service.ref('notification_keys',`${user.id}_${c.key}`).get()).exists)continue;
    const [id]=await service.ids();
    await service.db.runTransaction(async tx=>{
      const actor=(await tx.get(service.ref('users',user.uid))).data();requireRole(actor,user.role);
      if(!await c.valid(tx))return;
      await queueNotification(service,tx,id,user.id,c.key,c.type,c.title,c.message,c.report?.id??null,c.extra);
    });
  }
  let notices=await service.rows('notifications',[['user_id','==',user.id]]);
  // A review completed on another device should not remain an unread task.
  const obsolete=notices.filter(n=>!n.read_at&&(
    reviewNotice(n)&&(!staff(user)||!reportMap.has(n.report_id)||reportMap.get(n.report_id).status!=='pending'||reportMap.get(n.report_id).user_id===user.id)
    ||followUpNotice(n)&&obsoleteFollowUp(n,reportMap.get(n.report_id))
    ||n.type==='expert_application'&&(user.role!=='system_admin'||appMap.get(n.application_uid)?.status!=='pending')
  ));
  for(let start=0;start<obsolete.length;start+=400){
    const batch=service.db.batch();for(const n of obsolete.slice(start,start+400))batch.update(service.ref('notifications',n.id),{read_at:now()});await batch.commit();
  }
  if(obsolete.length)notices=await service.rows('notifications',[['user_id','==',user.id]]);
  return notices.sort(newest).map(n=>({...n,target:notificationTarget(n,user,reportMap,appMap)}));
}

export function notificationSummary(notices) {
  return {unread:notices.filter(n=>!n.read_at).length,total:notices.length,
    revision:createHash('sha256').update(JSON.stringify(notices.map(n=>[n.id,n.read_at,n.target]))).digest('hex')};
}
