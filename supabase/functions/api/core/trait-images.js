import {AppError, requireRole, text} from './domain.js';
import {saveImage} from './uploads.js';

export async function traitImages(service,user,input,files={}) {
  requireRole(user,'system_admin');
  const species=await service.species();
  const traits=Object.fromEntries(['root_type','leaf_shape','bark_texture'].map(k=>[k,[...new Set(species.map(s=>s[k]).filter(Boolean))].sort()]));
  if(input) {
    const key=input.trait, value=text(input.value,'the feature',255);
    if(!traits[key]?.includes(value))throw new AppError('Choose an existing species feature.');
    const upload=input.remove===true?null:await saveImage(service.bucket,files.photo,'checklist');
    try {
      await service.db.runTransaction(async tx=>{
        requireRole((await tx.get(service.ref('users',user.uid))).data(),'system_admin');
        const ref=service.ref('meta','trait_images'), images=(await tx.get(ref)).data()??{};
        const group={...images[key]};
        if(upload)group[value]=`../mobile-api/checklist-photo.php?path=${encodeURIComponent(upload.path)}`;
        else delete group[value];
        tx.set(ref,{...images,[key]:group});
        service.audit(tx,user,'admin.trait_image_updated','species',key,{value,removed:!upload});
      });
    } catch(error) {if(upload)await service.bucket.file(upload.path).delete().catch(()=>{});throw error;}
  }
  return {traits,trait_images:(await service.get('meta','trait_images'))??{},message:input?'Feature image saved.':null};
}
