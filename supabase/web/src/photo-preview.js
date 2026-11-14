export function enlargePhoto(img) {
  if(!img.src)return;
  const dialog=document.createElement('dialog');dialog.className='photo-enlarge';
  const close=document.createElement('button');close.type='button';close.textContent='Close';close.className='outline';close.onclick=()=>dialog.close();
  const image=img.cloneNode();image.removeAttribute('id');image.removeAttribute('style');image.hidden=false;image.tabIndex=-1;image.removeAttribute('role');image.removeAttribute('aria-label');
  const objectUrl=img.photoBlob?URL.createObjectURL(img.photoBlob):null;if(objectUrl)image.src=objectUrl;
  dialog.append(close,image);(img.closest('.cloud-panel')??document.body).append(dialog);
  dialog.addEventListener('close',()=>{if(objectUrl)URL.revokeObjectURL(objectUrl);dialog.remove();img.focus();},{once:true});dialog.showModal();
}
export function bindPhotoPreview(img, label='Enlarge ID photo') {
  img.classList.add('zoomable-photo');img.tabIndex=0;img.setAttribute('role','button');img.setAttribute('aria-label',label);
  img.onclick=()=>enlargePhoto(img);img.onkeydown=event=>{if(['Enter',' '].includes(event.key)){event.preventDefault();enlargePhoto(img);}};
}
