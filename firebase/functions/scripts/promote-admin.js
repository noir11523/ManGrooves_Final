import { context, argument } from './admin-context.js';
const {db, auth, projectId, apply} = context(), email = argument('email');
if (!email) throw new Error('Pass --email for a registered account.');
const account = await auth.getUserByEmail(email), ref = db.collection('users').doc(account.uid);
if (!(await ref.get()).exists) throw new Error('Register this account in ManGROOVES first.');
if (!apply) console.log(`Dry run: grant administrator access to the selected account in ${projectId}. Add --apply to proceed.`);
else {
  await db.runTransaction(async tx => {
    const snap = await tx.get(ref);
    tx.update(ref, {role: 'system_admin', status: 'active'});
    tx.create(db.collection('audit_logs').doc(), {user_id: snap.data().id, action: 'admin.bootstrap', entity_type: 'user', entity_id: snap.data().id, created_at: new Date().toISOString()});
  });
  await auth.updateUser(account.uid, {disabled: false});
  await auth.revokeRefreshTokens(account.uid);
  console.log('Administrator access granted. Sign in again.');
}
await db.terminate();
