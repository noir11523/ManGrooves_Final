import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {watchNotifications,updateNotificationBell,notificationRoute} from '../src/notification-updates.js';
const tick=()=>new Promise(r=>setTimeout(r,0));

test('bell refreshes across device events, caps large counts, and stops cleanly',async()=>{
 const dom=new JSDOM('<a data-notification-bell></a>',{url:'https://example.test',pretendToBeVisual:true}),{window:win}=dom,doc=win.document;
 let callback,cleared=false,calls=0,data={unread:1,total:1,revision:'one'};
 win.setInterval=fn=>(callback=fn,1);win.clearInterval=()=>{cleared=true;};
 const watcher=watchNotifications({doc,win,load:async()=>{calls++;return data;}});await tick();
 assert.equal(doc.querySelector('.notification-count').textContent,'1');
 data={unread:2,total:2,revision:'two'};await callback();assert.match(doc.querySelector('a').getAttribute('aria-label'),/2 unread/);
 data={unread:0,total:2,revision:'three'};win.dispatchEvent(new win.Event('focus'));await tick();assert.equal(doc.querySelector('.notification-count').hidden,true);
 updateNotificationBell({unread:200},doc);assert.equal(doc.querySelector('.notification-count').textContent,'99+');
 const before=calls;watcher.stop();win.dispatchEvent(new win.Event('focus'));await callback();assert.equal(calls,before);assert.ok(cleared);win.close();
});

test('polling is single-flight, skips hidden/offline pages, and ignores late signed-out results',async()=>{
 const {window:win}=new JSDOM('<a data-notification-bell></a>',{pretendToBeVisual:true});let finish,calls=0;
 let hidden=false,online=true;Object.defineProperty(win.document,'hidden',{get:()=>hidden});Object.defineProperty(win.navigator,'onLine',{get:()=>online});
 const watcher=watchNotifications({doc:win.document,win,load:()=>{calls++;return new Promise(r=>finish=r);}});
 await watcher.refresh();assert.equal(calls,1);watcher.stop();finish({unread:5});await tick();assert.equal(win.document.querySelector('.notification-count'),null);
 hidden=true;const next=watchNotifications({doc:win.document,win,load:async()=>{calls++;return {unread:0};}});await next.refresh();assert.equal(calls,1);
 hidden=false;online=false;await next.refresh();assert.equal(calls,1);next.stop();win.close();
});

test('notification links use safe application, report and badge targets',()=>{
 assert.equal(notificationRoute({target:{page:'expert-applications',uid:'applicant-uid'}}),'#expert-applications?uid=applicant-uid');
 assert.equal(notificationRoute({target:{page:'report',id:12,review:true}}),'#report/12?review=1');
 assert.equal(notificationRoute({target:{page:'badges'}}),'#badges');
 for(const target of [{page:'https://evil.test'},{page:'report',id:-1},{page:'expert-applications',uid:'../../evil'},null])assert.equal(notificationRoute({target}),null);
});

test('returning with browser Back resumes cached-page notification updates',async()=>{
 const {window:win}=new JSDOM('<a data-notification-bell></a>',{pretendToBeVisual:true});let calls=0;
 const watcher=watchNotifications({doc:win.document,win,load:async()=>({unread:++calls,revision:String(calls)})});await tick();
 const before=calls;
 win.dispatchEvent(new win.PageTransitionEvent('pagehide',{persisted:true}));
 win.dispatchEvent(new win.PageTransitionEvent('pageshow',{persisted:true}));await tick();
 assert.ok(calls>before);assert.match(win.document.querySelector('a').getAttribute('aria-label'),/unread/);
 watcher.stop();win.close();
});
