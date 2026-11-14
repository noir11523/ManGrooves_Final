import {api,friendly} from './client.js';
import {esc,toast,field} from './ui.js';
import {traitHeadings} from './trait-labels.js';

export function traitControls(root,data,criteria,reload) {
  const headings={...traitHeadings,...Object.fromEntries(Object.entries(data.trait_categories??{}).map(([k,c])=>[k,c.name]))};
  const order=data.category_order??[...Object.keys(traitHeadings),...criteria.map(c=>c.code)];
  const tools=document.createElement('div');tools.className='checklist-tools';
  tools.innerHTML='<button type="button" aria-expanded="false" aria-controls="create-category">+ Add category</button><button type="button" class="outline" aria-expanded="false" aria-controls="order-categories">Reorder</button>';
  const panel=document.createElement('section');panel.className='card checklist-order';panel.id='order-categories';panel.hidden=true;
  panel.innerHTML='<h2>Question order</h2><div class="order-list"></div><div class="actions"><button type="button">Save order</button></div>';
  root.querySelector('.list-filters').after(tools,panel);
  const draw=()=>{panel.querySelector('.order-list').innerHTML=order.map((key,i)=>`<div class="order-row"><span>${esc(headings[key]??criteria.find(c=>c.code===key)?.name)}</span><button type="button" data-move="${i}" data-step="-1" ${i===0?'disabled':''} aria-label="Move up">&#8593;</button><button type="button" data-move="${i}" data-step="1" ${i===order.length-1?'disabled':''} aria-label="Move down">&#8595;</button></div>`).join('');};draw();
  panel.querySelector('.order-list').onclick=event=>{const b=event.target.closest('[data-move]');if(!b)return;const i=Number(b.dataset.move),j=i+Number(b.dataset.step);[order[i],order[j]]=[order[j],order[i]];draw();};
  panel.querySelector('.actions button').onclick=async event=>{event.target.disabled=true;try{await api('trait-images.php',{body:{action:'order',order}});toast('Order saved.');await reload();}catch(e){toast(friendly(e));}finally{event.target.disabled=false;}};
  for(const [key,values] of Object.entries(data.traits??{})) {
    const group=[...root.querySelectorAll('.trait-editor-group')].find(g=>g.dataset.trait===key);if(!group)continue;
    const meta=data.trait_categories?.[key]??{name:headings[key],question_text:''};
    const edit=document.createElement('form');edit.className='trait-category-form';
    edit.innerHTML=`<div class="row">${field('name','Category name',meta.name,'text','required maxlength="120"')}${field('question_text','Question',meta.question_text,'text','required maxlength="255"')}</div><button>Save changes</button><p role="status"></p>`;
    group.querySelector('summary').after(edit);
    edit.onsubmit=async event=>{event.preventDefault();const button=edit.querySelector('button');button.disabled=true;try{await api('trait-images.php',{body:{action:'category',trait:key,name:edit.elements.name.value,question_text:edit.elements.question_text.value}});toast('Category saved.');await reload(key);}catch(e){edit.querySelector('[role=status]').textContent=friendly(e);}finally{button.disabled=false;}};
    group.querySelectorAll('.trait-image-editor').forEach((row,i)=>{
      const value=values[i],label=document.createElement('label');label.className='field';label.innerHTML=`<span>Choice name</span><input maxlength="190" value="${esc(data.trait_labels?.[key]?.[value]??value)}">`;
      const save=document.createElement('button');save.type='button';save.textContent='Save name';
      const remove=document.createElement('button');remove.type='button';remove.className='outline';remove.textContent='Delete choice';
      const run=async action=>{try{await api('trait-images.php',{body:{action,trait:key,value,label:label.querySelector('input').value}});toast('Saved.');await reload(key);}catch(e){toast(friendly(e));}};
      save.onclick=()=>run('rename_choice');remove.onclick=()=>run('delete_choice');row.append(label,save,remove);
    });
    const form=document.createElement('form');form.className='trait-add-form';form.innerHTML='<label class="field"><span>New choice</span><input required maxlength="190"></label><button>Add choice</button>';
    form.onsubmit=async event=>{event.preventDefault();try{await api('trait-images.php',{body:{action:'add_choice',trait:key,label:form.querySelector('input').value}});await reload(key);}catch(e){toast(friendly(e));}};group.append(form);
  }
  const create=document.createElement('section');create.className='card checklist-create';create.id='create-category';create.hidden=true;
  create.innerHTML=`<h2>Add category</h2><form><fieldset class="category-types"><legend>Type</legend><label><input type="radio" name="category_type" value="trait" checked>Traits</label><label><input type="radio" name="category_type" value="condition">Site Conditions</label></fieldset>${field('name','Category name','','text','required maxlength="120"')}${field('question_text','Question','','text','required maxlength="255"')}<label class="field"><span>Answers</span><select name="selection_mode"><option value="single">Choose one</option><option value="multiple">Choose several</option></select></label><div class="category-choices"></div><button type="button" class="outline add-category-choice">+ Add choice</button><p><small class="category-help"></small></p><div class="actions"><button type="submit">Save category</button><button type="button" class="outline cancel-category">Cancel</button></div><p role="status"></p></form>`;
  panel.before(create);
  for(const button of tools.querySelectorAll('button'))button.onclick=()=>{const target=button.getAttribute('aria-controls')===create.id?create:panel,open=target.hidden;create.hidden=true;panel.hidden=true;tools.querySelectorAll('button').forEach(b=>b.setAttribute('aria-expanded','false'));target.hidden=!open;button.setAttribute('aria-expanded',String(open));};
  create.querySelector('.cancel-category').onclick=()=>{create.hidden=true;tools.firstElementChild.setAttribute('aria-expanded','false');tools.firstElementChild.focus();};
  const answerType=create.querySelector('[name=selection_mode]'),choices=create.querySelector('.category-choices');
  const isTrait=()=>create.querySelector('[name=category_type]:checked').value==='trait';
  const refreshType=()=>{const trait=isTrait();create.dataset.kind=trait?'trait':'condition';answerType.closest('label').hidden=trait;choices.querySelectorAll('.choice-points').forEach(el=>{el.hidden=trait;el.querySelector('input').disabled=trait;});create.querySelector('.category-help').textContent=trait?'Also appears in Species and Submit Report.':'Points are saved for this question. Overall condition uses leaf color, pests, and roots.';};
  const addChoice=()=>{if(choices.children.length>=29)return;const row=document.createElement('div');row.className='category-choice';row.innerHTML='<label class="field"><span>Choice</span><input class="choice-label" required maxlength="190"></label><label class="field choice-points"><span>Points</span><input type="number" value="0" min="-2" max="2" step="1" required></label><button type="button" class="outline" aria-label="Remove choice">&times;</button>';row.querySelector('button').onclick=()=>{row.remove();create.querySelector('.add-category-choice').disabled=false;};choices.append(row);create.querySelector('.add-category-choice').disabled=choices.children.length>=29;refreshType();};
  create.querySelectorAll('[name=category_type]').forEach(r=>r.onchange=refreshType);
  create.querySelector('.add-category-choice').onclick=()=>{addChoice();choices.lastElementChild?.querySelector('input').focus();};addChoice();addChoice();
  create.querySelector('form').onsubmit=async event=>{event.preventDefault();const form=event.target,button=form.querySelector('[type=submit]');button.disabled=true;try{
    const rows=[...choices.children],labels=rows.map(row=>row.querySelector('.choice-label').value.trim());
    if(!labels.length||labels.length>29||labels.some(label=>!label))throw Error('Enter a name for each choice.');
    if(new Set(labels.map(label=>label.toLowerCase())).size!==labels.length)throw Error('Use a different name for each choice.');
    if(isTrait()){const saved=await api('trait-images.php',{body:{action:'create_category',name:form.elements.name.value,question_text:form.elements.question_text.value,choices:labels}});toast('Trait added. Set its choices in Species.');await reload(saved.trait);return;}
    const options=labels.map((label,i)=>{const unknown=label.toLowerCase()==='not sure',raw=rows[i].querySelector('.choice-points input').value,points=Number(raw);if(!unknown&&(raw===''||!Number.isInteger(points)||points< -2||points>2))throw Error('Use whole-number points from -2 to 2.');return {id:-(i+1),kind:unknown?'unknown':'standard',label,points:unknown?0:points};});
    if(!labels.some(l=>l.toLowerCase()==='not sure'))options.push({id:-(options.length+1),kind:'unknown',label:'Not Sure',points:0});
    const saved=await api('checklist.php',{body:{action:'create',name:form.elements.name.value,question_text:form.elements.question_text.value,selection_mode:form.elements.selection_mode.value,options}});toast('Category added.');await reload(saved.criteria?.find(c=>c.name===form.elements.name.value.trim())?.code);
  }catch(e){form.querySelector('[role=status]').textContent=friendly(e);}finally{button.disabled=false;}};
  // Display the same ordering used by the report wizard.
  const containers=[...root.querySelectorAll('.trait-editor-group'),...root.querySelectorAll('#criteria > details')];
  for(const key of order){const item=containers.find(el=>el.dataset.trait===key||el.dataset.criterion===key);if(item)root.append(item);}
}
