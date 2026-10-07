// Desktop capture requires a live MediaStream; capture=environment is mobile-only.
export async function capturePhoto() {
  if (!navigator.mediaDevices?.getUserMedia) throw new Error('Camera access needs HTTPS or localhost. You can still choose a photo from Gallery.');
  const dialog=document.createElement('dialog');
  dialog.className='camera-dialog';
  dialog.setAttribute('aria-label','Take a field photo');
  dialog.innerHTML='<h2>Take a photo</h2><p role="status">Opening camera… Allow camera access if asked.</p><video autoplay muted playsinline></video><div class="actions"><button type="button" class="capture" disabled>Take photo</button><button type="button" class="outline cancel">Cancel</button></div>';
  (document.querySelector('.cloud-panel')??document.body).append(dialog);dialog.showModal();
  let stream,closed=false;
  let onHide;
  const stop=()=>{window.removeEventListener('pagehide',onHide);closed=true;stream?.getTracks().forEach(track=>track.stop());dialog.remove();};
  return new Promise((resolve,reject)=>{
    const cancel=()=>{stop();resolve(null);};
    dialog.oncancel=event=>{event.preventDefault();cancel();};
    dialog.querySelector('.cancel').onclick=cancel;
    const video=dialog.querySelector('video');
    navigator.mediaDevices.getUserMedia({audio:false,video:{facingMode:{ideal:'environment'},width:{ideal:1600},height:{ideal:1200}}}).then(async media=>{
      stream=media;if(closed){stop();return;}
      video.srcObject=stream;await video.play();
      if(closed)return;
      dialog.querySelector('p').textContent='Frame the mangrove, then take your photo.';
      dialog.querySelector('.capture').disabled=false;
    }).catch(error=>{
      if(closed)return;stop();
      reject(new Error(error.name==='NotAllowedError'?'Camera permission was denied. Allow camera access in your browser or use Gallery.':error.name==='NotFoundError'?'No camera was found. Connect a camera or use Gallery.':'Could not open the camera. Close other camera apps and try again, or use Gallery.'));
    });
    dialog.querySelector('.capture').onclick=()=>{
      if(!video.videoWidth)return;
      const canvas=document.createElement('canvas'),scale=Math.min(1,1600/video.videoWidth);
      canvas.width=Math.round(video.videoWidth*scale);canvas.height=Math.round(video.videoHeight*scale);
      canvas.getContext('2d').drawImage(video,0,0,canvas.width,canvas.height);
      canvas.toBlob(blob=>{stop();if(blob)resolve(new File([blob],'field-camera.jpg',{type:'image/jpeg'}));else reject(new Error('Could not capture the photo. Try again.'));},'image/jpeg',0.88);
    };
    onHide=cancel;window.addEventListener('pagehide',onHide,{once:true});
    dialog.addEventListener('close',()=>window.removeEventListener('pagehide',cancel),{once:true});
  });
}
