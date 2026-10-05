import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';

export function argument(name) { const i = process.argv.indexOf(`--${name}`); return i >= 0 ? process.argv[i + 1] : undefined; }
export function context() {
  const projectId = argument('project');
  if (!projectId || !/^[a-z][a-z0-9-]{4,28}[a-z0-9]$/.test(projectId)) throw new Error('Pass --project with your Firebase project ID.');
  const emulator = projectId.startsWith('demo-');
  if (emulator && (!process.env.FIRESTORE_EMULATOR_HOST || !process.env.FIREBASE_AUTH_EMULATOR_HOST)) throw new Error('Demo projects must run inside the Firebase emulators.');
  if (!emulator && (process.env.FIRESTORE_EMULATOR_HOST || process.env.FIREBASE_AUTH_EMULATOR_HOST || process.env.FIREBASE_STORAGE_EMULATOR_HOST)) throw new Error('Unset emulator variables before accessing a real project.');
  const app = initializeApp({projectId, storageBucket: argument('bucket') ?? `${projectId}.firebasestorage.app`, ...(!emulator ? {credential: applicationDefault()} : {})});
  return {projectId, db: getFirestore(app), auth: getAuth(app), bucket: getStorage(app).bucket(), apply: process.argv.includes('--apply') || emulator};
}
