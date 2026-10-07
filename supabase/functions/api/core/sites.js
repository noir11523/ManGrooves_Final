import {randomUUID} from 'node:crypto';
import {AppError,integer,text,now,requireRole,validateLocation} from './domain.js';

export async function manageSites(service,user,input) {
  requireRole(user,'system_admin');
  if (!input) return {sites:(await service.rows('clusters')).sort((a,b)=>String(a.name).localeCompare(String(b.name))),barangays:await service.rows('barangays')};
  const id=input.id?integer(input.id,'site'):(await service.ids())[0];
  const barangayId=integer(input.barangay_id,'barangay'),barangay=await service.get('barangays',barangayId);
  if (!barangay) throw new AppError('Choose an available barangay.');
  const location=validateLocation({latitude:input.center_lat,longitude:input.center_lng,location_source:'manual'},barangay);
  const name=text(input.name,'the site name',120),sitio_name=text(input.sitio_name||name,'the location name',120);
  const radius=integer(input.radius_meters??100,'site radius',25,5000);
  const active=input.active===0||input.active==='0'?0:1;
  return service.db.runTransaction(async tx=>{
    requireRole((await tx.get(service.ref('users',user.uid))).data(),'system_admin');
    const ref=service.ref('clusters',id),previous=(await tx.get(ref)).data();
    if(input.id&&!previous)throw new AppError('Site not found.',404);
    if(previous&&input.version!==undefined&&input.version!==(previous.version??''))throw new AppError('This site changed. Reload before saving.',409);
    const lockRef=service.ref('meta','clusters'),lock=(await tx.get(lockRef)).data();
    const sites=await service.transactionRows(tx,'clusters',[['barangay_id','==',barangayId]]);
    if(active&&sites.some(s=>s.id!==id&&Number(s.active)!==0&&s.name.trim().toLowerCase()===name.toLowerCase()))throw new AppError('An active site with this name already exists in this barangay.',409);
    const site={...(previous??{id,cluster_code:`MGC-${id}`,initial_seedlings:0,verified_count:0,latest_health:'Unknown',created_at:now()}),
      name,sitio_name,barangay_id:barangayId,barangay_name:barangay.name,center_lat:location.latitude,center_lng:location.longitude,
      radius_meters:radius,active,updated_at:now(),version:randomUUID()};
    tx.set(ref,site);tx.set(lockRef,{version:(lock?.version??0)+1});
    service.audit(tx,user,previous?'admin.site_updated':'admin.site_created','cluster',id,{name,active});
    return {site,message:active?'Site saved.':'Site archived. Existing reports are kept.'};
  });
}
