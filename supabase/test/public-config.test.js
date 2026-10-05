import test from 'node:test';
import assert from 'node:assert/strict';
import {publicConfig} from '../scripts/public-config.js';
test('shared public config normalizes URLs and rejects privileged or mismatched keys',()=>{
 const config={BACKEND:'supabase',SUPABASE_URL:' https://example.supabase.co/ ',SUPABASE_PUBLISHABLE_KEY:'sb_publishable_examplepublickey'};
 assert.equal(publicConfig(config).SUPABASE_URL,'https://example.supabase.co');
 for(const key of ['sb_secret_private','',`x.${Buffer.from('{"role":"service_role"}').toString('base64url')}.x`]) {
   assert.throws(()=>publicConfig({...config,SUPABASE_PUBLISHABLE_KEY:key}));
 }
 const token=claims=>`x.${Buffer.from(JSON.stringify(claims)).toString('base64url')}.x`;
 assert.equal(publicConfig({...config,SUPABASE_PUBLISHABLE_KEY:token({role:'anon',ref:'example'})}).BACKEND,'supabase');
 assert.throws(()=>publicConfig({...config,SUPABASE_PUBLISHABLE_KEY:token({role:'anon',ref:'different'})}),/different project/);
 assert.throws(()=>publicConfig({...config,SUPABASE_URL:'http://192.168.1.1'}));
});
