import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {capturePhoto} from '../src/camera.js';

function browser(getUserMedia){
  const dom=new JSDOM('<div class="cloud-panel"></div>');
  for(const key of ['window','document','navigator','File'])Object.defineProperty(globalThis,key,{value:dom.window[key],configurable:true});
  window.HTMLDialogElement.prototype.showModal=function(){this.open=true;};
  window.HTMLMediaElement.prototype.play=async()=>{};
  Object.defineProperty(navigator,'mediaDevices',{value:{getUserMedia},configurable:true});
  return dom;
}
const tick=()=>new Promise(resolve=>setImmediate(resolve));
test('desktop camera requests video only and cancellation releases every track',async()=>{
  let stopped=0;
  const dom=browser(async constraints=>{assert.equal(constraints.audio,false);return {getTracks:()=>[{stop:()=>stopped++}]};});
  const photo=capturePhoto();await tick();
  assert.ok(document.querySelector('.cloud-panel dialog video'));
  document.querySelector('.cancel').click();assert.equal(await photo,null);assert.equal(stopped,1);assert.equal(document.querySelector('dialog'),null);
  dom.window.close();
});
test('cancelling while permission is pending stops a late camera stream',async()=>{
  let finish,stopped=0;
  const dom=browser(()=>new Promise(resolve=>finish=resolve));
  const photo=capturePhoto();document.querySelector('.cancel').click();assert.equal(await photo,null);
  finish({getTracks:()=>[{stop:()=>stopped++}]});await tick();assert.equal(stopped,1);dom.window.close();
});
test('denied camera permission shows an actionable error and removes the preview',async()=>{
  const dom=browser(async()=>{throw Object.assign(new Error(),{name:'NotAllowedError'});});
  await assert.rejects(capturePhoto(),/Allow camera access/);assert.equal(document.querySelector('dialog'),null);dom.window.close();
});

test('capture releases the camera before encoding and ignores repeated capture clicks',async()=>{
 let stopped=0,encoded=0,finish;
 const dom=browser(async()=>({getTracks:()=>[{stop:()=>stopped++}]}));
 window.HTMLCanvasElement.prototype.getContext=()=>({drawImage(){}});
 window.HTMLCanvasElement.prototype.toBlob=function(callback){encoded++;finish=callback;};
 const photo=capturePhoto();await tick();
 const video=document.querySelector('video');Object.defineProperties(video,{videoWidth:{value:640},videoHeight:{value:480}});
 const button=document.querySelector('.capture');button.click();button.click();
 assert.equal(stopped,1);assert.equal(encoded,1);assert.equal(button.disabled,true);
 finish(new dom.window.Blob(['image'],{type:'image/jpeg'}));
 assert.equal((await photo).name,'field-camera.jpg');assert.equal(document.querySelector('dialog'),null);dom.window.close();
});

test('a failed canvas capture releases the device and returns an actionable error',async()=>{
 let stopped=0;const dom=browser(async()=>({getTracks:()=>[{stop:()=>stopped++}]}));
 window.HTMLCanvasElement.prototype.getContext=()=>{throw new Error('Canvas unavailable');};
 const photo=capturePhoto(),failure=assert.rejects(photo,/Could not capture/);await tick();
 Object.defineProperty(document.querySelector('video'),'videoWidth',{value:640});document.querySelector('.capture').click();
 await failure;assert.equal(stopped,1);assert.equal(document.querySelector('dialog'),null);dom.window.close();
});
