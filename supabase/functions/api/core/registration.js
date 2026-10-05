import {AppError,integer,text,password,publicUser,now,requireRole} from './domain.js';
import {sendImage} from './uploads.js';

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
  const barangay_id=integer(input.barangay_id,'barangay'),barangay=await service.get('barangays',barangay_id);
  if(!barangay) throw new AppError('Choose an available barangay.');
  const phone=text(input.phone??'','your phone number',30,false);
  if(phone&&!/^[0-9+() .-]{7,30}$/.test(phone)) throw new AppError('Enter a valid phone number or leave it blank.');
  const expert_id_code=role==='expert'?text(input.expert_id_code,'your expert ID code',80):null;
  return {first_name,last_name,full_name:`${first_name} ${last_name}`,email,phone:phone||null,role,barangay_id,barangay_name:barangay.name,expert_id_code};
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
export async function completeRegistration(service,input,_files,claims) {
  if(!claims.email_verified) throw new AppError('Verify your email before continuing.',403);
  const {expert_id_code,...details}=await registrationDetails(service,input);
  if(details.email!==claims.email?.toLowerCase()) throw new AppError('Use the email you verified.',403);
  const ref=service.ref('users',claims.uid),existing=await service.get('users',claims.uid);
  if(existing) throw new AppError('Your account already exists. Sign in or use Forgot password.',409);
  const [id]=await service.ids(),user={...details,id,uid:claims.uid,status:details.role==='expert'?'pending_approval':'active',created_at:now(),privacy_consent_at:now(),email_verified_at:now()};
  await service.auth.updateUser(claims.uid,{password:password(input.password)});
  await service.db.runTransaction(async tx=>{
    if((await tx.get(ref)).exists) throw new AppError('Your account was already created. Sign in to continue.',409);
    tx.create(ref,user);
    if(details.role==='expert') tx.create(service.ref('expert_applications',claims.uid),{id,user_id:id,uid:claims.uid,full_name:user.full_name,email:user.email,id_code:expert_id_code,status:'pending',created_at:now()});
    service.audit(tx,user,'account.registered','user',id,{role:details.role,status:user.status});
  });
  await service.auth.revokeRefreshTokens(claims.uid);
  return {user:publicUser(user),pending_approval:user.status==='pending_approval',message:user.status==='active'?'Email verified. Your account is ready.':'Email verified. An administrator will review your expert ID code.'};
}
export async function expertApplications(service,user,input,res) {
  requireRole(user,'system_admin');
  if(!input) return {items:(await service.rows('expert_applications')).map(({id_path,...row})=>({...row,has_id_photo:!!id_path})).sort((a,b)=>b.created_at.localeCompare(a.created_at))};
  const uid=text(input.uid,'the application',80),ref=service.ref('expert_applications',uid);
  const application=await service.get('expert_applications',uid);
  if(!application) throw new AppError('Application not found.',404);
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
  return {message:input.action==='approve'?'Expert approved. They can now sign in.':'Application declined.'};
}
