import {PhotonImage,resize,SamplingFilter} from '@cf-wasm/photon/node';
import {AppError} from './domain.js';
import {cleanImage} from './images.js';
import {photoQualityConfig as config,qualityMessages,imageFormat,resolutionProblem,sampleDimensions,imageQualityMetrics,qualityProblem} from './photo-quality-metrics.js';

export function validatePhotoQuality(bytes,index=0) {
  let decoded,sampled;
  const reject=message=>Object.assign(new AppError(message,422),{code:'photo_unclear',photo_indices:[index]});
  try {
    if(!bytes?.length)throw reject(qualityMessages.corrupt);
    if(bytes.length>config.maxBytes)throw reject(qualityMessages.size);
    if(!imageFormat(bytes))throw reject(qualityMessages.format);
    // Validate container/dimensions before allocating a decoded bitmap.
    const clean=cleanImage(bytes),problem=resolutionProblem(clean.width,clean.height);
    if(problem)throw reject(problem);
    decoded=PhotonImage.new_from_byteslice(new Uint8Array(clean.bytes));
    const width=decoded.get_width(),height=decoded.get_height();
    if(width!==clean.width||height!==clean.height)throw reject(qualityMessages.corrupt);
    const [w,h]=sampleDimensions(width,height);
    sampled=resize(decoded,w,h,SamplingFilter.Triangle);
    decoded.free();decoded=null;
    const metrics=imageQualityMetrics(sampled.get_raw_pixels(),w,h),failure=qualityProblem(metrics);
    if(failure)throw reject(failure);
    return metrics;
  } catch(error) {if(error.code==='photo_unclear')throw error;throw reject(qualityMessages.corrupt);}
  finally {sampled?.free();decoded?.free();}
}
