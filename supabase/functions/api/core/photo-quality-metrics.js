import config from './photo-quality-config.json' with {type:'json'};
export {config as photoQualityConfig};
export const qualityMessages = Object.freeze({
  format:'Unsupported image format. Please upload JPG, PNG, or WebP.',
  size:'Photo exceeds the 5 MB limit.',
  resolution:'Photo resolution is too low. Please upload a higher-quality photo.',
  blur:'Photo is blurry. Please take a clearer photo.',
  dark:'Photo is too dark. Please take a photo with better lighting.',
  bright:'Photo is too bright. Please avoid excessive lighting.',
  quality:'Photo quality is too low. Please upload a clearer photo.',
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
  if(Math.min(width,height)<c.minSide)return qualityMessages.resolution;
  if(width*height>c.maxPixels)return qualityMessages.pixels;
  return '';
}
export function sampleDimensions(width,height,c=config){const scale=Math.min(1,c.sampleSide/Math.max(width,height));return [Math.max(3,Math.round(width*scale)),Math.max(3,Math.round(height*scale))];}

// Luminance statistics and 4-neighbour Laplacian variance. Tiles protect a sharp
// subject from being averaged away by a naturally blurred background.
// This measures technical quality only; it never identifies the photo's subject.
export function imageQualityMetrics(rgba,width,height,c=config) {
  if(width<3||height<3||rgba.length!==width*height*4)throw Error(qualityMessages.corrupt);
  const gray=new Float32Array(width*height),hist=new Uint32Array(256);
  let sum=0,squares=0;
  for(let i=0;i<gray.length;i++){
    const a=rgba[i*4+3]/255;
    const value=(.299*rgba[i*4]+.587*rgba[i*4+1]+.114*rgba[i*4+2])*a+255*(1-a);
    gray[i]=value;hist[Math.round(value)]++;sum+=value;squares+=value*value;
  }
  const percentile=f=>{let n=0;for(let i=0;i<256;i++){n+=hist[i];if(n>=gray.length*f)return i;}return 255;};
  const tiles=Array.from({length:c.tileGrid**2},()=>({n:0,sum:0,squares:0,gradient:0}));
  let lapSum=0,lapSquares=0,n=0;
  for(let y=1;y<height-1;y++)for(let x=1;x<width-1;x++){
    const i=y*width+x,lap=4*gray[i]-gray[i-1]-gray[i+1]-gray[i-width]-gray[i+width];
    const tile=tiles[Math.floor(y*c.tileGrid/height)*c.tileGrid+Math.floor(x*c.tileGrid/width)];
    tile.n++;tile.sum+=lap;tile.squares+=lap*lap;
    tile.gradient+=(Math.abs(gray[i+1]-gray[i-1])+Math.abs(gray[i+width]-gray[i-width]))/2;
    lapSum+=lap;lapSquares+=lap*lap;n++;
  }
  const mean=sum/gray.length;
  return {brightness:mean,contrast:Math.sqrt(Math.max(0,squares/gray.length-mean*mean)),p05:percentile(.05),p95:percentile(.95),laplacian:lapSquares/n-(lapSum/n)**2,
    sharpTiles:tiles.filter(t=>t.n&&t.squares/t.n-(t.sum/t.n)**2>=c.minSharpTileLaplacian&&t.gradient/t.n>=c.minGradient).length};
}
export function qualityProblem(metrics,c=config) {
  if(metrics.brightness<c.minBrightness&&metrics.p95<c.darkPercentile)return qualityMessages.dark;
  if(metrics.brightness>c.maxBrightness&&metrics.p05>c.brightPercentile)return qualityMessages.bright;
  if(metrics.contrast<c.minContrast||metrics.p95-metrics.p05<c.minTonalRange)return qualityMessages.quality;
  if(metrics.laplacian<c.minLaplacian&&metrics.sharpTiles<c.minSharpTiles)return qualityMessages.blur;
  return '';
}
