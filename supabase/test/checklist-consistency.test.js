import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {classify,updateCriterion} from '../functions/api/core/domain.js';
import {orderedObservations} from '../functions/api/core/observation-order.js';
import {databaseFixture} from './database-fixture.js';
const criteria=JSON.parse(readFileSync(new URL('../data/reference.json',import.meta.url))).criteria;

test('choice order persists without changing IDs, images or special behavior; supporting points are zero',()=>{
 for(const current of criteria){
  const input=structuredClone(current);input.options.reverse();
  if(!['leaf_color','pests','roots'].includes(current.code))input.options.forEach(o=>o.points=99);
  const saved=updateCriterion(current,input,()=>99999);
  assert.deepEqual(saved.options.map(o=>o.id),input.options.map(o=>o.id));
  assert.deepEqual(saved.options.map(o=>o.display_order),saved.options.map((_,i)=>i+1));
  assert.notEqual(saved.version,current.version);
  for(const option of saved.options){const old=current.options.find(o=>o.id===option.id);assert.equal(option.code,old.code);assert.equal(option.image_path,old.image_path);if(!['leaf_color','pests','roots'].includes(current.code))assert.equal(option.points,0);}
 }
});
test('observation presentation uses configured category/choice order and preserves historical labels',()=>{
 const report={health_score:4,suggested_health:'Stressed',final_health:'Healthy',root_type:'old root',observation_snapshots:[
 {criteria_code:'leaf_color',criteria_name:'Old color',option_id:1,option_label:'Old green',points:2},
 {criteria_code:'bio_indicators',criteria_name:'Animals',option_id:9,option_label:'Bird',points:1},
 {criteria_code:'bio_indicators',criteria_name:'Animals',option_id:8,option_label:'Fish',points:1},
 {criteria_code:'removed',criteria_name:'Old question',option_label:'Saved answer',points:1}]};
 const before=JSON.stringify(report);
 const result=orderedObservations(report,{trait_categories:{root_type:{name:'Roots'}},category_order:['root_type','bio_indicators','leaf_color']},[{code:'bio_indicators',options:[{id:8},{id:9}]}]);
 assert.deepEqual(result.map(o=>o.code),['root_type','bio_indicators','leaf_color','removed']);
 assert.deepEqual(result[1].options.map(o=>o.label),['Fish','Bird']);assert.equal(result[2].name,'Old color');assert.equal(JSON.stringify(report),before);
});
test('manual supporting migration is idempotent and never changes reports or logs',async t=>{
 const {pg,db}=await databaseFixture();t.after(()=>pg.close());
 for(const c of criteria)await db.collection('criteria').doc(String(c.id)).set(c);
 for(const name of ['reports','verification_logs','audit_logs'])await db.collection(name).doc('1').set({id:1,points:2,health_score:6,observation_snapshots:criteria});
 const before=(await pg.query("select collection,document_id,data,revision from app_documents where collection <> 'criteria' order by collection,document_id")).rows;
 const sql=readFileSync(new URL('../manual-migrations/supporting-points-zero.sql',import.meta.url),'utf8');await pg.exec(sql);
 const once=(await pg.query("select data,revision from app_documents where collection='criteria' order by document_id")).rows;
 await pg.exec(sql);assert.deepEqual((await pg.query("select data,revision from app_documents where collection='criteria' order by document_id")).rows,once);
 assert.deepEqual((await pg.query("select collection,document_id,data,revision from app_documents where collection <> 'criteria' order by collection,document_id")).rows,before);
 for(const {data} of once)if(!['leaf_color','pests','roots'].includes(data.code))assert.ok(data.options.every(o=>o.points===0));
});
