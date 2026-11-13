import {checkClarity} from './photo-quality.js';
const readBytes = file => file.arrayBuffer ? file.arrayBuffer() : new Promise((resolve,reject)=>{
  const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(new Error('Could not read this photo. Choose it again.'));reader.readAsArrayBuffer(file);
});
const sameBytes=(a,b)=>a.length===b.length&&a.every((value,index)=>value===b[index]);
// Check file contents, not names: renaming a duplicate must not make it new.
export async function validateReportPhotos(photos) {
  const files=photos.filter(Boolean);
  if(files.length>6)throw new Error('Use up to 6 photos.');
  if(files.some(f=>!['image/jpeg','image/png','image/webp'].includes(f.type)||f.size>5*1024*1024))throw new Error('Use JPG, PNG or WebP photos under 5 MB each.');
  if(files.reduce((sum,file)=>sum+file.size,0)>12*1024*1024)throw new Error('Photos must total 12 MB or less. Remove a photo or use smaller files.');
  const contents=[];
  for(const [index,file] of photos.entries()){
    if(!file)continue;
    const bytes=new Uint8Array(await readBytes(file));
    if(contents.some(previous=>sameBytes(previous,bytes)))throw Object.assign(new Error('Photo already added. Choose another.'),{code:'photo_duplicate',photo_indices:[index]});
    contents.push(bytes);
  }
  for (const [index,file] of photos.entries()) if(file) {try {await checkClarity(file);} catch(error){error.photo_indices=[index];throw error;}}
}

export const isPhotoConflict = error => ['photo_duplicate','photo_already_submitted','photo_unclear'].includes(error?.code);
export function photoConflictMessage(error) {
  if(error.code==='photo_duplicate')return 'Photo already added. Choose another.';
  if(error.code==='photo_already_submitted')return 'Photo already used. Choose a new one.';
  return error.message;
}
export async function checkReportPhotos(photos, request, submissionToken) {
  await validateReportPhotos(photos);
  const selected = photos.map((photo,index)=>({photo,index})).filter(item=>item.photo);
  if (!selected.length) return;
  const body = new FormData();
  body.set('payload', JSON.stringify({submission_token:submissionToken}));
  selected.forEach((item,index)=>body.set(`photo_${index}`,item.photo));
  try { await request('check-report-photos.php',{body}); }
  catch (error) {
    if (isPhotoConflict(error)) error.photo_indices = (error.photo_indices ?? []).map(i=>selected[i]?.index).filter(i=>i!=null);
    throw error;
  }
}
