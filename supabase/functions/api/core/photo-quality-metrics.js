import config from './photo-quality-config.json' with {type:'json'};
export {config as photoQualityConfig};
export const qualityMessages = Object.freeze({
  format:'Unsupported image format. Please upload JPG, PNG, or WebP.',
  size:'Photo exceeds the 5 MB limit.',
  corrupt:'Could not read this photo. Please choose another.',
  pixels:'Photo is too large to process. Please resize it and try again.'
});
export function imageFormat(bytes) {
  if(bytes[0]===255&&bytes[1]===216&&bytes[2]===255)return 'jpeg';
  if([137,80,78,71,13,10,26,10].every((v,i)=>bytes[i]===v))return 'png';
  if(String.fromCharCode(...bytes.slice(0,4))==='RIFF'&&String.fromCharCode(...bytes.slice(8,12))==='WEBP')return 'webp';
  return '';
}
export function resolutionProblem(width,height,c=config) {
  if(!Number.isFinite(width*height)||width<=0||height<=0)return qualityMessages.corrupt;
  if(width*height>c.maxPixels)return qualityMessages.pixels;
  return '';
}
