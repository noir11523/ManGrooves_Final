import {api,friendly} from './client.js';
import {$,$$,esc,errorBox,field,formValues,showError,toast,confirm,privatePhoto,displayLabel} from './ui.js';
import {listFilters,bindListFilters,filterLocalList,matchesSearch} from './list-filters.js';

export async function expertApplicationsPage(node,query={}){
  const {items}=await api('expert-applications.php');if(!node.isConnected)return;
  node.innerHTML=`<div class="page-head"><h1>Expert applications</h1><a href="#users">Back to users</a></div><p>Check the applicant's ID code before approving expert access.</p><div class="list">${items.map(a=>`<article class="card" data-uid="${esc(a.uid)}"><h2>${esc(a.full_name)}</h2><p>${esc(a.email)} · ${esc(displayLabel(a.status))}</p>${a.id_code?`<dl class="summary"><dt>Expert ID code</dt><dd class="id-code">${esc(a.id_code)}</dd></dl>`:''}${a.has_id_photo?`<button class="outline id-photo" data-uid="${esc(a.uid)}" aria-expanded="false">View previous ID photo</button><img hidden class="guide" alt="Applicant's private ID">`:''}${a.status==='pending'?`<form class="application">${errorBox}${field('note','Note or reason','','text','maxlength="1000"')}<div class="actions"><button name="action" value="approve">Approve expert</button><button class="outline" name="action" value="reject">Decline</button></div></form>`:`<p>${esc(a.note??'')}${a.reviewer_name?` · Reviewed by ${esc(a.reviewer_name)}`:''}</p>`}</article>`).join('')||'<p class="empty">No expert applications yet.</p>'}</div>`;
  node.querySelector('.list').insertAdjacentHTML('beforebegin',listFilters(query,[['status','Status',[['','All applications'],['pending','Pending'],['approved','Approved'],['rejected','Declined']]]],'Applicant name or email'));
  node.insertAdjacentHTML('beforeend','<p class="empty filter-empty" hidden>No applications match.</p>');
  const rows=[...node.querySelectorAll('article[data-uid]')].map(element=>[element,items.find(item=>item.uid===element.dataset.uid)]);
  node.querySelector('.list > .empty')?.remove();
  const apply=()=>filterLocalList(node,query,rows,(item,q)=>matchesSearch([item.full_name,item.email],q)&&(!q.status||item.status===q.status));
  bindListFilters(node,query,apply);apply();
  $$('.id-photo').forEach(button=>button.onclick=async()=>{const img=button.nextElementSibling;img.hidden=!img.hidden;button.setAttribute('aria-expanded',String(!img.hidden));button.textContent=img.hidden?'View previous ID photo':'Hide ID photo';if(!img.hidden)await privatePhoto(img,`expert-id.php?uid=${encodeURIComponent(button.dataset.uid)}`);});
  $$('.application').forEach(form=>form.onsubmit=async event=>{
    event.preventDefault();const button=event.submitter;if(button.disabled)return;
    const action=button.value,values=formValues(form);
    if(action==='reject'&&!values.note.trim()){showError(form.querySelector('.error'),'Add a reason for declining.');return;}
    if(!await confirm(action==='approve'?'Approve this expert?':'Decline this application?',action==='approve'?'They can submit reports and review other users’ reports.':'They will not have expert access.'))return;
    button.disabled=true;try{const result=await api('expert-applications.php',{body:{...values,action,uid:form.closest('[data-uid]').dataset.uid}});toast(result.message);await expertApplicationsPage(node,query);}catch(e){showError(form.querySelector('.error'),friendly(e));}finally{button.disabled=false;}
  });
}
export async function certificateSettingsPage(node){
  const {settings}=await api('certificate-settings.php');if(!node.isConnected)return;
  node.innerHTML=`<div class="page-head"><h1>Certificate signer</h1><a href="#badge-settings">Back to badges</a></div><form id="certificate-settings" class="card">${errorBox}${field('signer_name','Signer name',settings.signer_name,'text','required maxlength="100"')}${field('signer_title','Position or title',settings.signer_title,'text','required maxlength="100"')}<label class="field"><span>Signature image (optional)</span><input type="file" name="signature" accept="image/png,image/jpeg"><small>Upload an approved PNG or JPG signature. Up to 5 MB. Without an image, the certificate shows “Signed by” and the name.</small></label>${settings.has_signature?'<label class="check"><input type="checkbox" name="remove_signature" value="1">Remove current signature image</label>':''}<button type="submit">Save signer</button></form>`;
  $('#certificate-settings').onsubmit=async event=>{event.preventDefault();const button=event.submitter;button.disabled=true;try{const form=event.target,values=formValues(form),image=form.elements.namedItem('signature').files[0];delete values.signature;const body=new FormData();body.set('payload',JSON.stringify(values));if(image)body.set('signature',image);await api('certificate-settings.php',{body});toast('Signer saved.');await certificateSettingsPage(node);}catch(e){showError(event.target.querySelector('.error'),friendly(e));}finally{button.disabled=false;}};
}
export function drawQr(canvas,qr){
  const size=qr.size+8,scale=4;canvas.width=canvas.height=size*scale;
  const ctx=canvas.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.fillStyle='#000';
  for(let y=0;y<qr.size;y++)for(let x=0;x<qr.size;x++)if(qr.data[y*qr.size+x])ctx.fillRect((x+4)*scale,(y+4)*scale,scale,scale);
}
export async function certificateQr(button){
  if(!await confirm('Show certificate QR?','Anyone with this code can download your certificate for 10 minutes.'))return;
  button.disabled=true;try{
    const result=await api('certificate-link.php',{body:{badge_id:Number(button.dataset.id)}});
    let target=button.closest('article').querySelector('.certificate-share');if(!target){target=document.createElement('div');target.className='certificate-share';button.closest('article').append(target);}
    target.innerHTML=`<canvas role="img" aria-label="Certificate download QR code" style="max-width:230px;width:100%"></canvas><p>Scan to download. Expires in 10 minutes.</p><p class="muted">The PDF has no QR code.</p><a href="${esc(result.url)}" target="_blank" rel="noopener noreferrer">Open download link</a>`;drawQr(target.querySelector('canvas'),result.qr);
  }catch(e){toast(friendly(e));}finally{button.disabled=false;}
}
