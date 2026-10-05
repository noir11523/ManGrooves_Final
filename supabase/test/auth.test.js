import test from 'node:test';
import assert from 'node:assert/strict';
import {Auth} from '../functions/api/auth.js';
test('API validates Auth tokens and rejects revoked sessions; refresh is not password reauthentication',async()=>{
 let valid=true,live=true;
 const client={auth:{async getUser(){return valid?{data:{user:{id:'uid',email:'test@example.test'}}}:{error:{status:401,code:'bad_jwt'}};}},
   async rpc(name,args){assert.equal(name,'app_session_valid');assert.equal(args.p_user,'uid');assert.equal(args.p_session,'session');return {data:live};}};
 const auth=new Auth(client),token=claims=>`x.${Buffer.from(JSON.stringify(claims)).toString('base64url')}.x`;
 const value=token({session_id:'session',iat:9000,amr:[{method:'password',timestamp:10},{method:'token_refresh',timestamp:9000}]});
 assert.deepEqual(await auth.verifyIdToken(value),{uid:'uid',email:'test@example.test',email_verified:false,auth_time:10});
 live=false;await assert.rejects(auth.verifyIdToken(value),/session expired/);
 valid=false;await assert.rejects(auth.verifyIdToken(value),/Sign in/);
});
test('temporary Auth or session database errors stay recoverable instead of reporting invalid credentials',async()=>{
 const token=`x.${Buffer.from(JSON.stringify({session_id:'session'})).toString('base64url')}.x`;
 const cases=[
   {auth:{async getUser(){throw new TypeError('offline');}}},
   {auth:{async getUser(){return {error:{name:'AuthRetryableFetchError',status:503}};}}},
   {auth:{async getUser(){return {data:{user:{id:'uid'}}};}},async rpc(){return {error:{code:'PGRST000'}};}},
 ];
 for(const client of cases) await assert.rejects(new Auth(client).verifyIdToken(token),e=>e.status===503);
});

test('email OTP and recovery use isolated clients without replacing the admin session',async()=>{
 const calls=[];let clients=0;
 const auth=new Auth({auth:{signInWithOtp(){throw new Error('Shared admin client must not sign in');}}},()=>{
  clients++;
  return {auth:{
   async signInWithOtp(input){calls.push(input);return {};},
   async resetPasswordForEmail(email){calls.push(email);return {};},
   async verifyOtp(input){calls.push(input);return {data:{user:{id:'uid',email:input.email,email_confirmed_at:'2026-10-03'},session:{access_token:'proof'}}};},
  }};
 });
 await auth.startSignup('user@example.test');await auth.resendSignup('user@example.test');
 await auth.verifyEmail('user@example.test','123456');await auth.verifyEmail('user@example.test','234567','recovery');
 await auth.requestRecovery('user@example.test');
 assert.equal(clients,5);assert.equal(calls[0].options.shouldCreateUser,true);assert.equal(calls[1].options.shouldCreateUser,false);
 assert.equal(calls[2].type,'email');assert.equal(calls[3].type,'recovery');
});
