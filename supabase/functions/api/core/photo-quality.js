import {PhotonImage} from '@cf-wasm/photon/node';
import {AppError} from './domain.js';
import {cleanImage} from './images.js';
import {photoQualityConfig as config,qualityMessages,imageFormat,resolutionProblem} from './photo-quality-metrics.js';

export function validatePhotoFile(bytes,index=0) {
  let decoded;
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
    return {width,height};
  } catch(error) {if(error.code==='photo_unclear')throw error;throw reject(qualityMessages.corrupt);}
  finally {decoded?.free();}
}
