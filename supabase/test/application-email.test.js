import test from 'node:test';
import assert from 'node:assert/strict';
import nodemailer from 'nodemailer';
import {sendApplicationEmail} from '../functions/api/core/application-email.js';
import {smtpMailer,applicationMailer} from '../functions/api/mail.js';

function fixture(application,mailer=null) {
  const records={users:{admin:{uid:'admin',id:1,role:'system_admin',status:'active'}},expert_applications:{applicant:{...application}}};
  const ref=(collection,id)=>({collection,id,async update(data){Object.assign(records[collection][id],data);}});
  return {records,ref,mailer,db:{async runTransaction(run){
    return run({
      async get(r){return {data:()=>records[r.collection]?.[r.id]};},
      update(r,data){Object.assign(records[r.collection][r.id],data);},
    });
  }}};
}
const application={status:'rejected',note:'Please provide a current ID.',full_name:'Sample Applicant',email:'applicant@example.test',reviewed_at:'2026-10-13T00:00:00Z'};

test('Resend sends the decision with a stable retry key and reports provider failures safely',async()=>{
  const calls=[],env=name=>({RESEND_API_KEY:'test-key',MAIL_FROM:'ManGROOVES <sender@example.test>'})[name];
  const mailer=applicationMailer(env,async(url,options)=>{calls.push({url,...options});return {ok:true,json:async()=>({id:'email-1'})};});
  const message={to:'applicant@example.test',subject:'Application declined',text:'Please provide a current ID.',messageKey:'same-decision'};
  await mailer.send(message);await mailer.send(message);
  assert.equal(calls[0].url,'https://api.resend.com/emails');
  assert.equal(calls[0].headers['Idempotency-Key'],calls[1].headers['Idempotency-Key']);
  assert.deepEqual(JSON.parse(calls[0].body),{from:'ManGROOVES <sender@example.test>',to:[message.to],subject:message.subject,text:message.text});
  await assert.rejects(applicationMailer(env,async()=>({ok:false})).send(message),/^Error: Email was not accepted\.$/);
  assert.equal(applicationMailer(()=>undefined),null);
});

test('SMTP rejects blocked Edge ports while allowing secure provider ports',()=>{
  const settings={SMTP_HOST:'smtp.example.test',SMTP_USER:'test',SMTP_PASS:'test',SMTP_FROM:'sender@example.test'};
  for(const port of ['25','587']) assert.equal(smtpMailer(name=>({...settings,SMTP_PORT:port})[name]),null);
  assert.ok(smtpMailer(name=>settings[name]));
  assert.ok(smtpMailer(name=>({...settings,SMTP_PORT:'2465'})[name]));
});

test('SMTP brands bare sender addresses while keeping the real mailbox and applicant recipient',async()=>{
  const compiled=[],transport=nodemailer.createTransport({streamTransport:true,buffer:true,newline:'unix'});
  const settings={SMTP_HOST:'smtp.example.test',SMTP_USER:'sender@example.test',SMTP_PASS:'test',SMTP_FROM:'sender@example.test'};
  const factory=()=>({async sendMail(message){
    const result=await transport.sendMail(message);compiled.push(result);
    return {accepted:result.envelope.to,rejected:[]};
  }});
  const message={to:'applicant@example.test',subject:'Application decision',text:'Admin note',messageKey:'test-decision'};
  await smtpMailer(name=>settings[name],factory).send(message);
  assert.match(compiled[0].message.toString(),/^From: ManGROOVES <sender@example.test>$/m);
  assert.equal(compiled[0].envelope.from,'sender@example.test');
  assert.deepEqual(compiled[0].envelope.to,['applicant@example.test']);
  settings.SMTP_FROM='ManGROOVES Team <sender@example.test>';
  await smtpMailer(name=>settings[name],factory).send(message);
  assert.match(compiled[1].message.toString(),/^From: ManGROOVES Team <sender@example.test>$/m);
  assert.equal(compiled[1].envelope.from,'sender@example.test');
});

test('Resend gives a bare sender the same brand name',async()=>{
  let sent;
  const mailer=applicationMailer(name=>({RESEND_API_KEY:'test-key',MAIL_FROM:'sender@example.test'})[name],async(_,options)=>{
    sent=JSON.parse(options.body);return {ok:true,json:async()=>({id:'test-email'})};
  });
  await mailer.send({to:'applicant@example.test',subject:'Decision',text:'Admin note',messageKey:'test'});
  assert.equal(sent.from,'ManGROOVES <sender@example.test>');
  assert.deepEqual(sent.to,['applicant@example.test']);
});
test('missing SMTP configuration is reported honestly without changing the decision',async()=>{
  assert.equal(smtpMailer(()=>undefined),null);
  const service=fixture(application);
  assert.equal(await sendApplicationEmail(service,{uid:'admin'},'applicant'),'not_configured');
  assert.equal(service.records.expert_applications.applicant.status,'rejected');
  assert.equal(service.records.expert_applications.applicant.note,application.note);
});
test('an in-progress send cannot be duplicated, while a failed send can be retried',async()=>{
  let sends=0;
  const service=fixture({...application,email_status:'sending',email_attempted_at:new Date().toISOString()},{async send(){sends++;}});
  await assert.rejects(sendApplicationEmail(service,{uid:'admin'},'applicant'),/already being sent/);
  assert.equal(sends,0);
  service.records.expert_applications.applicant.email_status='failed';
  assert.equal(await sendApplicationEmail(service,{uid:'admin'},'applicant'),'sent');
  assert.equal(sends,1);
  await sendApplicationEmail(service,{uid:'admin'},'applicant');
  assert.equal(sends,1);
});
