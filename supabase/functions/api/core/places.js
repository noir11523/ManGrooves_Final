import {AppError,text,distanceMeters} from './domain.js';
import {reportBarangay,barangaySearchPoint,philippineSearchBounds,withinPhilippineSearchBounds} from './report-geography.js';
import {cebuBarangays} from './barangays.js';

const barangays=cebuBarangays();
const ignoredSearchWords=new Set(['barangay','brgy','cebu','city','province','philippines','ph']);
const normalize=value=>String(value??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const queryTokens=value=>normalize(value).split(' ').filter(word=>word.length>1&&!ignoredSearchWords.has(word));
const searchKey=value=>queryTokens(value).join(' ');
function isPhilippineFeature(properties) {
  const country=normalize(properties?.country),code=normalize(properties?.countrycode??properties?.country_code);
  return country==='philippines'||country.endsWith(' philippines')||code==='ph';
}
const env=name=>globalThis.Deno?.env?.get(name)??globalThis.process?.env?.[name]??'';

function searchScore(place,term,latitude,longitude,index) {
  const query=searchKey(term),name=searchKey(place.name),match=!query||!name?3:name===query?0:name.startsWith(query)?1:name.includes(query)?2:3;
  const distance=latitude==null||longitude==null?0:distanceMeters(latitude,longitude,place.latitude,place.longitude);
  return [match,distance,index];
}

function sortPlaces(places,term,latitude,longitude) {
  return places.map((place,index)=>({place,score:searchScore(place,term,latitude,longitude,index)}))
    .sort((a,b)=>a.score[0]-b.score[0]||a.score[1]-b.score[1]||a.score[2]-b.score[2]).map(item=>item.place);
}

function barangayResults(term,latitude,longitude) {
  const tokens=queryTokens(term);
  if(!tokens.length)return [];
  const matches=barangays.filter(row=>{
    const haystack=normalize(`${row.name} ${row.city_municipality}`);
    return tokens.every(token=>haystack.includes(token));
  }).sort((a,b)=>{
    const aExact=searchKey(a.name)===tokens.join(' '),bExact=searchKey(b.name)===tokens.join(' ');
    if(aExact!==bExact)return aExact?-1:1;
    const aDistance=latitude==null||longitude==null?0:distanceMeters(latitude,longitude,a.center_lat,a.center_lng);
    const bDistance=latitude==null||longitude==null?0:distanceMeters(latitude,longitude,b.center_lat,b.center_lng);
    return aDistance-bDistance||a.name.localeCompare(b.name)||a.city_municipality.localeCompare(b.city_municipality);
  });
  return matches.slice(0,8).flatMap(row=>{
    const point=barangaySearchPoint(row);
    if(!point)return [];
    const address=`Barangay ${row.name}, ${row.city_municipality}, Philippines`;
    return [{name:row.name,address,label:`${row.name}, ${row.city_municipality}, Philippines`,...point}];
  });
}

export function placeResults(data,term='',latitude=null,longitude=null) {
  const places=(data?.features??[]).flatMap((feature,index)=>{
    const [longitude,latitude]=feature.geometry?.coordinates??[],p=feature.properties??{};
    if(!withinPhilippineSearchBounds(latitude,longitude))return [];
    const area=reportBarangay(latitude,longitude);
    const countryKnown=Boolean(p.country||p.countrycode||p.country_code);
    if(countryKnown?!isPhilippineFeature(p):!area)return [];
    const name=String(p.name??p.street??p.city??'Place').trim();
    const street=[p.housenumber,p.street].filter(Boolean).join(' ');
    const address=area
      ?[street,area.name,area.city_municipality,'Cebu','Philippines'].filter(Boolean)
      :[street,p.district,p.county,p.city,p.state,'Philippines'].filter(Boolean);
    const label=[name,...address].filter(Boolean);
    return [{name,address:[...new Set(address)].join(', '),label:[...new Set(label)].join(', '),latitude,longitude,index}];
  });
  return sortPlaces(places,term,latitude,longitude).slice(0,12).map(({index,...place})=>place);
}
const caches=new WeakMap();
export async function searchPlaces(service,user,query,fetcher=fetch) {
  const reverse = query.latitude != null || query.longitude != null;
  const latitude = Number(query.latitude), longitude = Number(query.longitude);
  if(reverse && (!String(query.latitude ?? '').trim() || !String(query.longitude ?? '').trim() || !withinPhilippineSearchBounds(latitude,longitude))) throw new AppError('Choose a valid point in the Philippines.');
  const term=reverse?'':text(query.q??'','an address',150,false);
  if(!reverse && term.length<3)return {places:[]};
  let home=null;
  if(!reverse&&service.get)try{home=await service.get('barangays',user.barangay_id);}catch{}
  const requestedLatitude=Number(query.bias_latitude),requestedLongitude=Number(query.bias_longitude);
  const requestedBias=withinPhilippineSearchBounds(requestedLatitude,requestedLongitude);
  const bias=requestedBias?{latitude:requestedLatitude,longitude:requestedLongitude}
    :{latitude:Number(home?.center_lat)||10.3157,longitude:Number(home?.center_lng)||123.8854};
  const biasLatitude=reverse?latitude:bias.latitude,biasLongitude=reverse?longitude:bias.longitude;
  const localPlaces=reverse?[]:barangayResults(term,biasLatitude,biasLongitude);
  const googleKey=String(env('GOOGLE_MAPS_API_KEY')).trim();
  let cache=caches.get(fetcher);if(!cache){cache=new Map();caches.set(fetcher,cache);}
  const key=JSON.stringify([user.barangay_id??null,reverse?latitude:term.toLowerCase(),reverse?longitude:null,
    reverse?null:Number(biasLatitude.toFixed(3)),reverse?null:Number(biasLongitude.toFixed(3)),!reverse&&googleKey?'google':'photon']);
  const cached=cache.get(key);if(cached&&cached.expires>Date.now())return cached.promise;
  await service.limited(`places:${user.uid}`,120);
  const promise=(async()=>{try {
    const barangay=reverse?reportBarangay(latitude,longitude,service.rows?await service.rows('barangays'):undefined):null;
    const area=barangay?{id:barangay.id,name:barangay.name,city_municipality:barangay.city_municipality}:null;
    let data={features:[]},googlePlaces=[],attribution=localPlaces.length?'Philippine barangay boundaries':'OpenStreetMap / Photon';
    if(!reverse&&googleKey){
      try{
        const url=new URL('https://maps.googleapis.com/maps/api/geocode/json');
        const [west,south,east,north]=philippineSearchBounds;
        url.searchParams.set('address',term);url.searchParams.set('components','country:PH');url.searchParams.set('region','ph');
        url.searchParams.set('bounds',`${south},${west}|${north},${east}`);url.searchParams.set('key',googleKey);
        const response=await fetcher(url,{signal:AbortSignal.timeout(8000),headers:{Accept:'application/json'}});
        if(!response.ok)throw new Error('Google Places search unavailable');
        const result=await response.json();
        googlePlaces=(result.results??[]).flatMap(place=>{
          const latitude=place.geometry?.location?.lat,longitude=place.geometry?.location?.lng;
          const address=String(place.formatted_address??'').trim(),name=address.split(',')[0]?.trim()??'';
          const countryCode=place.address_components?.find(component=>component.types?.includes('country'))?.short_name;
          if(!withinPhilippineSearchBounds(latitude,longitude)||!name||(!countryCode&& !/(?:^|,\s*)Philippines$/i.test(address))
            ||(countryCode&&countryCode.toUpperCase()!=='PH'))return [];
          return [{name,address,label:address,latitude,longitude}];
        });
        if(googlePlaces.length)attribution='Google Maps Geocoding';
      }catch{}
    }
    if((reverse||(!googlePlaces.length&&!localPlaces.length))){
      const endpoint=new URL(env('GEOCODING_URL')||'https://photon.komoot.io/api/');
      const url=reverse?new URL('../reverse',endpoint):endpoint;
      if(url.protocol!=='https:')throw new AppError('Address search is not configured.',503);
      url.searchParams.set('limit',reverse?'1':'15');url.searchParams.set('lang','en');
      if(reverse){url.searchParams.set('lat',String(latitude));url.searchParams.set('lon',String(longitude));}
      else {
        url.searchParams.set('q',term);
        url.searchParams.set('lat',String(biasLatitude));url.searchParams.set('lon',String(biasLongitude));
        url.searchParams.set('location_bias_scale','0.5');url.searchParams.set('bbox',philippineSearchBounds.join(','));
      }
      try {
        const response=await fetcher(url,{signal:AbortSignal.timeout(8000),headers:{Accept:'application/json'}});
        if(!response.ok)throw new Error('Search unavailable');
        data=await response.json();
      } catch(error) {if(!reverse&&!localPlaces.length&&!googlePlaces.length)throw error;}
    }
    let places=reverse?[]:sortPlaces([...localPlaces,...googlePlaces,...placeResults(data,term,biasLatitude,biasLongitude)],term,biasLatitude,biasLongitude).slice(0,10);
    if(reverse) {
      const feature=data?.features?.[0],p=feature?.properties??{},point=feature?.geometry?.coordinates;
      const nearPoint=point&&Number.isFinite(point[0])&&Number.isFinite(point[1])
        &&distanceMeters(latitude,longitude,point[1],point[0])<=250;
      if(barangay) {
        const sameArea=nearPoint&&reportBarangay(point[1],point[0])?.psgc_code===barangay.psgc_code;
        const label=[...(sameArea?[p.name,[p.housenumber,p.street].filter(Boolean).join(' ')]:[]),barangay.name,barangay.city_municipality,'Cebu','Philippines'].filter(Boolean);
        places=[{label:[...new Set(label)].join(', '),latitude,longitude}];
      } else if(nearPoint&&(isPhilippineFeature(p)||reportBarangay(point[1],point[0]))) {
        const [place]=placeResults({features:[feature]});
        if(place)places=[{...place,latitude,longitude}];
      }
    }
    return {places,...(reverse?{barangay:area}:{}),attribution};
  } catch {cache.delete(key);throw new AppError('Address search is unavailable. You can still tap the map.',503);}})();
  if(cache.size>=250)cache.delete(cache.keys().next().value);
  cache.set(key,{promise,expires:Date.now()+300000});
  return promise;
}
