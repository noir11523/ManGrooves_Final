import { AppError } from './core/domain.js';
export class Auth {
  /** @param {any} client @param {null|(()=>any)} authClient */
  constructor(client, authClient = null) { this.client=client; this.authClient=authClient; }
  isolated() {
    // OTP methods establish sessions. Never run them on the shared admin client.
    if (!this.authClient) throw new AppError('Email sign-in is not configured yet.',503);
    return this.authClient().auth;
  }
  mailError(error) {
    if (!error) return;
    if (error.status===429) throw new AppError('Wait a minute before requesting another code.',429);
    if (['otp_expired','otp_disabled','invalid_credentials'].includes(error.code)) throw new AppError('That code is invalid or expired. Request a new one.');
    throw new AppError('Could not send or check the email code. Please try again later.',503);
  }
  async startSignup(email) {
    const {error}=await this.isolated().signInWithOtp({email,options:{shouldCreateUser:true}});this.mailError(error);
  }
  async resendSignup(email) { const {error}=await this.isolated().signInWithOtp({email,options:{shouldCreateUser:false}});this.mailError(error); }
  async verifyEmail(email,token,type='email') {
    const {data,error}=await this.isolated().verifyOtp({email,token,type}); this.mailError(error);
    if (!data?.user?.email_confirmed_at || !data.session?.access_token) throw new AppError('Verify your email before continuing.',401);
    return {uid:data.user.id,email:data.user.email,token:data.session.access_token};
  }
  async requestRecovery(email) {
    const {error}=await this.isolated().resetPasswordForEmail(email);
    // Do not reveal whether an email has an account.
    if(error?.code==='user_not_found') return;
    this.mailError(error);
  }
  async verifyIdToken(token) {
    // getUser validates this token with the project's Auth server, including bans.
    let result;
    try { result=await this.client.auth.getUser(token); }
    catch { throw new AppError('Sign-in service is unavailable. Please try again.',503); }
    const {data,error}=result;
    if(error&&(error.name==='AuthRetryableFetchError'||error.status>=500||error.status===0||!error.status&&!error.code)) {
      throw new AppError('Sign-in service is unavailable. Please try again.',503);
    }
    if(error?.status===429) throw new AppError('Too many attempts. Try again shortly.',429);
    if(error||!data?.user) throw new AppError('Sign in again.',401);
    const claims=JSON.parse(Buffer.from(token.split('.')[1],'base64url').toString());
    if(typeof claims.session_id!=='string') throw new AppError('Sign in again.',401);
    let session;
    try { session=await this.client.rpc('app_session_valid',{p_session:claims.session_id,p_user:data.user.id}); }
    catch { throw new AppError('Could not check your session. Please try again.',503); }
    if(session.error) throw new AppError('Could not check your session. Please try again.',503);
    if(!session.data) throw new AppError('Your session expired. Sign in again.',401);
    return {uid:data.user.id,email:data.user.email,email_verified:!!data.user.email_confirmed_at,
      auth_time:Math.max(0,...(claims.amr??[]).filter(a=>a.method==='password').map(a=>a.timestamp))};
  }
  async deleteUser(uid) { const {error}=await this.client.auth.admin.deleteUser(uid); if(error) throw error; }
  async updateUser(uid,input) {
    const {error}=await this.client.auth.admin.updateUserById(uid,{
      ...(input.password?{password:input.password}:{}),
      ...(input.disabled!==undefined?{ban_duration:input.disabled?'876000h':'none'}:{})});
    if(error) throw error;
  }
  async revokeRefreshTokens(uid) { const {error}=await this.client.rpc('app_revoke_sessions',{p_user:uid}); if(error) throw error; }
}
