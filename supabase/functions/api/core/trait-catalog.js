import {randomUUID} from 'node:crypto';
import {AppError, requireRole, text} from './domain.js';

export const traitKeys = ['root_type', 'leaf_shape', 'bark_texture'];
export const customTrait = key => /^trait_category_[a-f0-9]{32}$/.test(key);
export const traitCategories = {
  root_type: {name:'Klase sa Gamot (Root Type)',question_text:'What do the roots look like?'},
  leaf_shape: {name:'Porma sa Dahon (Leaf Shape)',question_text:'What shape are the leaves?'},
  bark_texture: {name:'Hitsura sa Panit sa Punoan (Bark Texture)',question_text:'What does the bark look like?'},
};
export async function traitCatalog(service, supplied = {}) {
  const [species, saved, criteria, layout] = await Promise.all([supplied.species ?? service.rows('species').then(rows=>rows.filter(s=>!s.deleted_at)), service.get('meta','trait_catalog'), supplied.criteria ?? service.criteria(), service.get('meta','observation_layout')]);
  const categories={...traitCategories,...layout?.traits};
  const allTraits=[...traitKeys,...Object.keys(categories).filter(customTrait)];
  const choices = Object.fromEntries(allTraits.map(key => [key, (saved?.[key] ?? [...new Set(species.map(s=>s[key]).filter(Boolean))].sort().map(value=>({value,label:value}))).filter(c=>!c.deleted_at)]));
  const keys = [...allTraits, ...criteria.map(c=>c.code)];
  const category_order = [...new Set([...(layout?.order??[]),...keys])].filter(key=>keys.includes(key));
  return {trait_categories:categories, traits:Object.fromEntries(allTraits.map(key=>[key,choices[key].map(c=>c.value)])), trait_labels:Object.fromEntries(allTraits.map(key=>[key,Object.fromEntries(choices[key].map(c=>[c.value,c.label]))])), category_order};
}

// New clients submit each custom trait by its stable key. Older reports remain readable.
export function selectedCustomTraits(catalog,input) {
  const result={};
  for(const key of Object.keys(input).filter(customTrait)) {
    if(!catalog.traits[key]?.includes(input[key]))throw new AppError('A trait changed. Reopen the checklist.',409);
    result[key]=input[key];
  }
  return result;
}

export async function editTraits(service, user, input) {
  requireRole(user,'system_admin');
  const current = await traitCatalog(service);
  return service.db.runTransaction(async tx=>{
    requireRole((await tx.get(service.ref('users',user.uid))).data(),'system_admin');
    const layoutRef=service.ref('meta','observation_layout');
    const layout=(await tx.get(layoutRef)).data()??{};
    if(input.action==='create_category') {
      const name=text(input.name,'a category name',120),question_text=text(input.question_text,'a short question',255);
      if(!Array.isArray(input.choices)||!input.choices.length||input.choices.length>30)throw new AppError('Enter 1 to 30 choices.');
      const labels=input.choices.map(label=>text(label,'a choice name',190));
      if(new Set(labels.map(label=>label.toLowerCase())).size!==labels.length)throw new AppError('Use different choice names.');
      const categories={...traitCategories,...layout.traits};
      if(Object.keys(categories).length>=20)throw new AppError('Use up to 20 trait categories.');
      if(Object.values(categories).some(c=>c.name.toLowerCase()===name.toLowerCase()))throw new AppError('This trait category already exists.');
      const key=`trait_category_${randomUUID().replaceAll('-','')}`,ref=service.ref('meta','trait_catalog'),stored=(await tx.get(ref)).data()??{};
      const order=[...new Set([...(layout.order??current.category_order),...Object.keys(categories)])];
      const lastTrait=Math.max(-1,...order.map((value,i)=>Object.hasOwn(categories,value)?i:-1));order.splice(lastTrait+1,0,key);
      tx.set(ref,{...stored,[key]:labels.map(label=>({value:`choice_${randomUUID().replaceAll('-','')}`,label}))});
      tx.set(layoutRef,{...layout,order,traits:{...layout.traits,[key]:{name,question_text,custom:true}}});
      service.audit(tx,user,'admin.trait_category_created','criteria',key);
      return {message:'Trait category added.',trait:key};
    } else if(input.action==='category') {
      if(!current.traits[input.trait])throw new AppError('Choose a valid trait.');
      const category={...layout.traits?.[input.trait],name:text(input.name,'a category name',120),question_text:text(input.question_text,'a short question',255)};
      tx.set(layoutRef,{...layout,traits:{...layout.traits,[input.trait]:category}});
    } else if(input.action==='order') {
      if(!Array.isArray(input.order)||input.order.length!==current.category_order.length||new Set(input.order).size!==input.order.length||input.order.some(k=>!current.category_order.includes(k))) throw new AppError('Reload the checklist before changing its order.');
      tx.set(layoutRef,{...layout,order:input.order});
    } else {
      const key=input.trait;
      if(!current.traits[key])throw new AppError('Choose a valid trait.');
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
      const complete={...stored,...Object.fromEntries(Object.keys(current.traits).map(k=>[k,stored[k]??current.traits[k].map(value=>({value,label:current.trait_labels[k][value]}))]))};
      tx.set(ref,{...complete,[key]:choices});
    }
    service.audit(tx,user,'admin.traits_updated','criteria',input.trait??'order');
    return {message:'Checklist saved.'};
  });
}
