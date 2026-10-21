import {AppError,integer,text,password,publicUser,now,requireRole} from './domain.js';
import {sendImage,saveImage} from './uploads.js';
import {profileDetails} from './profile-fields.js';
import {sendApplicationEmail,emailNotice} from './application-email.js';

export const emailAddress=value=>{
  const email=text(value,'your email',190).toLowerCase();
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new AppError('Enter a valid email address.');
  return email;
};
export function emailCode(value) {
  if(typeof value!=='string'||!/^\d{6,8}$/.test(value.trim())) throw new AppError('Enter the code from your email.');
  return value.trim();
}
export function accountDetails(input) {
  const first_name=text(input.first_name,'your first name',80),last_name=text(input.last_name,'your last name',80);
  const email=emailAddress(input.email),pass=password(input.password);
  if(pass!==input.password_confirmation) throw new AppError('The passwords do not match.');
  if(![true,1,'1'].includes(input.privacy_consent)) throw new AppError('Read and accept the privacy notice.');
  return {first_name,last_name,email};
}
export async function registrationDetails(service,input) {
  const {first_name,last_name,email}=accountDetails(input);
  const role=input.role??'guardian';
  if(!['guardian','expert'].includes(role)) throw new AppError('Choose Guardian or Expert.');
  return {first_name,last_name,full_name:`${first_name} ${last_name}`,email,role,...await profileDetails(service,input)};
}
export async function startRegistration(service,input,ip) {
  await service.limited(`register:${ip}`,10);
  // New clients verify basic account details before asking for a profile.
  // Keep the complete-form route compatible with earlier installed apps.
  const details=input.stage==='account'?accountDetails(input):await registrationDetails(service,input);
  await service.limited(`email-code:${details.email}`,5);
  await service.auth.startSignup(details.email,input.password);
  return {message:'Check your email for the code.',verification_required:true};
}
export async function completeRegistration(service,input,files,claims) {
  if(!claims.email_verified) throw new AppError('Verify your email before continuing.',403);
  const details=await registrationDetails(service,input);
  if(details.email!==claims.email?.toLowerCase()) throw new AppError('Use the email you verified.',403);
  const ref=service.ref('users',claims.uid),existing=await service.get('users',claims.uid);
  if(existing) throw new AppError('Your account already exists. Sign in or use Forgot password.',409);
  const [id]=await service.ids(),user={...details,id,uid:claims.uid,status:details.role==='expert'?'pending_approval':'active',created_at:now(),privacy_consent_at:now(),email_verified_at:now()};
  if(details.role==='expert'&&!files.id_photo)throw new AppError('Upload a clear photo of your work or professional ID.');
  let proof;
  try {
  if(details.role==='expert')proof=await saveImage(service.bucket,files.id_photo,'expert_ids');
  await service.auth.updateUser(claims.uid,{password:password(input.password)});
  await service.db.runTransaction(async tx=>{
    if((await tx.get(ref)).exists) throw new AppError('Your account was already created. Sign in to continue.',409);
    tx.create(ref,user);
    if(details.role==='expert') tx.create(service.ref('expert_applications',claims.uid),{id,user_id:id,uid:claims.uid,full_name:user.full_name,email:user.email,id_path:proof.path,status:'pending',created_at:now()});
    service.audit(tx,user,'account.registered','user',id,{role:details.role,status:user.status});
  });
  } catch(error) {if(proof)await service.bucket.file(proof.path).delete({ignoreNotFound:true}).catch(()=>{});throw error;}
  await service.auth.revokeRefreshTokens(claims.uid);
  return {user:publicUser(user),pending_approval:user.status==='pending_approval',message:user.status==='active'?'Email verified. Your account is ready.':`Application submitted. Your expert application is under review. We'll email the decision and any admin note to ${user.email}. Check your Inbox and Spam folder for updates. You can also sign in to check your application status.`};
}
export function compareApplications(a,b) {
  const pending=a.status==='pending',otherPending=b.status==='pending';
  if(pending!==otherPending)return pending?-1:1;
  const dateA=String((pending?a.created_at:a.reviewed_at||a.created_at)||''),dateB=String((pending?b.created_at:b.reviewed_at||b.created_at)||'');
  return (pending?dateA.localeCompare(dateB):dateB.localeCompare(dateA))||String(a.uid).localeCompare(String(b.uid));
}
export async function expertApplications(service,user,input,res,query={}) {
  requireRole(user,'system_admin');
  if(!input) {
    const records=query.uid?[await service.get('expert_applications',text(query.uid,'the application',80))] : await service.rows('expert_applications');
    if(query.uid&&!records[0])throw new AppError('Application not found.',404);
    return {items:records.map(({id_path,...row})=>({...row,has_id_photo:!!id_path})).sort(compareApplications)};
  }
  const uid=text(input.uid,'the application',80),ref=service.ref('expert_applications',uid);
  const application=await service.get('expert_applications',uid);
  if(!application) throw new AppError('Application not found.',404);
  if(input.action==='retry_email') {
    await service.limited(`expert-email:${uid}`,5);
    const email_status=await sendApplicationEmail(service,user,uid);
    return {email_status,message:emailNotice(email_status)};
  }
  if(input.action==='photo') {
    if(!application.id_path) throw new AppError('This application uses an ID code.',404);
    await sendImage(service.bucket,application.id_path,res); return null;
  }
  if(!['approve','reject'].includes(input.action)) throw new AppError('Choose Approve or Decline.');
  const note=text(input.note??'','a reason',1000,input.action==='reject');
  await service.db.runTransaction(async tx=>{
    const actor=(await tx.get(service.ref('users',user.uid))).data();requireRole(actor,'system_admin');
    const current=(await tx.get(ref)).data(),target=(await tx.get(service.ref('users',uid))).data();
    if(current?.status!=='pending'||target?.status!=='pending_approval') throw new AppError('This application was already reviewed.',409);
    tx.update(ref,{status:input.action==='approve'?'approved':'rejected',note,reviewed_at:now(),reviewer_name:user.full_name,reviewer_id:user.id});
    tx.update(service.ref('users',uid),{status:input.action==='approve'?'active':'rejected',role:'expert'});
    service.audit(tx,user,`expert.${input.action}`,'user',target.id,{note});
  });
  await service.auth.revokeRefreshTokens(uid);
  const email_status=await sendApplicationEmail(service,user,uid);
  return {email_status,message:`${input.action==='approve'?'Expert approved. They can now sign in.':'Application declined. The applicant can read your reason when signing in.'} ${emailNotice(email_status)}`};
}
