import {encodeReferenceData,decodeReferenceData} from './reference-data.js';

// Store municipality metadata once so the public directory fits Edge uploads.
export function packBarangayDirectory(records) {
  const municipalities=[],indexes=new Map(),barangays=[];
  for(const row of records) {
    if(row.country_code!=='PH'||row.monitoring_radius_meters!==5000||row.id!==Number(row.psgc_code))throw new Error('Unsupported barangay directory record.');
    const municipality=Object.fromEntries(['city_municipality','province','region','city_psgc','province_psgc','region_psgc'].map(key=>[key,row[key]]));
    const key=JSON.stringify(municipality);
    if(!indexes.has(key)){indexes.set(key,municipalities.length);municipalities.push(municipality);}
    barangays.push([row.psgc_code,row.name,indexes.get(key),row.center_lat,row.center_lng]);
  }
  return {version:1,municipalities,barangays};
}

export function encodeBarangayDirectory(records) {
  return encodeReferenceData(packBarangayDirectory(records));
}

export function unpackBarangayDirectory(directory) {
  directory=decodeReferenceData(directory);
  if(Array.isArray(directory))return directory;
  if(directory?.version!==1||!Array.isArray(directory.municipalities)||!Array.isArray(directory.barangays))throw new Error('Invalid barangay directory.');
  return directory.barangays.map(([psgc_code,name,municipality,center_lat,center_lng])=>{
    const parent=directory.municipalities[municipality];
    if(!parent)throw new Error('Missing barangay municipality.');
    return {id:Number(psgc_code),name,...parent,country_code:'PH',psgc_code,center_lat,center_lng,monitoring_radius_meters:5000};
  });
}
