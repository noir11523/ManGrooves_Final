import {api,friendly} from './client.js';
import {esc,toast} from './ui.js';
import {traitHeadings} from './trait-labels.js';

export function traitControls(root,data,criteria,reload) {
  const order=data.category_order??[...Object.keys(traitHeadings),...criteria.map(c=>c.code)];
  const panel=document.createElement('details');panel.className='card checklist-order';
  panel.innerHTML='<summary>Question order</summary><p>Move questions up or down.</p><div class="order-list"></div><button type="button">Save order</button>';
  root.querySelector('.list-filters').after(panel);
  const draw=()=>{panel.querySelector('.order-list').innerHTML=order.map((key,i)=>`<div class="order-row"><span>${esc(traitHeadings[key]??criteria.find(c=>c.code===key)?.name)}</span><button type="button" data-move="${i}" data-step="-1" ${i===0?'disabled':''} aria-label="Move up">&#8593;</button><button type="button" data-move="${i}" data-step="1" ${i===order.length-1?'disabled':''} aria-label="Move down">&#8595;</button></div>`).join('');};draw();
  panel.querySelector('.order-list').onclick=event=>{const b=event.target.closest('[data-move]');if(!b)return;const i=Number(b.dataset.move),j=i+Number(b.dataset.step);[order[i],order[j]]=[order[j],order[i]];draw();};
  panel.lastElementChild.onclick=async()=>{try{await api('trait-images.php',{body:{action:'order',order}});toast('Order saved.');await reload();}catch(e){toast(friendly(e));}};
  for(const [key,values] of Object.entries(data.traits??{})) {
    const group=[...root.querySelectorAll('.trait-editor-group')].find(g=>g.dataset.trait===key);if(!group)continue;
    group.querySelectorAll('.trait-image-editor').forEach((row,i)=>{
      const value=values[i],label=document.createElement('label');label.className='field';label.innerHTML=`<span>Choice name</span><input maxlength="190" value="${esc(data.trait_labels?.[key]?.[value]??value)}">`;
      const save=document.createElement('button');save.type='button';save.textContent='Save name';
      const remove=document.createElement('button');remove.type='button';remove.className='outline';remove.textContent='Delete choice';
      const run=async action=>{try{await api('trait-images.php',{body:{action,trait:key,value,label:label.querySelector('input').value}});toast('Saved.');await reload();}catch(e){toast(friendly(e));}};
      save.onclick=()=>run('rename_choice');remove.onclick=()=>run('delete_choice');row.append(label,save,remove);
    });
    const form=document.createElement('form');form.className='trait-add-form';form.innerHTML='<label class="field"><span>New choice</span><input required maxlength="190"></label><button>Add choice</button>';
    form.onsubmit=async event=>{event.preventDefault();try{await api('trait-images.php',{body:{action:'add_choice',trait:key,label:form.querySelector('input').value}});await reload();}catch(e){toast(friendly(e));}};group.append(form);
  }
  // Display the same ordering used by the report wizard.
  const containers=[...root.querySelectorAll('.trait-editor-group'),...root.querySelectorAll('#criteria > details')];
  for(const key of order){const item=containers.find(el=>el.dataset.trait===key||el.dataset.criterion===key);if(item)root.append(item);}
}
