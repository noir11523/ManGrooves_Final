import { initializeApp } from 'firebase/app';
import { getAuth, connectAuthEmulator, signInWithEmailAndPassword, signOut, reauthenticateWithCredential, EmailAuthProvider, onAuthStateChanged } from 'firebase/auth';

let auth;
export async function initialize(onChange) {
  let config;
  if (__FIREBASE_EMULATOR__) {
    if (!['localhost', '127.0.0.1'].includes(location.hostname)) throw new Error('This is a local test build. Deploy a production build.');
    config = {apiKey: 'demo-api-key', projectId: 'demo-mangrooves', authDomain: 'demo-mangrooves.firebaseapp.com', appId: 'demo-mangrooves-web'};
  } else {
    const response = await fetch('/__/firebase/init.json', {cache: 'no-store'});
    if (!response.ok) throw new Error('Firebase setup is not finished. Deploy this website to Firebase Hosting.');
    config = await response.json();
    if (!config.apiKey || !config.projectId) throw new Error('Register a web app in your Firebase project, then deploy again.');
  }
  auth = getAuth(initializeApp(config));
  if (__FIREBASE_EMULATOR__) connectAuthEmulator(auth, 'http://127.0.0.1:9099', {disableWarnings: true});
  onAuthStateChanged(auth, onChange);
}
export async function api(path, {body, query, anonymous = false, blob = false} = {}) {
  const url = new URL(`/mobile-api/${path}`, location.origin);
  for (const [key, value] of Object.entries(query ?? {})) if (value !== '' && value != null) url.searchParams.set(key, value);
  const headers = {Accept: blob ? '*/*' : 'application/json'};
  if (!anonymous) {
    if (!auth.currentUser) throw new Error('Sign in to continue.');
    headers.Authorization = `Bearer ${await auth.currentUser.getIdToken()}`;
  }
  if (body && !(body instanceof FormData)) headers['Content-Type'] = 'application/json';
  const response = await fetch(url, {method: body ? 'POST' : 'GET', headers, body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(body instanceof FormData ? 120000 : 60000)});
  if (blob && response.ok) return response.blob();
  let data;
  try { data = await response.json(); } catch { throw new Error('Could not reach ManGROOVES. Check your connection.'); }
  if (!response.ok || !data.ok) throw new Error(data.message ?? 'Could not complete the request.');
  return data;
}
export async function login(email, password) { return signInWithEmailAndPassword(auth, email, password); }
export async function logout() { await signOut(auth); }
export async function changePassword(current, next, confirmation) {
  if (current === next) throw new Error('Choose a different new password.');
  if (next !== confirmation) throw new Error('The new passwords do not match.');
  await reauthenticateWithCredential(auth.currentUser, EmailAuthProvider.credential(auth.currentUser.email, current));
  await auth.currentUser.getIdToken(true);
  const result = await api('account-security.php', {body: {action: 'password', new_password: next, new_password_confirmation: confirmation}});
  await logout(); return result;
}
export function friendly(error) {
  const code = error?.code;
  if (['auth/invalid-credential', 'auth/wrong-password', 'auth/user-not-found'].includes(code)) return 'Email or password is incorrect.';
  if (code === 'auth/too-many-requests') return 'Too many attempts. Try again later.';
  if (code === 'auth/operation-not-allowed') return 'Email sign-in is not enabled in Firebase yet.';
  if (code === 'auth/network-request-failed' || error instanceof TypeError) return 'Check your internet connection and try again.';
  return error?.message ?? 'Could not complete the request.';
}
