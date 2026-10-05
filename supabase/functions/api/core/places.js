import {AppError,text} from './domain.js';

export function placeResults(data) {
  return (data?.features??[]).slice(0,5).flatMap(feature=>{
    const [longitude,latitude]=feature.geometry?.coordinates??[],p=feature.properties??{};
    if(!Number.isFinite(latitude)||!Number.isFinite(longitude)||Math.abs(latitude)>90||Math.abs(longitude)>180)return [];
    const label=[p.name,[p.housenumber,p.street].filter(Boolean).join(' '),p.district,p.city,p.state,p.country].filter(Boolean);
    return [{label:[...new Set(label)].join(', '),latitude,longitude}];
  });
}
export async function searchPlaces(service,user,query,fetcher=fetch) {
  const reverse = query.latitude != null || query.longitude != null;
  const latitude = Number(query.latitude), longitude = Number(query.longitude);
  if(reverse && (!String(query.latitude ?? '').trim() || !String(query.longitude ?? '').trim() || !Number.isFinite(latitude) || !Number.isFinite(longitude) || Math.abs(latitude)>85.05112878 || Math.abs(longitude)>180)) throw new AppError('Choose a valid point on the map.');
  const term=reverse?'':text(query.q??'','an address',150,false);
  if(!reverse && term.length<3)return {places:[]};
  await service.limited(`places:${user.uid}`,120);
  // Photon supports address suggestions; the public Nominatim service does not.
  const endpoint=new URL(process.env.GEOCODING_URL??'https://photon.komoot.io/api/');
  const url=reverse?new URL('../reverse',endpoint):endpoint;
  if(url.protocol!=='https:')throw new AppError('Address search is not configured.',503);
  url.searchParams.set('limit',reverse?'1':'5');url.searchParams.set('lang','en');
  if(reverse){url.searchParams.set('lat',String(latitude));url.searchParams.set('lon',String(longitude));}
  else {
    url.searchParams.set('q',term);
    const barangay=await service.get('barangays',user.barangay_id);
    if(barangay){url.searchParams.set('lat',String(barangay.center_lat));url.searchParams.set('lon',String(barangay.center_lng));}
  }
  try {
    const response=await fetcher(url,{signal:AbortSignal.timeout(8000),headers:{Accept:'application/json'}});
    if(!response.ok)throw new Error('Search unavailable');
    return {places:placeResults(await response.json()),attribution:'OpenStreetMap / Photon'};
  } catch {throw new AppError('Address search is unavailable. You can still tap the map.',503);}
}
