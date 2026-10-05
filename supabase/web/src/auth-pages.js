import {api,login,friendly} from './client.js';
import {$,esc,field,select,errorBox,formValues,showError,toast} from './ui.js';

function bind(form,action){form.onsubmit=async event=>{
  event.preventDefault();const button=event.submitter??form.querySelector('[type=submit]');if(button.disabled)return;button.disabled=true;
  form.querySelector('.error').textContent='';
  try{await action(formValues(form));}catch(error){showError(form.querySelector('.error'),friendly(error));}finally{button.disabled=false;}
};}
function passwordField(name,label,{prefix='register',help=false,current=false}={}){
  const id=`${prefix}-${name}`;
  return `<div class="field registration-password"><label for="${id}">${label}</label><div class="password-control"><input id="${id}" name="${name}" type="password" required ${current?'autocomplete="current-password"':'minlength="8" maxlength="25" autocomplete="new-password"'} ${help?'aria-describedby="register-password-help"':''}><button type="button" class="password-toggle" aria-controls="${id}" aria-label="Show ${label.toLowerCase()}" aria-pressed="false"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/><path class="password-eye-slash" d="m3 3 18 18" hidden/></svg></button></div>${help?'<div class="password-length" role="progressbar" aria-label="Password length" aria-valuemin="0" aria-valuemax="8" aria-valuenow="0"><span></span></div><small id="register-password-help" aria-live="polite">Use 8 to 25 characters. No special symbols required.</small>':''}</div>`;
}
function bindPasswordToggles(form){
  form.querySelectorAll('.password-toggle').forEach(button=>button.addEventListener('click',()=>{
    const input=document.getElementById(button.getAttribute('aria-controls')),visible=input.type==='password';
    input.type=visible?'text':'password';button.setAttribute('aria-pressed',String(visible));
    button.setAttribute('aria-label',`${visible?'Hide':'Show'} ${input.name==='password'?'password':'confirm password'}`);
    button.querySelector('.password-eye-slash').toggleAttribute('hidden',!visible);
  }));
}
function bindRegistrationPasswords(form){
  bindPasswordToggles(form);
  const password=form.elements.password,meter=form.querySelector('.password-length'),help=document.getElementById('register-password-help');
  const update=()=>{
    const length=password.value.length,accepted=length>=8&&length<=25;
    meter.setAttribute('aria-valuenow',String(Math.min(length,8)));meter.classList.toggle('accepted',accepted);
    meter.firstElementChild.style.width=`${Math.min(length/8,1)*100}%`;
    help.textContent=accepted?'Password length accepted. No special symbols required.':'Use 8 to 25 characters. No special symbols required.';
  };
  password.addEventListener('input',update);password.addEventListener('change',update);update();
}
export function signInPage(layout){
  layout(`<a class="auth-back" href="#home"><span aria-hidden="true">←</span> Back to home</a>
    <header class="signin-heading"><span class="signin-mark" aria-hidden="true"><svg viewBox="0 0 24 24" width="27" height="27" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M20 4C10 2 3 6 5 14c2 7 14 7 15-10Z"/><path d="M4 21 15 10M9 16l-1-5M12 13h5"/></svg></span><h1>Sign in</h1><p>Welcome back to ManGROOVES.</p></header>
    <form id="login">${errorBox}${field('email','Email','','email','required autocomplete="username" autocapitalize="none" spellcheck="false" placeholder="you@example.com"')}${passwordField('password','Password',{prefix:'login',current:true})}
    <div class="signin-help"><a href="#forgot-password">Forgot password?</a></div>
    <button type="submit" class="signin-submit">Sign in</button></form>
    <div class="signin-join"><p>New to ManGROOVES?</p><a class="button outline" href="#register">Create account</a></div>`);
  $('.auth').classList.add('signin-card');
  const form=$('#login'),button=form.querySelector('[type=submit]');
  bindPasswordToggles(form);
  bind(form,async values=>{
    form.setAttribute('aria-busy','true');button.textContent='Signing in...';
    form.querySelectorAll('input').forEach(input=>input.readOnly=true);
    form.querySelector('.password-toggle').disabled=true;
    try{await login(values.email.trim(),values.password);}
    finally{form.removeAttribute('aria-busy');button.textContent='Sign in';form.querySelectorAll('input').forEach(input=>input.readOnly=false);form.querySelector('.password-toggle').disabled=false;}
  });
}
export async function registrationPage(layout) {
  layout('<h1>Create account</h1><p>Loading...</p>');const area=$('.auth');
  const config=await api('configuration.php',{anonymous:true});if(!area.isConnected)return;
  area.classList.add('registration-card');
  area.innerHTML=`<a class="auth-back" href="#login">&larr; Back to sign in</a>
    <ol class="account-steps" aria-label="Registration progress"><li>1. Account</li><li>2. Verify email</li><li>3. Profile</li></ol>
    <header class="registration-heading"><h1 id="registration-title" tabindex="-1">Create account</h1><p id="registration-description">Start with your name, email, and password.</p></header>
    <form id="registration">${errorBox}
      <fieldset data-step="0">
        <div class="row">${field('first_name','First name','','text','required maxlength="80" autocomplete="given-name"')}${field('last_name','Last name','','text','required maxlength="80" autocomplete="family-name"')}</div>
        ${field('email','Email','','email','required autocomplete="email" autocapitalize="none" spellcheck="false" placeholder="you@example.com"')}
        <div class="registration-passwords">${passwordField('password','Password',{help:true})}${passwordField('password_confirmation','Confirm password')}</div>
        <label class="registration-consent"><input type="checkbox" name="privacy_consent" value="1" required><span>I have read the <a href="#privacy" target="_blank" rel="noopener">privacy notice</a> and agree to the use of my account details, location, and field observations.</span></label>
      </fieldset>
      <fieldset data-step="1" hidden disabled>
        <p id="email-code-status" role="status"></p>
        <label class="field"><span>Verification code</span><input name="code" class="otp-input" type="text" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]{6}" maxlength="6" required aria-describedby="code-help" placeholder="000000"></label>
        <p class="muted" id="code-help">Check Inbox or Spam. The code expires in 10 minutes.</p>
      </fieldset>
      <fieldset data-step="2" hidden disabled>
        <p class="verified-email" id="verified-email"></p>
        ${select('role','Join as',[['guardian','Coastal Guardian'],['expert','Expert']])}
        <div id="expert-proof" hidden><p class="notice">Experts need admin approval. Only administrators can view your ID code.</p><label class="field"><span>Expert ID code</span><input type="text" name="expert_id_code" maxlength="80" autocomplete="off" spellcheck="false" aria-describedby="expert-id-help"><small id="expert-id-help">Use your work or professional ID number.</small></label></div>
        ${select('barangay_id','Barangay',[['','Choose your barangay'],...config.barangays.map(b=>[b.id,b.name])],'','required')}
        ${field('phone','Phone (optional)','','tel','maxlength="30" autocomplete="tel"')}
      </fieldset>
      <button type="submit" class="registration-submit" id="registration-submit">Continue</button>
      <div class="registration-secondary"><button type="button" class="outline" id="resend-code" hidden>Resend code</button><button type="button" class="outline" id="registration-back" hidden>Change email</button></div>
      <p class="registration-next muted" id="registration-next">We will send a verification code to your email.</p>
      <p class="registration-signin">Already have an account? <a href="#login">Sign in</a></p>
    </form>`;
  const form=$('#registration'),email=form.elements.email,code=form.elements.code,button=$('#registration-submit');
  const sets=[...form.querySelectorAll('fieldset')],steps=[...area.querySelectorAll('.account-steps li')];
  let step=0,busy=false,proof=null,account=null,sentEmail='',resendAfter=0,expiresAt=0,timer;
  bindRegistrationPasswords(form);
  const normalizedEmail=()=>email.value.trim().toLowerCase();
  const refresh=()=>{
    if(!form.isConnected){clearTimeout(timer);return;}
    sets.forEach((set,index)=>{set.hidden=index!==step;set.disabled=busy||index!==step;});
    steps.forEach((item,index)=>{item.classList.toggle('complete',index<step);if(index===step)item.setAttribute('aria-current','step');else item.removeAttribute('aria-current');});
    const expert=form.elements.role.value==='expert';
    $('#expert-proof').hidden=!expert;form.elements.expert_id_code.required=expert;
    form.elements.expert_id_code.disabled=busy||step!==2||!expert;
    button.disabled=busy;
    button.textContent=busy?(step===0?'Sending code...':step===1?'Verifying...':'Finishing...'):(step===0?'Continue':step===1?'Verify code':expert?'Submit expert application':'Finish registration');
    $('#registration-back').hidden=step===0;$('#registration-back').disabled=busy;
    $('#registration-back').textContent=step===1?'Change email':'Back to account';
    const seconds=Math.max(0,Math.ceil((resendAfter-Date.now())/1000));
    $('#resend-code').hidden=step!==1;$('#resend-code').disabled=busy||seconds>0;
    $('#resend-code').textContent=seconds?`Resend in ${seconds}s`:'Resend code';
    form.setAttribute('aria-busy',String(busy));
  };
  const move=target=>{
    step=target;form.querySelector('.error').textContent='';
    $('#registration-title').textContent=['Create account','Verify your email','Complete your profile'][step];
    $('#registration-description').textContent=['Start with your name, email, and password.','Enter the code from your email to continue.','Just a few more details before you begin.'][step];
    $('#registration-next').textContent=step===0?'We will send a verification code to your email.':step===1?'Keep this page open while you check your email.':form.elements.role.value==='expert'?'An administrator will review your application.':'Your account will be ready after this step.';
    $('#verified-email').textContent=`Email verified: ${sentEmail}`;
    refresh();$('#registration-title').focus();
  };
  const countdown=()=>{clearTimeout(timer);refresh();if(form.isConnected&&Date.now()<resendAfter){timer=setTimeout(countdown,1000);timer.unref?.();}};
  const run=async action=>{
    if(busy)return;busy=true;refresh();form.querySelector('.error').textContent='';
    try{await action();}catch(error){
      if(error.status===401&&step===2){proof=null;expiresAt=0;code.value='';move(1);}
      if(form.isConnected)showError(form.querySelector('.error'),error.status===401?'Verification expired. Request a new code to continue.':friendly(error));
    }finally{busy=false;refresh();}
  };
  const sendCode=async()=>{
    if(Date.now()<resendAfter)throw new Error('Wait a minute before requesting another code.');
    await api('register.php',{body:{...account,stage:'account'},anonymous:true});
    sentEmail=account.email;proof=null;expiresAt=0;code.value='';resendAfter=Date.now()+60000;
    $('#email-code-status').textContent=`We sent a 6-digit verification code to ${sentEmail}.`;
    countdown();move(1);
  };
  const changed=()=>{if(sentEmail&&normalizedEmail()!==sentEmail){proof=null;expiresAt=0;sentEmail='';code.value='';}};
  email.addEventListener('input',changed);email.addEventListener('change',changed);
  form.elements.role.onchange=()=>{refresh();$('#registration-next').textContent=form.elements.role.value==='expert'?'An administrator will review your application.':'Your account will be ready after this step.';};
  code.addEventListener('input',()=>{code.value=code.value.replace(/\D/g,'').slice(0,6);});
  $('#registration-back').onclick=()=>{if(!busy)move(0);};
  $('#resend-code').onclick=()=>run(sendCode);
  form.onsubmit=event=>{
    event.preventDefault();if(busy||!form.reportValidity())return;
    const values=formValues(form);
    return run(async()=>{
      if(step===0){
        if(!values.first_name.trim()||!values.last_name.trim())throw new Error('Enter your first and last name.');
        if(values.password!==values.password_confirmation)throw new Error('The passwords do not match.');
        account={...values,email:normalizedEmail()};
        if(proof&&sentEmail===account.email&&Date.now()<expiresAt){move(2);return;}
        // Returning to edit a name/password should reuse the code already sent.
        if(sentEmail===account.email&&Date.now()<resendAfter){move(1);return;}
        await sendCode();return;
      }
      if(step===1){
        const result=await api('verify-email.php',{body:{email:sentEmail,code:values.code},anonymous:true});
        if(!result.verification_token)throw new Error('Could not verify the code. Try again.');
        proof=result.verification_token;expiresAt=Date.now()+50*60000;move(2);return;
      }
      if(!proof||Date.now()>=expiresAt){proof=null;move(1);throw new Error('Verification expired. Request a new code to continue.');}
      const details={...account,...values,email:sentEmail};delete details.code;
      if(details.role==='expert'){details.expert_id_code=details.expert_id_code.trim();if(!details.expert_id_code)throw new Error('Enter your expert ID code.');}
      else delete details.expert_id_code;
      const result=await api('complete-registration.php',{body:details,token:proof,anonymous:true});
      clearTimeout(timer);proof=null;
      if(result.pending_approval){area.innerHTML='<h1>Application sent</h1><p>Your email is verified. An administrator will review your expert ID code before you can sign in.</p><a class="button registration-submit" href="#login">Back to sign in</a>';return;}
      // Creation has succeeded. A sign-in failure must never resubmit the profile.
      area.innerHTML='<h1>Account created</h1><p role="status">Opening your dashboard...</p><div class="error" role="alert"></div><button type="button" class="registration-submit" id="open-dashboard" hidden>Continue to dashboard</button>';
      const retry=area.querySelector('#open-dashboard'),status=area.querySelector('[role=status]');
      let signingIn=false;
      const openDashboard=async()=>{
        if(signingIn||!area.isConnected)return;
        signingIn=true;retry.hidden=true;retry.disabled=true;
        area.querySelector('.error').textContent='';status.textContent='Opening your dashboard...';
        try{await login(details.email,details.password);toast('Welcome to ManGROOVES!');}
        catch(error){
          if(area.isConnected){status.textContent='Your account is ready.';showError(area.querySelector('.error'),`Could not open your dashboard. ${friendly(error)}`);retry.hidden=false;retry.disabled=false;}
        }finally{signingIn=false;}
      };
      retry.onclick=openDashboard;
      await openDashboard();
    });
  };
  refresh();
}

export function recoveryPage(layout){
  layout(`<h1>Forgot password?</h1><p>We will email you a reset code.</p><form id="recovery">${errorBox}${field('email','Email','','email','required autocomplete="email"')}<div id="reset-fields" hidden>${field('code','Email code','','text','inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]{6,8}" maxlength="8"')}${field('password','New password','','password','minlength="8" maxlength="25" autocomplete="new-password"')}${field('password_confirmation','Confirm password','','password','minlength="8" maxlength="25" autocomplete="new-password"')}</div><p id="recovery-status" role="status"></p><div class="actions"><button type="submit" id="recovery-submit">Send reset code</button><button type="button" id="reset-resend" class="outline" hidden>Resend code</button><a href="#login">Back to sign in</a></div></form>`);
  let sent=false,resendAfter=0;
  async function sendCode(){if(Date.now()<resendAfter)throw new Error('Wait a minute before requesting another code.');const result=await api('forgot-password.php',{body:{email:$('#recovery [name=email]').value},anonymous:true});resendAfter=Date.now()+60000;$('#recovery-status').textContent=result.message;}
  $('#reset-resend').onclick=async()=>{try{await sendCode();}catch(e){showError($('#recovery .error'),friendly(e));}};
  bind($('#recovery'),async values=>{
    if(!sent){await sendCode();sent=true;$('#reset-fields').hidden=false;$('#reset-resend').hidden=false;$('#recovery [name=email]').readOnly=true;$('#reset-fields').querySelectorAll('input').forEach(i=>i.required=true);$('#recovery-submit').textContent='Reset password';return;}
    if(values.password!==values.password_confirmation)throw new Error('The passwords do not match.');
    await api('reset-password.php',{body:values,anonymous:true});toast('Password changed. Sign in with your new password.');location.hash='login';
  });
}
