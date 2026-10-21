import {AppError, text, password, integer, now, requireRole, publicUser} from './domain.js';
import {emailAddress} from './registration.js';
import {profileDetails} from './profile-fields.js';
import {saveImage} from './uploads.js';

// Staff creation is an administrator action; public registration keeps its OTP flow.
export async function createStaff(service, actor, input, files={}) {
  requireRole(actor, 'system_admin');
  if (!['expert', 'system_admin'].includes(input.role)) throw new AppError('Choose Expert or Administrator.');
  const first_name=text(input.first_name,'a first name',80),last_name=text(input.last_name,'a last name',80);
  const email=emailAddress(input.email),pass=password(input.password);
  if(pass!==input.password_confirmation)throw new AppError('The passwords do not match.');
  const profile=await profileDetails(service,input);
  if((await service.rows('users',[['email','==',email]])).length)throw new AppError('An account already uses this email.',409);
  if(input.role==='expert'&&!files.id_photo)throw new AppError('Upload the expert work or professional ID photo.');
  await service.limited(`create-staff:${actor.uid}`,10);
  let created,proof;
  try {
    if(input.role==='expert')proof=await saveImage(service.bucket,files.id_photo,'expert_ids');
    created=await service.auth.createUser({email,password:pass,displayName:`${first_name} ${last_name}`});
    const [id]=await service.ids(),timestamp=now();
    const user={id,uid:created.uid,first_name,last_name,full_name:`${first_name} ${last_name}`,email,...profile,
      role:input.role,status:'active',created_at:timestamp,created_by:actor.id};
    await service.db.runTransaction(async tx=>{
      requireRole((await tx.get(service.ref('users',actor.uid))).data(),'system_admin');
      tx.create(service.ref('users',user.uid),user);
      if(proof)tx.create(service.ref('expert_applications',user.uid),{id,user_id:id,uid:user.uid,full_name:user.full_name,email,
        id_path:proof.path,status:'approved',created_at:timestamp,reviewed_at:timestamp,reviewer_id:actor.id,reviewer_name:actor.full_name,note:'Staff account approved by administrator.'});
      service.audit(tx,actor,'admin.staff_created','user',id,{role:user.role});
    });
    return {user:publicUser(user),message:'Staff account created. Share the sign-in details securely.'};
  } catch(error) {
    if(proof)await service.bucket.file(proof.path).delete({ignoreNotFound:true}).catch(()=>{});
    if(created)await service.auth.deleteUser(created.uid);
    throw error;
  }
}
