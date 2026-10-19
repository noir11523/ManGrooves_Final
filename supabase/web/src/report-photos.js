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
  for(const file of files){
    const bytes=new Uint8Array(await readBytes(file));
    if(contents.some(previous=>sameBytes(previous,bytes)))throw new Error('This photo is already added. Choose a different photo.');
    contents.push(bytes);
  }
}
