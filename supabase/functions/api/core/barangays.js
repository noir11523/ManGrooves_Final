import directory from '../data/philippine-barangays.json' with {type:'json'};
import cebuDirectory from '../data/cebu-barangays.json' with {type:'json'};
import {unpackBarangayDirectory} from './barangay-directory.js';

const normalize=value=>String(value??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase().replace(/\s+/g,' ');
const key=b=>`${normalize(b.name)}|${normalize(b.city_municipality??'Cebu City')}`;
const rowsByCode=new Map(unpackBarangayDirectory(directory).map(b=>[b.psgc_code,b]));
const cebuByCode=new Map(cebuDirectory.map(b=>[b.psgc_code,b]));
for(const [code,old] of cebuByCode) {
  const current=rowsByCode.get(code);
  if(current)rowsByCode.set(code,{...current,...old,psgc_code:code,city_psgc:current.city_psgc,province_psgc:current.province_psgc,
    region:current.region,city_municipality:old.city_municipality,province:old.province});
}
const directoryByName=new Map();
for(const row of rowsByCode.values())directoryByName.set(key(row),row);
const officialDirectory=[...rowsByCode.values()].sort((a,b)=>a.province.localeCompare(b.province)||a.city_municipality.localeCompare(b.city_municipality)||a.name.localeCompare(b.name));

export const publicBarangay=row=>Object.fromEntries(['id','name','city_municipality','province','region','country_code',
  'psgc_code','city_psgc','province_psgc','region_psgc'].map(key=>[key,row[key]??null]));

export function philippineBarangays(existing=[]) {
  if(!existing.length)return officialDirectory;
  const rows=new Map(officialDirectory.map(b=>[b.psgc_code,{...b}]));
  for(const old of existing) {
    const match=(old.psgc_code&&rows.get(old.psgc_code))||directoryByName.get(key(old));
    if(match)rows.set(match.psgc_code,{...match,...old,id:old.id,psgc_code:match.psgc_code,
      city_psgc:match.city_psgc,province_psgc:match.province_psgc,region_psgc:match.region_psgc,
      name:match.name,city_municipality:match.city_municipality,province:match.province,region:match.region});
  }
  return [...rows.values()];
}

// Keep the existing Cebu IDs and callers compatible with the larger directory.
export function cebuBarangays(existing=[]) {
  const codes=new Set(cebuDirectory.map(row=>row.psgc_code));
  return philippineBarangays(existing).filter(row=>codes.has(row.psgc_code));
}
