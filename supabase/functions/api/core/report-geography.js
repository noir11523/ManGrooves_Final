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
export function reportBarangay(latitude,longitude,rows=directory) {
  const code=boundaryCode(latitude,longitude);
  return code?rows.find(b=>b.psgc_code===code)??null:null;
}
export function withReportGeography(row,rows=directory,site=false) {
  if(!row||row.location_pending)return row;
  const barangay=reportBarangay(site?row.center_lat:row.latitude,site?row.center_lng:row.longitude,rows);
  return {...row,barangay_id:barangay?.id??null,barangay_name:barangay?.name??'Unresolved location',city_municipality:barangay?.city_municipality??null};
}
