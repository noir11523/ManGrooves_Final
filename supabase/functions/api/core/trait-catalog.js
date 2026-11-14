import {randomUUID} from 'node:crypto';
import {AppError, requireRole, text} from './domain.js';

export const traitKeys = ['root_type', 'leaf_shape', 'bark_texture'];
export const traitCategories = {
  root_type: {name:'Klase sa Gamot (Root Type)',question_text:'What do the roots look like?'},
  leaf_shape: {name:'Porma sa Dahon (Leaf Shape)',question_text:'What shape are the leaves?'},
  bark_texture: {name:'Hitsura sa Panit sa Punoan (Bark Texture)',question_text:'What does the bark look like?'},
};
export async function traitCatalog(service, supplied = {}) {
  const [species, saved, criteria, layout] = await Promise.all([supplied.species ?? service.rows('species').then(rows=>rows.filter(s=>!s.deleted_at)), service.get('meta','trait_catalog'), supplied.criteria ?? service.criteria(), service.get('meta','observation_layout')]);
  const choices = Object.fromEntries(traitKeys.map(key => [key, (saved?.[key] ?? [...new Set(species.map(s=>s[key]).filter(Boolean))].sort().map(value=>({value,label:value}))).filter(c=>!c.deleted_at)]));
  const keys = [...traitKeys, ...criteria.map(c=>c.code)];
  const category_order = [...new Set([...(layout?.order??[]),...keys])].filter(key=>keys.includes(key));
  return {trait_categories:{...traitCategories,...layout?.traits}, traits:Object.fromEntries(traitKeys.map(key=>[key,choices[key].map(c=>c.value)])), trait_labels:Object.fromEntries(traitKeys.map(key=>[key,Object.fromEntries(choices[key].map(c=>[c.value,c.label]))])), category_order};
}

export async function editTraits(service, user, input) {
  requireRole(user,'system_admin');
  const current = await traitCatalog(service);
  return service.db.runTransaction(async tx=>{
    requireRole((await tx.get(service.ref('users',user.uid))).data(),'system_admin');
    const layoutRef=service.ref('meta','observation_layout');
    const layout=(await tx.get(layoutRef)).data()??{};
    if(input.action==='category') {
      if(!traitKeys.includes(input.trait))throw new AppError('Choose a valid trait.');
      const category={name:text(input.name,'a category name',120),question_text:text(input.question_text,'a short question',255)};
      tx.set(layoutRef,{...layout,traits:{...layout.traits,[input.trait]:category}});
    } else if(input.action==='order') {
      if(!Array.isArray(input.order)||input.order.length!==current.category_order.length||new Set(input.order).size!==input.order.length||input.order.some(k=>!current.category_order.includes(k))) throw new AppError('Reload the checklist before changing its order.');
      tx.set(layoutRef,{...layout,order:input.order});
    } else {
      const key=input.trait;
      if(!traitKeys.includes(key))throw new AppError('Choose a valid trait.');
      const ref=service.ref('meta','trait_catalog');
      const stored=(await tx.get(ref)).data()??{};
      const choices=stored[key]??current.traits[key].map(value=>({value,label:current.trait_labels[key][value]}));
      const index=choices.findIndex(c=>!c.deleted_at&&c.value===input.value);
      if(input.action==='delete_choice') {
        if(index<0)throw new AppError('Choice not found. Refresh the checklist.',409);
        const species=await service.transactionRows(tx,'species');
        if(species.some(s=>!s.deleted_at&&s[key]===input.value))throw new AppError('Update species using this choice before deleting it.',409);
        if(choices.filter(c=>!c.deleted_at).length===1)throw new AppError('Keep at least one choice.');
        choices[index]={...choices[index],deleted_at:new Date().toISOString()};
      } else {
        const label=text(input.label,'a choice name',190);
        if(choices.some((c,i)=>i!==index&&!c.deleted_at&&c.label.toLowerCase()===label.toLowerCase()))throw new AppError('This choice name already exists.');
        if(input.action==='add_choice')choices.push({value:`trait_${randomUUID()}`,label});
        else if(input.action==='rename_choice'&&index>=0)choices[index]={...choices[index],label};
        else throw new AppError('Choice not found. Refresh the checklist.',409);
      }
      const complete=Object.fromEntries(traitKeys.map(k=>[k,stored[k]??current.traits[k].map(value=>({value,label:current.trait_labels[k][value]}))]));
      tx.set(ref,{...complete,[key]:choices});
    }
    service.audit(tx,user,'admin.traits_updated','criteria',input.trait??'order');
    return {message:'Checklist saved.'};
  });
}
