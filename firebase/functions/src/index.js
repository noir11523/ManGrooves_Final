import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { onRequest } from 'firebase-functions/v2/https';
import { onDocumentWritten } from 'firebase-functions/v2/firestore';
import { createApi } from './api.js';
import { Service } from './service.js';

const admin = initializeApp();
const projectId = admin.options.projectId ?? process.env.GCLOUD_PROJECT;
const app = createApi({db: getFirestore(), auth: getAuth(), bucket: getStorage().bucket(), projectId});
export const api = onRequest({region: 'asia-southeast1', memory: '512MiB', timeoutSeconds: 120,
  minInstances: 0, maxInstances: 10, invoker: 'public'}, app);

// Retry-safe awards when verification crosses a milestone, even if the
// guardian has not opened the badges screen yet.
export const awardBadges = onDocumentWritten({document: 'reports/{reportId}', region: 'asia-southeast1',
  memory: '256MiB', maxInstances: 3, retry: true}, async event => {
  const before = event.data?.before.data(), after = event.data?.after.data();
  if (after?.status !== 'verified' || before?.status === 'verified') return;
  const service = new Service(getFirestore(), getAuth(), getStorage().bucket());
  const migration = await service.get('meta', 'migration');
  if (migration?.status === 'running' || after.migration_hash) return;
  const user = await service.get('users', after.uid);
  if (user?.role === 'guardian' && user.status === 'active') await service.badges(user);
});
