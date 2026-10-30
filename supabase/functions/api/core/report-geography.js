import boundaries from '../data/cebu-boundaries.json' with {type:'json'};
import {cebuBarangays} from './barangays.js';

// Reference polygons, never a resident's address or the closest barangay center.
function inRing(x,y,ring) {
  let inside=false;
  for(let i=0,j=ring.length-1;i<ring.length;j=i++) {
    const [ax,ay]=ring[j],[bx,by]=ring[i];
    const cross=(x-ax)*(by-ay)-(y-ay)*(bx-ax);
    if(Math.abs(cross)<1e-12&&x>=Math.min(ax,bx)&&x<=Math.max(ax,bx)&&y>=Math.min(ay,by)&&y<=Math.max(ay,by))return true;
    if((ay>y)!==(by>y)&&x<(bx-ax)*(y-ay)/(by-ay)+ax)inside=!inside;
  }
  return inside;
}
export function boundaryCode(latitude,longitude) {
  if(latitude==null||longitude==null||String(latitude).trim()===''||String(longitude).trim()==='')return null;
  const y=Number(latitude),x=Number(longitude);
  if(!Number.isFinite(x)||!Number.isFinite(y))return null;
  const matches=boundaries.filter(b=>x>=b.bbox[0]&&y>=b.bbox[1]&&x<=b.bbox[2]&&y<=b.bbox[3]&&b.polygons.some(p=>inRing(x,y,p[0])&&!p.slice(1).some(r=>inRing(x,y,r))));
  // Do not silently choose one side of an overlapping boundary.
  return matches.length===1?matches[0].psgc:null;
}
const directory=cebuBarangays();
export const philippineSearchBounds=[116.8,4.5,126.7,21.2];
export function withinPhilippineSearchBounds(latitude,longitude) {
  const [minLongitude,minLatitude,maxLongitude,maxLatitude]=philippineSearchBounds;
  return Number.isFinite(latitude)&&Number.isFinite(longitude)
    &&longitude>=minLongitude&&latitude>=minLatitude
    &&longitude<=maxLongitude&&latitude<=maxLatitude;
}

function inBoundary(boundary,longitude,latitude) {
  return longitude>=boundary.bbox[0]&&latitude>=boundary.bbox[1]
    &&longitude<=boundary.bbox[2]&&latitude<=boundary.bbox[3]
    &&boundary.polygons.some(p=>inRing(longitude,latitude,p[0])&&!p.slice(1).some(r=>inRing(longitude,latitude,r)));
}

export function barangaySearchPoint(barangay) {
  const code=barangay?.psgc_code,boundary=boundaries.find(b=>b.psgc===code);
  if(!boundary)return null;
  const accepts=(latitude,longitude)=>{
    if(!Number.isFinite(latitude)||!Number.isFinite(longitude)||!inBoundary(boundary,longitude,latitude))return false;
    return boundaryCode(latitude,longitude)===code;
  };
  const saved=[Number(barangay.center_lat),Number(barangay.center_lng)];
  if(accepts(...saved))return {latitude:saved[0],longitude:saved[1]};
  const [minLng,minLat,maxLng,maxLat]=boundary.bbox;
  const middle=[(minLat+maxLat)/2,(minLng+maxLng)/2];
  if(accepts(...middle))return {latitude:middle[0],longitude:middle[1]};
  for(const divisions of [8,16,32,64])for(let y=0;y<divisions;y++)for(let x=0;x<divisions;x++){
    const latitude=minLat+(y+.5)*(maxLat-minLat)/divisions;
    const longitude=minLng+(x+.5)*(maxLng-minLng)/divisions;
    if(accepts(latitude,longitude))return {latitude,longitude};
  }
  return null;
}

export function reportBarangay(latitude,longitude,rows=directory) {
  const code=boundaryCode(latitude,longitude);
  return code?rows.find(b=>b.psgc_code===code)??null:null;
}
export function withReportGeography(row,rows=directory,site=false) {
  if(!row||row.location_pending)return row;
  const barangay=reportBarangay(site?row.center_lat:row.latitude,site?row.center_lng:row.longitude,rows);
  return {...row,barangay_id:barangay?.id??null,barangay_name:barangay?.name??'Unresolved location',city_municipality:barangay?.city_municipality??null};
}
