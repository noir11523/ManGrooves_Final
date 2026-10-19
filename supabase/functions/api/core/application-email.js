import {createHash} from 'node:crypto';
import {AppError, now, requireRole} from './domain.js';

export const emailNotice = status => ({
  sent: 'Email sent to the applicant.',
  sending: 'Email is being sent.',
  not_configured: 'Decision saved. Set up an email sender, then retry the email.',
  failed: 'Email could not be sent. You can retry.',
}[status] ?? 'Email not sent.');

// Claim the delivery separately from the decision: mail failures never undo a review.
export async function sendApplicationEmail(service, user, uid) {
  const ref=service.ref('expert_applications',uid);
  const application=await service.db.runTransaction(async tx=>{
    requireRole((await tx.get(service.ref('users',user.uid))).data(),'system_admin');
    const current=(await tx.get(ref)).data();
    if(!current || !['approved','rejected'].includes(current.status)) throw new AppError('Review the application first.',409);
    if(current.email_status==='sent') return null;
    if(current.email_status==='sending' && Date.now()-Date.parse(current.email_attempted_at)<120000) throw new AppError('This email is already being sent. Check again shortly.',409);
    tx.update(ref,{email_status:service.mailer?'sending':'not_configured',email_attempted_at:now()});
    return current;
  });
  if(!application) return 'sent';
  if(!service.mailer) return 'not_configured';
  let status='failed';
  try {
    const approved=application.status==='approved';
    const key=createHash('sha256').update(`${uid}:${application.reviewed_at}`).digest('hex');
    await service.mailer.send({
      to:application.email,
      subject:`ManGROOVES: expert application ${approved?'approved':'declined'}`,
      text:`Hello ${application.full_name},\n\nYour expert application has been ${approved?'approved':'declined'}.${application.note ? `\n\nMessage from the administrator:\n${application.note}` : ''}\n\n${approved?'You can now sign in to ManGROOVES with your registered email.':'Your expert access is not active. You can also read this reason when signing in to ManGROOVES.'}\n\nManGROOVES`,
      messageKey:key,
    });
    status='sent';
  } catch { /* Never expose provider errors, SMTP settings, or credentials. */ }
  await ref.update({email_status:status,...(status==='sent'?{email_sent_at:now()}:{})});
  return status;
}
