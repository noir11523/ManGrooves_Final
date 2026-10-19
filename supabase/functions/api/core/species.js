import {AppError,integer,text,now,requireRole} from './domain.js';

export async function manageSpecies(service,user,input) {
  if (!input) return {species:user.role==='system_admin'
    ? (await service.rows('species')).filter(s=>!s.deleted_at)
    : await service.species()};
  requireRole(user,'system_admin','expert');
  const removing=input.action==='delete';
  if(input.action && !removing) throw new AppError('Choose a valid species action.');
  if(removing && !input.id) throw new AppError('Choose a species to delete.');
  const id=input.id?integer(input.id,'species'):(await service.ids())[0];
  const fields=['local_name','common_name','scientific_name','family','iucn_code','iucn_label','population_trend','root_type','leaf_shape','bark_texture'];
  const data=removing?null:{id,active:input.active===0||input.active==='0'?0:1,
    ...Object.fromEntries(fields.map(k=>[k,text(input[k]??'',k.replaceAll('_',' '),255,['scientific_name','common_name','root_type','leaf_shape','bark_texture'].includes(k))]))};
  return service.db.runTransaction(async tx=>{
    requireRole((await tx.get(service.ref('users',user.uid))).data(),'system_admin','expert');
    const ref=service.ref('species',id),previous=(await tx.get(ref)).data();
    if((input.id&&!previous)||previous?.deleted_at) throw new AppError('Species not found. Refresh the list.',404);
    if(removing){
      // Keep the reference for historical reports, but remove it from every catalog.
      tx.update(ref,{active:0,deleted_at:now(),deleted_by:user.id});
      service.audit(tx,user,'admin.species_deleted','species',id,{scientific_name:previous.scientific_name});
      return {message:'Species deleted. Existing reports are kept.'};
    }
    tx.set(ref,data,{merge:true});
    service.audit(tx,user,'admin.species_updated','species',id);
    return {message:'Species saved.',species:data};
  });
}
