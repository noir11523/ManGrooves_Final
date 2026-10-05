export function publicConfig(input) {
  const url=String(input.SUPABASE_URL??'').trim().replace(/\/+$/,'');
  if(input.BACKEND!=='supabase'||!/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(url)) {
    throw new Error('Use your Supabase Project URL, for example https://your-project-ref.supabase.co.');
  }
  const key=String(input.SUPABASE_PUBLISHABLE_KEY??'').trim();
  if(key.startsWith('sb_secret_')) throw new Error('Use the publishable key, never a secret key.');
  if(!key.startsWith('sb_publishable_')) {
    let claims;
    try { claims=JSON.parse(Buffer.from(key.split('.')[1],'base64url').toString()); } catch {}
    if(claims?.role!=='anon') throw new Error('Use a public publishable key or the legacy anon key.');
    if(claims.ref&&claims.ref!==new URL(url).hostname.split('.')[0]) throw new Error('The anon key belongs to a different project.');
  } else if(!/^sb_publishable_[a-zA-Z0-9_-]{12,}$/.test(key)) throw new Error('Copy the complete publishable key.');
  return {BACKEND:'supabase',SUPABASE_URL:url,SUPABASE_PUBLISHABLE_KEY:key};
}
