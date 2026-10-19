import nodemailer from 'nodemailer';

// A display name brands the message; the verified sending address stays visible
// in email details. Keep any explicit custom name configured in the sender secret.
export function brandedSender(value) {
  const from=String(value??'').trim();
  return /^[^<>\s@,;]+@[^<>\s@,;]+$/.test(from) ? `ManGROOVES <${from}>` : from;
}

// Configure with the SAME verified SMTP sender used by Supabase Auth.
export function smtpMailer(env,createTransport=options=>nodemailer.createTransport(options)) {
  const host=env('SMTP_HOST'),user=env('SMTP_USER'),pass=env('SMTP_PASS'),from=brandedSender(env('SMTP_FROM'));
  const port=Number(env('SMTP_PORT')||465);
  if(!host||!user||!pass||!from||!Number.isInteger(port)||port<1||port>65535) return null;
  if([25,587].includes(port)) return null; // Blocked on hosted Supabase Edge Functions.
  const transport=createTransport({host,port,secure:[465,2465].includes(port),requireTLS:true,
    auth:{user,pass},connectionTimeout:10000,greetingTimeout:10000,socketTimeout:15000,
    disableFileAccess:true,disableUrlAccess:true,logger:false,debug:false});
  return {async send({to,subject,text,messageKey}) {
    const result=await transport.sendMail({from,to,subject,text,messageId:`<expert-${messageKey}@mangrooves.local>`});
    if(!result.accepted?.length || result.rejected?.length) throw new Error('Email was not accepted.');
  }};
}

// Resend HTTPS avoids SMTP port restrictions. Credentials stay in Edge secrets.
export function applicationMailer(env,request=fetch) {
  const key=env('RESEND_API_KEY'),from=brandedSender(env('MAIL_FROM'));
  if(!key || !from) return smtpMailer(env);
  return {async send({to,subject,text,messageKey}) {
    const response=await request('https://api.resend.com/emails',{
      method:'POST',
      headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json','Idempotency-Key':`expert-decision/${messageKey}`},
      body:JSON.stringify({from,to:[to],subject,text}),
      signal:AbortSignal.timeout(15000),
    });
    if(!response.ok) throw new Error('Email was not accepted.');
    const result=await response.json();
    if(!result.id) throw new Error('Email was not accepted.');
  }};
}
