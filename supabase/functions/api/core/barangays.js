import directory from '../data/cebu-barangays.json' with {type:'json'};

const key=b=>`${String(b.name).trim().toLowerCase()}|${String(b.city_municipality??'Cebu City').trim().toLowerCase()}`;
export function cebuBarangays(existing=[]) {
  const rows=new Map(directory.map(b=>[key(b),{...b}]));
  for(const old of existing){
    const match=rows.get(key(old));
    if(match)rows.set(key(old),{...match,...old,psgc_code:match.psgc_code,city_psgc:match.city_psgc,city_municipality:match.city_municipality,province:'Cebu'});
  }
  return [...rows.values()].sort((a,b)=>a.name.localeCompare(b.name)||a.city_municipality.localeCompare(b.city_municipality));
}
