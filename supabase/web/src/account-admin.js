import {api,friendly} from './client.js';
import {$,$$,esc,errorBox,field,formValues,showError,toast,confirm,privatePhoto,displayLabel,download} from './ui.js';
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
  node.innerHTML=`<div class="page-head"><div><h1>Certificate signer</h1><p class="muted">Set the name shown on earned certificates.</p></div><a class="button outline" href="#badge-settings">Back to badges</a></div><div class="signer-grid"><form id="certificate-settings" class="card">${errorBox}${field('signer_name','Signer name',settings.signer_name,'text','required maxlength="100"')}${field('signer_title','Position or title',settings.signer_title,'text','required maxlength="100"')}<details><summary>Signature image (optional)</summary><label class="field"><span>PNG or JPG · up to 5 MB</span><input type="file" name="signature" accept="image/png,image/jpeg"></label>${settings.has_signature?'<label class="check"><input type="checkbox" name="remove_signature" value="1">Remove saved signature image</label>':''}<small>A typed name works without an image.</small></details><div class="actions"><button type="submit">Save signer</button><button type="button" class="outline" id="preview-certificate" ${settings.signer_name&&settings.signer_title?'':'disabled'}>Preview PDF</button></div><small id="signer-status" role="status">${settings.signer_name?'Current saved signer is ready.':'Add a name and title to enable certificates.'}</small></form><section class="card signer-preview" aria-label="Signer preview"><p class="eyebrow">Certificate preview</p><h2>ManGROOVES</h2><p>Certificate of recognition</p><strong class="sample-recipient">Coastal Guardian</strong><div class="signature-sample"><img id="signature-preview" alt="Approved signature" ${settings.has_signature?'':'hidden'}><span id="typed-signature" ${settings.has_signature?'hidden':''}>Signed by</span></div><strong id="signer-preview-name"></strong><span id="signer-preview-title"></span><small>Example layout · Save before previewing the PDF.</small></section></div>`;
  const form=node.querySelector('#certificate-settings'),preview=node.querySelector('#signature-preview');
  let localImage;
  if(settings.has_signature)void privatePhoto(preview,'certificate-settings.php?signature=1');
  const update=()=>{
    node.querySelector('#signer-preview-name').textContent=form.elements.signer_name.value.trim()||'Signer name';
    node.querySelector('#signer-preview-title').textContent=form.elements.signer_title.value.trim()||'Position or title';
    const removed=form.elements.remove_signature?.checked;
    preview.hidden=!!removed||(!settings.has_signature&&!localImage);
    node.querySelector('#typed-signature').hidden=!preview.hidden;
  };
  form.addEventListener('input',()=>{update();node.querySelector('#preview-certificate').disabled=true;node.querySelector('#signer-status').textContent='Unsaved changes.';});update();
  form.elements.signature.onchange=()=>{
    const file=form.elements.signature.files[0];
    if(file&&(!['image/png','image/jpeg'].includes(file.type)||file.size>5*1024*1024)){form.elements.signature.value='';showError(form.querySelector('.error'),'Choose a PNG or JPG under 5 MB.');return;}
    if(localImage)URL.revokeObjectURL(localImage);localImage=file?URL.createObjectURL(file):null;
    if(localImage){preview.src=localImage;if(form.elements.remove_signature)form.elements.remove_signature.checked=false;}
    else if(settings.has_signature)void privatePhoto(preview,'certificate-settings.php?signature=1');
    update();node.querySelector('#preview-certificate').disabled=true;node.querySelector('#signer-status').textContent='Unsaved changes.';
  };
  node.querySelector('#preview-certificate').onclick=async event=>{
    const button=event.currentTarget;button.disabled=true;
    try{await download('certificate-settings.php','ManGROOVES-certificate-preview.pdf',{preview:1});}
    catch(error){showError(form.querySelector('.error'),friendly(error));}finally{if(button.isConnected)button.disabled=false;}
  };
  form.onsubmit=async event=>{
    event.preventDefault();const button=event.submitter;if(button.disabled)return;button.disabled=true;
    try{
      const values=formValues(form),image=form.elements.signature.files[0];delete values.signature;
      const body=new FormData();body.set('payload',JSON.stringify(values));if(image)body.set('signature',image);
      await api('certificate-settings.php',{body});if(localImage)URL.revokeObjectURL(localImage);
      toast('Signer saved.');if(node.isConnected)await certificateSettingsPage(node);
    }catch(error){showError(form.querySelector('.error'),friendly(error));}finally{button.disabled=false;}
  };
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
    clearTimeout(target.expiryTimer);
    target.innerHTML=`<canvas role="img" aria-label="Certificate download QR code"></canvas><p class="qr-expiry" role="status">Scan to download · valid for 10 minutes.</p><div class="actions"><a class="button outline" href="${esc(result.url)}" target="_blank" rel="noopener noreferrer">Open certificate</a><button type="button" class="outline hide-qr">Hide QR</button></div>`;drawQr(target.querySelector('canvas'),result.qr);
    target.querySelector('.hide-qr').onclick=()=>{clearTimeout(target.expiryTimer);target.remove();};
    const expiry=target.expiryTimer=setTimeout(()=>{if(target.isConnected){target.querySelector('canvas')?.remove();target.querySelector('a')?.remove();target.querySelector('.qr-expiry').textContent='QR expired. Select Show QR for a new code.';}},Math.max(0,(result.expires_unix_ms??Date.now()+600000)-Date.now()));
    expiry.unref?.();

  }catch(e){toast(friendly(e));}finally{button.disabled=false;}
}
