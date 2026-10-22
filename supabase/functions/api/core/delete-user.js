import {AppError,integer,now,requireRole} from './domain.js';

// Reserve the account in a transaction before calling Auth. A deleting account
// cannot authenticate or be changed by another administrator while Auth runs.
export async function deleteUser(service,actor,input) {
  requireRole(actor,'system_admin');
  const id=integer(input.id,'user');
  if(id===actor.id)throw new AppError('You cannot delete your own account. Ask another administrator.');
  let target;
  await service.db.runTransaction(async tx=>{
    requireRole((await tx.get(service.ref('users',actor.uid))).data(),'system_admin');
    const users=await service.transactionRows(tx,'users');
    target=users.find(u=>u.id===id);
    if(!target)throw new AppError('Account not found. Refresh the Users list.',404);
    if(input.confirm_email!==target.email)throw new AppError('Confirm the account email before deleting.');
    if(target.status==='deleting')throw new AppError('This account is already being deleted. Refresh the list shortly.',409);
    if(target.role==='system_admin'&&!users.some(u=>u.id!==id&&u.role==='system_admin'&&u.status==='active'))throw new AppError('Keep at least one active administrator.');
    tx.update(service.ref('users',target.uid),{status:'deleting',deletion_started_at:now()});
  });
  try {
    await service.auth.deleteUser(target.uid);
  } catch {
    // An Auth outage must not silently turn Delete into Suspend.
    await service.db.runTransaction(async tx=>{
      const current=(await tx.get(service.ref('users',target.uid))).data();
      if(current?.status==='deleting')tx.update(service.ref('users',target.uid),{status:target.status,deletion_started_at:null});
    });
    throw new AppError('Could not confirm account deletion. Refresh the Users list before trying again.',503);
  }
  // Supabase's Auth trigger also removes these; explicit deletion supports the
  // local test adapter and makes cleanup idempotent if the records are absent.
  const batch=service.db.batch();
  batch.delete(service.ref('users',target.uid));
  batch.delete(service.ref('expert_applications',target.uid));
  service.audit(batch,actor,'admin.user_deleted','user',id,{reports_preserved:true});
  await batch.commit();
  return {message:'User deleted. Existing reports and review history are kept.'};
}
