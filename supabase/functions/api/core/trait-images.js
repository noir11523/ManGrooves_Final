import {traitCatalog,editTraits} from './trait-catalog.js';
import {AppError, requireRole, text} from './domain.js';
import {saveImage} from './uploads.js';
import {photoCredits} from './reference-photos.js';

export async function traitImages(service,user,input,files={}) {
  requireRole(user,'system_admin');
  let editResult;
  if(input&&['create_category','category','order','add_choice','rename_choice','delete_choice'].includes(input.action)){
    const uploads=[],choiceImages={};
    try {
      if(input.action==='create_category')for(const [name,bytes] of Object.entries(files)){
        const match=/^choice_image_(\d+)$/.exec(name),index=match?Number(match[1]):-1;
        if(!Array.isArray(input.choices)||index<0||index>=input.choices.length||input.choices.length>30)throw new AppError('Choose a photo for an existing choice.');
        const image=await saveImage(service.bucket,bytes,'checklist');uploads.push(image.path);
        choiceImages[index]=`../mobile-api/checklist-photo.php?path=${encodeURIComponent(image.path)}`;
      }
      editResult=await editTraits(service,user,input,choiceImages);input=null;
    }catch(error){await Promise.allSettled(uploads.map(path=>service.bucket.file(path).delete()));throw error;}
  }
  const catalog=await traitCatalog(service),traits=catalog.traits;
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
  return {...catalog,photo_credits:photoCredits,trait_images:(await service.get('meta','trait_images'))??{},message:input?'Feature image saved.':null,...editResult};
}
