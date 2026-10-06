import {AppError, text, password, integer, now, requireRole, publicUser} from './domain.js';
import {emailAddress} from './registration.js';

// Staff creation is an administrator action; public registration keeps its OTP flow.
export async function createStaff(service, actor, input) {
  requireRole(actor, 'system_admin');
  if (!['expert', 'system_admin'].includes(input.role)) throw new AppError('Choose Expert or Administrator.');
  const first_name=text(input.first_name,'a first name',80),last_name=text(input.last_name,'a last name',80);
  const email=emailAddress(input.email),pass=password(input.password);
  if(pass!==input.password_confirmation)throw new AppError('The passwords do not match.');
  const phone=text(input.phone??'','a phone number',30,false);
  if(phone&&!/^[0-9+() .-]{7,30}$/.test(phone))throw new AppError('Enter a valid phone number or leave it blank.');
  const barangay_id=integer(input.barangay_id,'barangay'),barangay=await service.get('barangays',barangay_id);
  if(!barangay)throw new AppError('Choose an available barangay.');
  const id_code=input.role==='expert'?text(input.expert_id_code,'the expert credential ID',80):null;
  if((await service.rows('users',[['email','==',email]])).length)throw new AppError('An account already uses this email.',409);
  await service.limited(`create-staff:${actor.uid}`,10);
  let created;
  try {
    created=await service.auth.createUser({email,password:pass,displayName:`${first_name} ${last_name}`});
    const [id]=await service.ids(),timestamp=now();
    const user={id,uid:created.uid,first_name,last_name,full_name:`${first_name} ${last_name}`,email,phone:phone||null,
      role:input.role,status:'active',barangay_id,barangay_name:barangay.name,created_at:timestamp,created_by:actor.id};
    await service.db.runTransaction(async tx=>{
      requireRole((await tx.get(service.ref('users',actor.uid))).data(),'system_admin');
      tx.create(service.ref('users',user.uid),user);
      if(id_code)tx.create(service.ref('expert_applications',user.uid),{id,user_id:id,uid:user.uid,full_name:user.full_name,email,
        id_code,status:'approved',created_at:timestamp,reviewed_at:timestamp,reviewer_id:actor.id,reviewer_name:actor.full_name,note:'Staff account approved by administrator.'});
      service.audit(tx,actor,'admin.staff_created','user',id,{role:user.role});
    });
    return {user:publicUser(user),message:'Staff account created. Share the sign-in details securely.'};
  } catch(error) {
    if(created)await service.auth.deleteUser(created.uid);
    throw error;
  }
}
