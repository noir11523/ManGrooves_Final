import {randomUUID} from 'node:crypto';
import {AppError,integer,text,now,requireRole,validateLocation} from './domain.js';

export async function manageSites(service,user,input) {
  requireRole(user,'system_admin','expert');
  if (!input) return {sites:(await service.rows('clusters')).filter(s=>!s.deleted_at).sort((a,b)=>String(a.name).localeCompare(String(b.name))),barangays:await service.rows('barangays')};
  const id=input.id?integer(input.id,'site'):(await service.ids())[0];
  if(['approve','delete'].includes(input.action))return service.db.runTransaction(async tx=>{
    requireRole((await tx.get(service.ref('users',user.uid))).data(),'system_admin','expert');
    const ref=service.ref('clusters',id),previous=(await tx.get(ref)).data();
    if(!previous||previous.deleted_at)throw new AppError('Site not found.',404);
    if(input.version!==undefined&&input.version!==(previous.version??''))throw new AppError('This site changed. Reload before saving.',409);
    const lockRef=service.ref('meta','clusters'),lock=(await tx.get(lockRef)).data();
    if(['approve','delete'].includes(input.action)){
      if(!previous)throw new AppError('Site not found.',404);
      const update=input.action==='approve'?{visibility:'shared',approved_by:user.id,approved_by_name:user.full_name,approved_at:now()}:{deleted_at:now(),active:0};
      tx.update(ref,{...update,version:randomUUID(),updated_at:now()});tx.set(lockRef,{version:(lock?.version??0)+1});
      service.audit(tx,user,`site.${input.action}`,'cluster',id,{name:previous.name});
      return {message:input.action==='approve'?'Site approved. It is now available in the shared site list.':'Site deleted from the catalog. Existing reports are kept.'};
    }
  });
  const barangayId=integer(input.barangay_id,'barangay'),barangay=await service.get('barangays',barangayId);
  if (!barangay) throw new AppError('Choose an available barangay.');
  const location=validateLocation({latitude:input.center_lat,longitude:input.center_lng,location_source:'manual'},barangay);
  const name=text(input.name,'the site name',120),sitio_name=text(input.sitio_name||name,'the location name',120);
  const radius=integer(input.radius_meters??100,'site radius',25,5000);
  const active=input.active===0||input.active==='0'?0:1;
  return service.db.runTransaction(async tx=>{
    requireRole((await tx.get(service.ref('users',user.uid))).data(),'system_admin','expert');
    const ref=service.ref('clusters',id),previous=(await tx.get(ref)).data();
    if(input.id&&!previous)throw new AppError('Site not found.',404);
    if(previous?.deleted_at)throw new AppError('Site not found.',404);
    if(previous&&input.version!==undefined&&input.version!==(previous.version??''))throw new AppError('This site changed. Reload before saving.',409);
    const lockRef=service.ref('meta','clusters'),lock=(await tx.get(lockRef)).data();
    const sites=await service.transactionRows(tx,'clusters',[['barangay_id','==',barangayId]]);
    if(active&&sites.some(s=>s.id!==id&&!s.deleted_at&&Number(s.active)!==0&&(s.visibility!=='personal'||s.created_by===previous?.created_by)&&s.name.trim().toLowerCase()===name.toLowerCase()))throw new AppError('An active site with this name already exists in this barangay.',409);
    const site={...(previous??{visibility:'shared',created_by:user.id,created_by_name:user.full_name,approved_by:user.id,approved_at:now(),id,cluster_code:`MGC-${id}`,initial_seedlings:0,verified_count:0,latest_health:'Unknown',created_at:now()}),
      name,sitio_name,barangay_id:barangayId,barangay_name:barangay.name,center_lat:location.latitude,center_lng:location.longitude,
      radius_meters:radius,active,updated_at:now(),version:randomUUID()};
    tx.set(ref,site);tx.set(lockRef,{version:(lock?.version??0)+1});
    service.audit(tx,user,previous?'admin.site_updated':'admin.site_created','cluster',id,{name,active});
    return {site,message:active?'Site saved.':'Site archived. Existing reports are kept.'};
  });
}
