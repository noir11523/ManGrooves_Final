// Conservative clarity screening; experts still assess the photo's subject.
export function clarityProblem(width,height,rgba) {
  if(Math.min(width,height)<240)return 'Photo is too small. Use a clearer photo.';
  const gray=[];for(let i=0;i<rgba.length;i+=4)gray.push(.299*rgba[i]+.587*rgba[i+1]+.114*rgba[i+2]);
  const side=Math.round(Math.sqrt(gray.length));let sum=0,squares=0,n=0;
  for(let y=1;y<side-1;y++)for(let x=1;x<side-1;x++){const i=y*side+x,v=4*gray[i]-gray[i-1]-gray[i+1]-gray[i-side]-gray[i+side];sum+=v;squares+=v*v;n++;}
  return n&&squares/n-(sum/n)**2<5?'Photo is unclear. Retake it in good light.':'';
}
const checked=new WeakSet();
export async function checkClarity(file){
  if(checked.has(file))return;
  // Image is the fallback for browsers without createImageBitmap.
  if(typeof createImageBitmap!=='function'&&typeof Image!=='function')return;
  let bitmap,url;
  try{
    if(typeof createImageBitmap==='function')bitmap=await createImageBitmap(file);
    else {url=URL.createObjectURL(file);bitmap=new Image();bitmap.src=url;await bitmap.decode();}
    const canvas=document.createElement('canvas');canvas.width=canvas.height=192;
    const context=canvas.getContext('2d',{willReadFrequently:true});
    context.drawImage(bitmap,0,0,192,192);
    const problem=clarityProblem(bitmap.naturalWidth||bitmap.width,bitmap.naturalHeight||bitmap.height,context.getImageData(0,0,192,192).data);
    if(problem)throw new Error(problem);
    checked.add(file);
  }catch(error){throw Object.assign(new Error(error.message?.startsWith('Photo is')?error.message:'Could not read this photo. Choose another.'),{code:'photo_unclear'});}
  finally{bitmap?.close?.();if(url)URL.revokeObjectURL(url);}
}
