import {photoQualityConfig as config,qualityMessages,resolutionProblem,sampleDimensions,imageQualityMetrics,qualityProblem} from '../../functions/api/core/photo-quality-metrics.js';
export function clarityProblem(width,height,rgba,sampleWidth=Math.round(Math.sqrt(rgba.length/4)),sampleHeight=sampleWidth){
  return resolutionProblem(width,height)||qualityProblem(imageQualityMetrics(rgba,sampleWidth,sampleHeight));
}
const checked=new WeakSet();
export const prepareReportPhoto=file=>checkClarity(file,true);
export async function checkClarity(file,prepare=false){
  if(checked.has(file))return file;
  if(file.size>config.maxBytes)throw Object.assign(Error(qualityMessages.size),{code:'photo_unclear'});
  if(!['image/jpeg','image/png','image/webp'].includes(file.type))throw Object.assign(Error(qualityMessages.format),{code:'photo_unclear'});
  // Server preflight remains mandatory when a browser cannot decode locally.
  if(typeof createImageBitmap!=='function'&&typeof Image!=='function')return file;
  let bitmap,url;
  try{
    if(typeof createImageBitmap==='function')bitmap=await createImageBitmap(file);
    else {url=URL.createObjectURL(file);bitmap=new Image();bitmap.src=url;await bitmap.decode();}
    const width=bitmap.naturalWidth||bitmap.width,height=bitmap.naturalHeight||bitmap.height;
    const problem=resolutionProblem(width,height,prepare?{...config,maxPixels:64000000}:config);if(problem)throw Object.assign(Error(problem),{code:'photo_unclear'});
    const [w,h]=sampleDimensions(width,height),canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;
    const context=canvas.getContext('2d',{willReadFrequently:true});if(!context)return file;
    context.fillStyle='#fff';context.fillRect(0,0,w,h);context.imageSmoothingQuality='medium';context.drawImage(bitmap,0,0,w,h);
    const failure=qualityProblem(imageQualityMetrics(context.getImageData(0,0,w,h).data,w,h));
    if(failure)throw Object.assign(Error(failure),{code:'photo_unclear'});
    if(prepare&&width*height>config.maxPixels){
      // Preserve aspect ratio and the minimum resolution while bounding server memory.
      const scale=Math.max(config.minSide/Math.min(width,height),Math.min(1,config.uploadSide/Math.max(width,height)));
      const target=document.createElement('canvas');target.width=Math.round(width*scale);target.height=Math.round(height*scale);
      const targetProblem=resolutionProblem(target.width,target.height);if(targetProblem)throw Object.assign(Error(targetProblem),{code:'photo_unclear'});
      const painter=target.getContext('2d');if(!painter)throw Object.assign(Error(qualityMessages.pixels),{code:'photo_unclear'});
      painter.fillStyle='#fff';painter.fillRect(0,0,target.width,target.height);painter.imageSmoothingQuality='high';painter.drawImage(bitmap,0,0,target.width,target.height);
      const blob=await new Promise(resolve=>target.toBlob(resolve,file.type,.92));if(!blob)throw Error(qualityMessages.corrupt);
      const extension={'image/jpeg':'jpg','image/png':'png','image/webp':'webp'}[blob.type];
      const smaller=new File([blob],file.name.replace(/\.[^.]+$/,'')+'.'+extension,{type:blob.type,lastModified:file.lastModified});
      await checkClarity(smaller);return smaller;
    }
    checked.add(file);
    return file;
  }catch(error){throw Object.assign(Error(error.code==='photo_unclear'?error.message:qualityMessages.corrupt),{code:'photo_unclear'});}
  finally{bitmap?.close?.();if(url)URL.revokeObjectURL(url);}
}
