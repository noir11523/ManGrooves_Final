import test from 'node:test';
import assert from 'node:assert/strict';
import {traitCatalog,editTraits} from '../functions/api/core/trait-catalog.js';
import {matchSpecies} from '../functions/api/core/domain.js';
import {Service} from '../functions/api/core/service.js';
import {isNamedSite} from '../functions/api/core/site-access.js';
import {clarityProblem} from '../web/src/photo-quality.js';

function fixture(){
  const admin={uid:'admin',id:1,role:'system_admin',status:'active'},data=new Map([['users/admin',admin]]);
  const species=[{id:1,active:1,scientific_name:'Test mangrove',root_type:'Prop roots',leaf_shape:'Elliptic',bark_texture:'Rough'}];
  const service={ref:(c,id)=>`${c}/${id}`,get:async(c,id)=>structuredClone(data.get(`${c}/${id}`)),
    rows:async()=>structuredClone(species),criteria:async()=>[{code:'roots'},{code:'leaf_color'}],audit(){},transactionRows:async()=>structuredClone(species)};
  service.db={runTransaction:async work=>work({get:async ref=>({data:()=>structuredClone(data.get(ref))}),set:(ref,value)=>data.set(ref,structuredClone(value))})};
  return {service,admin,species,data};
}
test('trait labels change without breaking species values; deleted unused choices retain history',async()=>{
  const {service,admin,species,data}=fixture();
  await editTraits(service,admin,{action:'rename_choice',trait:'leaf_shape',value:'Elliptic',label:'Oval nga dahon (Elliptic)'});
  let catalog=await traitCatalog(service);
  assert.equal(catalog.trait_labels.leaf_shape.Elliptic,'Oval nga dahon (Elliptic)');
  assert.equal(matchSpecies(species,species[0]).best.id,1);
  await assert.rejects(editTraits(service,admin,{action:'delete_choice',trait:'leaf_shape',value:'Elliptic'}),/Update species/);
  await editTraits(service,admin,{action:'add_choice',trait:'leaf_shape',label:'Obovate'});
  catalog=await traitCatalog(service);const added=catalog.traits.leaf_shape.find(v=>v!=='Elliptic');
  await editTraits(service,admin,{action:'delete_choice',trait:'leaf_shape',value:added});
  assert.deepEqual((await traitCatalog(service)).traits.leaf_shape,['Elliptic']);
  assert.ok(data.get('meta/trait_catalog').leaf_shape.find(c=>c.value===added).deleted_at);
});
test('category order validates complete membership and is admin-only',async()=>{
  const {service,admin}=fixture(),initial=(await traitCatalog(service)).category_order;
  assert.deepEqual(initial.slice(0,3),['root_type','leaf_shape','bark_texture']);
  const order=[...initial].reverse();await editTraits(service,admin,{action:'order',order});
  assert.deepEqual((await traitCatalog(service)).category_order,order);
  await assert.rejects(editTraits(service,admin,{action:'order',order:order.slice(1)}),/Reload/);
  await assert.rejects(editTraits(service,{...admin,role:'expert'},{action:'order',order}));
});
test('weak or conflicting species traits never produce a confident identification',()=>{
  const {species}=fixture();
  assert.equal(matchSpecies(species,{...species[0],leaf_shape:'Elliptic (with dark dots)'}).best,null);
  assert.equal(matchSpecies([...species,{...species[0],id:2}],species[0]).best,null);
});
test('shared verified sites are available across home barangays; coordinate placeholders stay out',async()=>{
  const service=new Service({});
  service.rows=async name=>name==='clusters'?[
    {id:1,name:'Cebu coast',visibility:'shared',active:1,verified_count:1,barangay_id:5,center_lat:10.28,center_lng:123.88},
    {id:2,name:'Pending coast',visibility:'personal',created_by:7,verified_count:0},
    {id:3,name:'Pinned location (10.28, 123.88)',visibility:'personal',created_by:9,verified_count:1}]:[];
  service.get=async()=>null;
  for(const user of [{id:9,role:'guardian',status:'active',barangay_id:1},{id:10,role:'expert',status:'active',barangay_id:12}]){
    assert.deepEqual((await service.form(user)).clusters.map(c=>c.id),[1]);
  }
  for(const name of ['','Pinned location (10.28, 123.88)','Loading address','10.28, 123.88'])assert.equal(isNamedSite({name}),false);
});
test('photo clarity distinguishes tiny/blank photos from detailed photos',()=>{
  const flat=new Uint8Array(192*192*4).fill(128);
  assert.match(clarityProblem(128,128,flat),/too small/);
  assert.match(clarityProblem(800,600,flat),/unclear/);
  const detailed=flat.map((_,i)=>((i>>2)+Math.floor((i>>2)/192))%2?255:0);
  assert.equal(clarityProblem(800,600,detailed),'');
});

test('trait category metadata and order persist independently without changing species matching',async()=>{
  const {service,admin,species}=fixture();
  const before=await traitCatalog(service),order=[...before.category_order].reverse();
  await editTraits(service,admin,{action:'category',trait:'leaf_shape',name:'Leaf outline',question_text:'Which shape matches?'});
  await editTraits(service,admin,{action:'order',order});
  let next=await traitCatalog(service);
  assert.deepEqual(next.trait_categories.leaf_shape,{name:'Leaf outline',question_text:'Which shape matches?'});
  assert.deepEqual(next.category_order,order);
  assert.deepEqual(next.traits,before.traits);
  assert.equal(matchSpecies(species,species[0]).best.id,1);
  await assert.rejects(editTraits(service,admin,{action:'category',trait:'other',name:'x',question_text:'x'}));
  await assert.rejects(editTraits(service,{...admin,role:'expert'},{action:'category',trait:'leaf_shape',name:'x',question_text:'x'}));
  await assert.rejects(editTraits(service,admin,{action:'category',trait:'leaf_shape',name:'',question_text:'x'}));
});
test('form reuses loaded checklist and species instead of repeating database reads',async()=>{
  const service=new Service({}),reads=[];
  service.rows=async key=>{reads.push(key);return [];};service.get=async()=>null;
  await service.form({id:1,role:'guardian',status:'active'});
  assert.equal(reads.filter(k=>k==='criteria').length,1);
  assert.equal(reads.filter(k=>k==='species').length,1);
});
