import {api,friendly} from './client.js';
import {esc,toast,field} from './ui.js';
import {traitHeadings} from './trait-labels.js';

export function traitControls(root,data,criteria,reload) {
  const headings={...traitHeadings,...Object.fromEntries(Object.entries(data.trait_categories??{}).map(([k,c])=>[k,c.name]))};
  const order=data.category_order??[...Object.keys(traitHeadings),...criteria.map(c=>c.code)];
  const panel=document.createElement('details');panel.className='card checklist-order';
  panel.innerHTML='<summary>Question order</summary><p>Move questions up or down.</p><div class="order-list"></div><button type="button">Save order</button>';
  root.querySelector('.list-filters').after(panel);
  const draw=()=>{panel.querySelector('.order-list').innerHTML=order.map((key,i)=>`<div class="order-row"><span>${esc(headings[key]??criteria.find(c=>c.code===key)?.name)}</span><button type="button" data-move="${i}" data-step="-1" ${i===0?'disabled':''} aria-label="Move up">&#8593;</button><button type="button" data-move="${i}" data-step="1" ${i===order.length-1?'disabled':''} aria-label="Move down">&#8595;</button></div>`).join('');};draw();
  panel.querySelector('.order-list').onclick=event=>{const b=event.target.closest('[data-move]');if(!b)return;const i=Number(b.dataset.move),j=i+Number(b.dataset.step);[order[i],order[j]]=[order[j],order[i]];draw();};
  panel.lastElementChild.onclick=async()=>{try{await api('trait-images.php',{body:{action:'order',order}});toast('Order saved.');await reload();}catch(e){toast(friendly(e));}};
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
  const create=document.createElement('details');create.className='card checklist-create';
  create.innerHTML=`<summary>Add category</summary><form><label class="field"><span>Category type</span><select name="category_type"><option value="condition">Site Conditions</option><option value="trait">Traits</option></select></label>${field('name','Category name','','text','required maxlength="120"')}${field('question_text','Question','','text','required maxlength="255"')}<label class="field"><span>Answers</span><select name="selection_mode"><option value="single">Choose one</option><option value="multiple">Choose several</option></select></label><label class="field"><span>Choices (one per line)</span><textarea name="choices" rows="3" required placeholder="Yes&#10;No"></textarea></label><small class="category-help">Added under Site Conditions. Does not change condition scoring.</small><div class="actions"><button>Add category</button></div><p role="status"></p></form>`;
  panel.before(create);
  const kind=create.querySelector('[name=category_type]'),answerType=create.querySelector('[name=selection_mode]');
  kind.onchange=()=>{const trait=kind.value==='trait';answerType.closest('label').hidden=trait;answerType.value='single';create.querySelector('.category-help').textContent=trait?'Syncs with Species and Submit Report. Assign a choice to each species.':'Added under Site Conditions. Does not change condition scoring.';};
  create.querySelector('form').onsubmit=async event=>{event.preventDefault();const form=event.target,button=form.querySelector('button');button.disabled=true;try{
    const labels=[...new Set(form.elements.choices.value.split(/\r?\n/).map(v=>v.trim()).filter(Boolean))];
    if(!labels.length||labels.length>29)throw Error('Enter 1 to 29 choices.');
    if(form.elements.category_type.value==='trait'){const saved=await api('trait-images.php',{body:{action:'create_category',name:form.elements.name.value,question_text:form.elements.question_text.value,choices:labels}});toast('Trait added. Set its choices in Species.');await reload(saved.trait);return;}
    const options=labels.map((label,i)=>({id:-(i+1),kind:label.toLowerCase()==='not sure'?'unknown':'standard',label,points:0}));
    if(!labels.some(l=>l.toLowerCase()==='not sure'))options.push({id:-(options.length+1),kind:'unknown',label:'Not Sure',points:0});
    const saved=await api('checklist.php',{body:{action:'create',name:form.elements.name.value,question_text:form.elements.question_text.value,selection_mode:form.elements.selection_mode.value,options}});toast('Category added.');await reload(saved.criteria?.find(c=>c.name===form.elements.name.value.trim())?.code);
  }catch(e){form.querySelector('[role=status]').textContent=friendly(e);}finally{button.disabled=false;}};
  // Display the same ordering used by the report wizard.
  const containers=[...root.querySelectorAll('.trait-editor-group'),...root.querySelectorAll('#criteria > details')];
  for(const key of order){const item=containers.find(el=>el.dataset.trait===key||el.dataset.criterion===key);if(item)root.append(item);}
}
