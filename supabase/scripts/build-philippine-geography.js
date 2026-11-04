import {writeFile,mkdir} from 'node:fs/promises';
import {gzipSync} from 'node:zlib';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {encodeBarangayDirectory} from '../functions/api/core/barangay-directory.js';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const dataDir=resolve(root,'supabase/functions/api/data');
const cacheDir=resolve(root,'tmp/philippine-boundaries-2023-lowres');
const api='https://psgc.gitlab.io/api/';
const source='https://raw.githubusercontent.com/faeldon/philippines-json-maps/2023-4q/2023/geojson/municities/lowres/';

async function json(url) {
  let error;
  for(let attempt=0;attempt<4;attempt++) {
    try {
      const response=await fetch(url,{signal:AbortSignal.timeout(45000),headers:{Accept:'application/json','User-Agent':'ManGROOVES geography builder'}});
      if(!response.ok){const error=new Error(`${response.status} ${response.statusText}`);error.status=response.status;throw error;}
      return await response.json();
    } catch(cause) {
      error=cause;
      if(cause.status===404)break;
      if(attempt<3)await new Promise(resolve=>setTimeout(resolve,500*(attempt+1)));
    }
  }
  throw new Error(`Could not read ${url}: ${error?.message??'request failed'}`);
}

function code(value) {
  const text=String(value??'').trim();
  return text&&text!=='false'?text.padStart(10,'0'):'';
}

function pointInRing(longitude,latitude,ring) {
  let inside=false;
  for(let i=0,j=ring.length-1;i<ring.length;j=i++) {
    const [x1,y1]=ring[j],[x2,y2]=ring[i];
    if(Math.abs((longitude-x1)*(y2-y1)-(latitude-y1)*(x2-x1))<1e-12
      &&longitude>=Math.min(x1,x2)&&longitude<=Math.max(x1,x2)
      &&latitude>=Math.min(y1,y2)&&latitude<=Math.max(y1,y2))return true;
    if((y1>latitude)!==(y2>latitude)&&longitude<(x2-x1)*(latitude-y1)/(y2-y1)+x1)inside=!inside;
  }
  return inside;
}

function polygonsOf(geometry) {
  return geometry.type==='Polygon'?[geometry.coordinates]:geometry.coordinates;
}

function pointInside(geometry,longitude,latitude) {
  return polygonsOf(geometry).some(polygon=>pointInRing(longitude,latitude,polygon[0])
    &&!polygon.slice(1).some(ring=>pointInRing(longitude,latitude,ring)));
}

function searchPoint(geometry,bbox) {
  const middle=[(bbox[0]+bbox[2])/2,(bbox[1]+bbox[3])/2];
  if(pointInside(geometry,...middle))return middle;
  for(const divisions of [8,16,32]) {
    let best=null,bestDistance=Infinity;
    for(let y=0;y<divisions;y++)for(let x=0;x<divisions;x++) {
      const candidate=[bbox[0]+(x+.5)*(bbox[2]-bbox[0])/divisions,bbox[1]+(y+.5)*(bbox[3]-bbox[1])/divisions];
      if(!pointInside(geometry,...candidate))continue;
      const distance=(candidate[0]-middle[0])**2+(candidate[1]-middle[1])**2;
      if(distance<bestDistance){best=candidate;bestDistance=distance;}
    }
    if(best)return best;
  }
  return null;
}

function bounds(geometry) {
  const result=[Infinity,Infinity,-Infinity,-Infinity];
  const visit=value=>{
    if(Array.isArray(value)&&typeof value[0]==='number') {
      result[0]=Math.min(result[0],value[0]);result[1]=Math.min(result[1],value[1]);
      result[2]=Math.max(result[2],value[0]);result[3]=Math.max(result[3],value[1]);
    } else if(Array.isArray(value))for(const child of value)visit(child);
  };
  visit(geometry.coordinates);
  return result;
}

async function mapLimit(items,limit,worker) {
  const results=new Array(items.length);let next=0;
  await Promise.all(Array.from({length:Math.min(limit,items.length)},async()=>{
    while(true){const index=next++;if(index>=items.length)return;results[index]=await worker(items[index],index);}
  }));
  return results;
}

await mkdir(dataDir,{recursive:true});await mkdir(cacheDir,{recursive:true});
const [sourceBarangays,towns,provinces,regions]=await Promise.all([
  json(api+'barangays/'),json(api+'cities-municipalities/'),json(api+'provinces/'),json(api+'regions/'),
]);
const townMap=new Map(),provinceMap=new Map(),regionMap=new Map();
for(const town of towns)for(const key of [code(town.psgc10DigitCode),code(town.code)])if(key)townMap.set(key,town);
for(const province of provinces)for(const key of [code(province.psgc10DigitCode),code(province.code)])if(key)provinceMap.set(key,province);
for(const region of regions)for(const key of [code(region.psgc10DigitCode),code(region.code)])if(key)regionMap.set(key,region);

const records=sourceBarangays.map(item=>{
  const psgc=code(item.psgc10DigitCode||item.code);
  const townCode=code(item.cityCode||item.municipalityCode||item.subMunicipalityCode);
  const town=townMap.get(townCode),province=provinceMap.get(code(item.provinceCode));
  const region=regionMap.get(code(item.regionCode));
  if(!psgc||!town||!region)throw new Error(`Incomplete PSGC parent data for barangay ${item.name} (${psgc||item.code}).`);
  return {id:Number(psgc),name:String(item.name).trim(),city_municipality:String(town.name).trim(),province:String(province?.name??region.name).trim(),region:String(region.name).trim(),country_code:'PH',psgc_code:psgc,city_psgc:code(town.psgc10DigitCode||town.code),province_psgc:province?code(province.psgc10DigitCode||province.code):null,region_psgc:code(region.psgc10DigitCode||region.code),center_lat:null,center_lng:null,monitoring_radius_meters:5000};
});
if(new Set(records.map(row=>row.psgc_code)).size!==records.length)throw new Error('PSGC barangay codes are not unique.');
const byCode=new Map(records.map(row=>[row.psgc_code,row]));
const municipalities=[...new Set(records.map(row=>row.city_psgc))].sort();
let received=0;
const unavailable=[];
const groups=await mapLimit(municipalities,12,async municipality=>{
  const url=source+`bgysubmuns-municity-${Number(municipality)}.0.001.json`;
  const groupPath=resolve(cacheDir,`${municipality}.json`);
  let collection;
  try {collection=JSON.parse(await (await import('node:fs/promises')).readFile(groupPath,'utf8'));}
  catch {
    try {collection=await json(url);await writeFile(groupPath,JSON.stringify(collection));}
    catch(error){if(error.message.includes('404')){unavailable.push(municipality);return [];}throw error;}
  }
  if(collection.type!=='FeatureCollection'||!Array.isArray(collection.features))throw new Error(`Unexpected boundary format for ${municipality}.`);
  received+=collection.features.length;
  return collection.features;
});
const features=new Map();
for(const group of groups)for(const feature of group) {
  const psgc=code(feature.properties?.adm4_psgc);
  if(psgc&&byCode.has(psgc)&&feature.geometry)features.set(psgc,feature);
}
const missing=[],shapes=[];
for(const row of records) {
  const feature=features.get(row.psgc_code);
  if(!feature){missing.push(row.psgc_code);continue;}
  const bbox=bounds(feature.geometry),point=searchPoint(feature.geometry,bbox);
  if(!point){missing.push(row.psgc_code);continue;}
  row.center_lng=Number(point[0].toFixed(6));row.center_lat=Number(point[1].toFixed(6));
  shapes.push({psgc_code:row.psgc_code,geometry:feature.geometry});
}
if(shapes.length<40000)throw new Error(`Only ${shapes.length} of ${records.length} barangay boundaries matched. Refusing to create an incomplete lookup bundle.`);
records.sort((a,b)=>a.region.localeCompare(b.region)||a.province.localeCompare(b.province)||a.city_municipality.localeCompare(b.city_municipality)||a.name.localeCompare(b.name));
const directoryPath=resolve(dataDir,'philippine-barangays.json');
const boundaryPath=resolve(dataDir,'philippine-boundaries.json.gz');
await writeFile(directoryPath,JSON.stringify(encodeBarangayDirectory(records)));
await writeFile(boundaryPath,gzipSync(JSON.stringify(shapes),{level:9,mtime:0}));
console.log(`PSGC barangays: ${records.length.toLocaleString()}`);
console.log(`Municipal boundary files: ${municipalities.length.toLocaleString()} (${received.toLocaleString()} features)`);
console.log(`Boundaries: ${shapes.length.toLocaleString()} (${(await (await import('node:fs/promises')).stat(boundaryPath)).size.toLocaleString()} bytes compressed)`);
console.log(`Unmapped barangays: ${missing.length.toLocaleString()} (${missing.slice(0,20).join(', ')||'none'}).`);
console.log(`Municipalities without a source file: ${unavailable.length.toLocaleString()} (${unavailable.slice(0,20).join(', ')||'none'}).`);
