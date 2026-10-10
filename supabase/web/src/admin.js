import {adminList} from './admin-lists.js';
import {traitImage} from './trait-labels.js';
import {sitesPage,catalogTabs} from './sites-page.js';
import { api, friendly } from './client.js';
import { $, $$, esc, field, select, formValues, errorBox, showError, toast, confirm, pager, asset } from './ui.js';
import {listFilters, bindListFilters, listRoute, filterLocalList, matchesSearch} from './list-filters.js';

function head(title, note = '') { return `<div class="page-head"><div><h1>${esc(title)}</h1><p class="muted">${esc(note)}</p></div><a class="button outline" href="#dashboard">← Dashboard</a></div>`; }
const specials = ['unknown', 'all_of_the_above', 'none_of_the_above'];
const labels = { unknown: 'Not Sure', all_of_the_above: 'All of the above', none_of_the_above: 'None of the above'};
export async function checklistPage(node) {
  const {criteria} = await api('checklist.php');
  let traitData={};
  try{traitData=await api('trait-images.php');}catch{}
  if (!node.isConnected) return;
  node.innerHTML = `${head('Health checklist', 'Edit questions, photos, and choices. Existing reports keep their original answers.')}<p class="notice">Health uses leaf color, pests, and roots: 6 Healthy · 3–5 Stressed · 0–2 At Risk. All of the above uses the lowest health score. Not Sure is unscored and requires review.</p><div id="criteria"></div>`;
  const root = $('#criteria'); let temporaryId = -1;
  node.querySelector('.page-head').insertAdjacentHTML('afterend','<section class="card trait-image-editors"><h2>Species feature pictures</h2><p>Replace the sample illustration shown for each species feature.</p><div id="trait-editors"></div></section>');
  const traitRoot=$('#trait-editors'),traitHead={root_type:'Klase sa Gamot (Root Type)',leaf_shape:'Porma sa Dahon (Leaf Shape)',bark_texture:'Hitsura sa Panit sa Punoan (Bark Texture)'};
  for(const [key,values] of Object.entries(traitData.traits??{}))for(const value of values){
    const sample='img/traits/'+traitImage(key,value)+'.svg';
    const image=traitData.trait_images?.[key]?.[value]||sample,row=document.createElement('div');
    row.className='trait-image-editor';
    const label=document.createElement('strong');label.textContent=(traitHead[key]||key)+' · '+value;
    const preview=document.createElement('img');preview.src=asset(image);preview.alt='Current sample for '+value;
    const input=document.createElement('input');input.type='file';input.accept='image/jpeg,image/png,image/webp';input.setAttribute('aria-label','Replace sample picture for '+value);
    const actions=document.createElement('div');actions.className='actions';
    const save=document.createElement('button');save.type='button';save.textContent='Save picture';
    const status=document.createElement('p');status.setAttribute('role','status');
    actions.append(save);
    const remove=document.createElement('button');
    remove.type='button';remove.className='outline';remove.textContent='Use sample illustration';remove.hidden=!traitData.trait_images?.[key]?.[value];actions.append(remove);
    row.append(label,preview,input,actions,status);traitRoot.append(row);
    save.onclick=async()=>{
      const file=input.files[0];
      if(!file||!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>5*1024*1024){status.textContent='Choose a JPG, PNG, or WebP image under 5 MB.';return;}
      save.disabled=true;const body=new FormData();body.set('payload',JSON.stringify({action:'trait_image',trait:key,value}));body.set('photo',file);
      try{const saved=await api('trait-images.php',{body});traitData.trait_images=saved.trait_images;preview.src=asset(saved.trait_images[key][value]);remove.hidden=false;status.textContent='Picture saved.';input.value='';}
      catch(error){status.textContent=friendly(error);}finally{save.disabled=false;}
    };
    remove.addEventListener('click',async()=>{
      remove.disabled=true;
      try{const saved=await api('trait-images.php',{body:{action:'trait_image',trait:key,value,remove:true}});traitData.trait_images=saved.trait_images;preview.src=asset(sample);remove.hidden=true;remove.disabled=false;status.textContent='Sample illustration restored.';}
      catch(error){status.textContent=friendly(error);remove.disabled=false;}
    });
  }
  const query = {}, rows = [];
  root.insertAdjacentHTML('beforebegin', listFilters(query, [], 'Checklist name or question'));
  root.insertAdjacentHTML('afterend', '<p class="empty filter-empty" hidden>No checklist questions match.</p>');
  const apply = () => filterLocalList(node, query, rows, (item,q) => matchesSearch([item.name, item.question_text],q));
  bindListFilters(node, query, apply);
  for (const criterion of criteria) {
    const data = structuredClone(criterion), images = new Map(), wrapper = document.createElement('details');
    wrapper.className = 'card checklist-editor'; root.append(wrapper);
    rows.push([wrapper, data]);
    function read() {
      data.name = wrapper.querySelector('[name=name]').value;
      data.question_text = wrapper.querySelector('[name=question_text]').value;
      data.remove_guide = wrapper.querySelector('[name=remove_guide]')?.checked ?? false;
      for (const option of data.options) {
        const row = wrapper.querySelector(`[data-option="${option.id}"]`);
        if (!row) continue;
        option.label = row.querySelector('[name=label]')?.value ?? option.label;
        option.points = Number(row.querySelector('[name=points]')?.value ?? 0);
        option.remove_image = row.querySelector('[name=remove_image]')?.checked ?? false;
      }
    }
    function render() {
      wrapper.innerHTML = `<summary><strong>${esc(data.name)}</strong><span class="muted">${data.score_group === 'health' ? '0–2 health points' : 'Supporting observations'}</span></summary><form>${errorBox}<div class="row">${field('name', 'Checklist name', data.name, 'text', 'required maxlength="120"')}${field('question_text', 'Question', data.question_text, 'text', 'required maxlength="255"')}</div>
        ${data.guide_image && !data.remove_guide ? `<img class="guide" src="${esc(asset(data.guide_image))}" alt="${esc(data.name)} guide">` : ''}<label class="field"><span>Guide photo</span><input type="file" data-image="guide_image" accept="image/jpeg,image/png,image/webp"><small>${images.has('guide_image') ? esc(images.get('guide_image').name) : 'Up to 5 MB'}</small></label>${data.guide_image ? `<label class="check"><input type="checkbox" name="remove_guide" ${data.remove_guide ? 'checked' : ''}>Remove guide photo</label>` : ''}
        <div class="choice-grid" style="margin-top:18px">${data.options.map(o => {
          const special = specials.includes(o.code ?? o.kind), health = data.score_group === 'health';
          return `<div class="option-editor ${o.delete ? 'removed' : ''}" data-option="${o.id}">${o.delete ? `<p>${esc(o.label)} will be removed.</p><button type="button" class="outline restore">Undo</button>` : `${field('label', 'Choice', o.label, 'text', 'required maxlength="190"')}${special ? `<p><strong>Scoring:</strong> ${(o.code ?? o.kind) === 'unknown' ? 'Not scored · Expert review' : (o.code ?? o.kind) === 'none_of_the_above' ? '0 points' : health ? 'Lowest regular score' : 'Sum of regular choices'}</p>` : field('points', 'Points', o.points, 'number', `required min="${health ? 0 : -2}" max="2" step="1"`)}${o.image_path && !o.remove_image ? `<img class="guide" src="${esc(asset(o.image_path))}" alt="${esc(o.label)}">` : ''}<label class="field"><span>Choice photo</span><input type="file" data-image="option_image_${o.id}" accept="image/jpeg,image/png,image/webp"><small>${images.has(`option_image_${o.id}`) ? esc(images.get(`option_image_${o.id}`).name) : 'Optional'}</small></label>${o.image_path ? `<label class="check"><input type="checkbox" name="remove_image" ${o.remove_image ? 'checked' : ''}>Remove photo</label>` : ''}<button type="button" class="link remove">Remove choice</button>`}</div>`;
        }).join('')}</div>
        <div class="actions"><button type="button" class="outline add" data-kind="standard">Add choice</button><button type="submit">Save checklist</button></div>
        ${specials.some(key=>(key!=='none_of_the_above'||data.selection_mode==='multiple')&&!data.options.some(o=>!o.delete&&(o.code??o.kind)===key))?`<details class="special-choices"><summary>Restore a special choice</summary><div class="actions">${specials.filter(key=>(key!=='none_of_the_above'||data.selection_mode==='multiple')&&!data.options.some(o=>!o.delete&&(o.code??o.kind)===key)).map(key=>`<button type="button" class="outline add" data-kind="${key}">Add ${labels[key]}</button>`).join('')}</div></details>`:''}</form>`;
      wrapper.querySelectorAll('[data-image]').forEach(input => input.onchange = () => {
        const file = input.files[0];
        if (!file) { images.delete(input.dataset.image); return; }
        if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) { input.value = ''; toast('Choose an image under 5 MB.'); return; }
        images.set(input.dataset.image, file);
      });
      wrapper.querySelectorAll('.add').forEach(button => button.onclick = () => {
        read(); if (data.options.filter(o => !o.delete).length >= 30) { toast('Use up to 30 choices.'); return; }
        const kind = button.dataset.kind;
        data.options.push({id: temporaryId--, kind, label: kind === 'standard' ? '' : labels[kind], points: 0, image_path: null}); render();
        wrapper.querySelector(`[data-option="${temporaryId+1}"] [name=label]`)?.focus();
      });
      wrapper.querySelectorAll('.remove,.restore').forEach(button => button.onclick = () => {
        read(); const id = Number(button.closest('[data-option]').dataset.option), option = data.options.find(o => o.id === id);
        option.delete = !option.delete; render();
      });
      wrapper.querySelector('form').onsubmit = async event => {
        event.preventDefault(); const button = event.submitter, error = wrapper.querySelector('.error'); error.textContent = '';
        if (button.disabled) return; read(); button.disabled = true;
        try {
          if ([...images.values()].reduce((total, file) => total + file.size, 0) > 8 * 1024 * 1024) throw new Error('Keep each save under 8 MB. Save photos in smaller batches.');
          const body = new FormData(); body.set('payload', JSON.stringify(data));
          for (const [key, file] of images) body.set(key, file);
          const result = await api('checklist.php', {body});
          Object.assign(data, result.criteria.find(c => c.id === data.id)); images.clear(); toast(result.message); render();
        } catch (e) { showError(error, friendly(e)); } finally { button.disabled = false; }
      };
    }
    render();
  }
  apply();
}

export async function adminPage(node, page, query = {}) {
  if(page==='species'&&query.tab==='sites')return sitesPage(node,query,()=>adminPage(node,page,query),head);
  const data = await api(`${page}.php`, {query});
  if (!node.isConnected) return;
  if (page === 'audit') {
    node.innerHTML = `${head('Audit logs', 'Account, checklist, and report changes.')}<div class="card table-wrap"><table><thead><tr><th>When</th><th>Who</th><th>Action</th><th>Record</th></tr></thead><tbody>${data.items.map(r => `<tr><td>${esc(r.created_at)}</td><td>${esc(r.actor_name ?? r.user_id ?? 'System')}</td><td>${esc(r.action)}</td><td>${esc(r.entity_type)} #${esc(r.entity_id)}</td></tr>`).join('')}</tbody></table></div>${pager(data, 'audit')}`;
    node.querySelector('.table-wrap').classList.add('audit-log-table');
    node.querySelector('.table-wrap').insertAdjacentHTML('beforebegin', listFilters(query, [['entity_type','Record',[['','All records'],['user','Accounts'],['report','Reports'],['criteria','Checklist'],['species','Species'],['badge','Badges']]]], 'Name, action, or record number'));
    node.insertAdjacentHTML('beforeend', !data.items.length ? '<p class="empty">No audit records match.</p>' : '');
    // Keep search and record filters while moving between pages.
    node.querySelector('.pagination')?.remove();
    node.insertAdjacentHTML('beforeend', pager(data, 'audit', query));
    bindListFilters(node, query, q => listRoute('audit',q), data.total);
    return;
  }
  const result=await adminList(node,page,query,data,()=>adminPage(node,page,query),head);
  if(page==='species')node.querySelector('.page-head').insertAdjacentHTML('afterend',catalogTabs('species'));
  return result;
}
