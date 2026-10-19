import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolveAnimalChoices} from '../src/observation-selection.js';
import {classify} from '../../functions/api/core/domain.js';
const {criteria}=JSON.parse(readFileSync(new URL('../../data/reference.json',import.meta.url)));
const id=(group,code)=>criteria.find(c=>c.code===group).options.find(o=>o.code===code).id;
const animal=criteria.find(c=>c.code==='bio_indicators').options[0];
test('animal sightings remove no-animals while keeping mosquito and trash observations',()=>{
 for(const negative of [[id('negative_signs','no_animals'),id('negative_signs','mosquitoes')],[id('negative_signs','all_of_the_above')]]){
  const answers={bio_indicators:[animal.id],negative_signs:negative};
  resolveAnimalChoices(criteria,answers,'bio_indicators',animal.code);
  assert.ok(answers.negative_signs.includes(id('negative_signs','mosquitoes')));
  assert.ok(!answers.negative_signs.includes(id('negative_signs','no_animals')));
  const complete=Object.fromEntries(criteria.map(c=>[c.code,[c.options.find(o=>o.code==='unknown').id]]));
  assert.doesNotThrow(()=>classify(criteria,{...complete,...answers}));
 }
});
test('no-animals clears animal sightings; mosquitoes alone do not',()=>{
 const answers={bio_indicators:[animal.id],negative_signs:[id('negative_signs','mosquitoes')]};
 resolveAnimalChoices(criteria,answers,'negative_signs','mosquitoes');
 assert.deepEqual(answers.bio_indicators,[animal.id]);
 resolveAnimalChoices(criteria,answers,'negative_signs','no_animals');
 assert.deepEqual(answers.bio_indicators,[]);
});

test('animal selections preserve non-conflicting unknown and no-negative-sign answers',()=>{
 for(const code of ['unknown','none_of_the_above']){
  const answers={bio_indicators:[animal.id],negative_signs:[id('negative_signs',code)]};
  resolveAnimalChoices(criteria,answers,'bio_indicators',animal.code);
  assert.deepEqual(answers.negative_signs,[id('negative_signs',code)]);
 }
});
