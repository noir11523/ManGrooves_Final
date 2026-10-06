import {api,friendly} from './client.js';
import {esc,field,select,formValues,errorBox,showError,toast,confirm,pager,pill} from './ui.js';
import {listFilters,bindListFilters,listRoute,filterLocalList,matchesSearch} from './list-filters.js';

const roles=[['guardian','Coastal Guardian'],['expert','Expert'],['system_admin','Administrator']];
const metrics=[['verified_reports','Verified reports'],['verified_followups','Verified follow-ups'],['distinct_species','Different species'],['uncorrected_reports','Verified without corrections'],['steward_days','Monitoring days']];
const cell=(label,value)=>`<td data-label="${esc(label)}">${value}</td>`;
const table=(headers,rows)=>`<section class="report-table-card"><div class="table-wrap"><table class="report-table admin-table"><thead><tr>${headers.map(h=>`<th scope="col">${h}</th>`).join('')}</tr></thead><tbody>${rows}</tbody></table></div></section>`;
const active=item=>Number(item.active)!==0;

function editor(node,title,content,save) {
  const dialog=node.querySelector('#admin-editor');
  dialog.innerHTML=`<form class="admin-editor-form"><div class="page-head"><h2>${esc(title)}</h2><button type="button" class="outline close-editor" aria-label="Close editor">Close</button></div>${errorBox}${content}<div class="actions"><button type="submit">Save</button><button type="button" class="outline close-editor">Cancel</button></div></form>`;
  dialog.querySelectorAll('.close-editor').forEach(button=>button.onclick=()=>dialog.close());
  dialog.showModal();
  dialog.querySelector('form').onsubmit=async event=>{
    event.preventDefault();const button=event.submitter;if(button.disabled)return;button.disabled=true;
    try{await save(formValues(event.target));dialog.close();}
    catch(error){showError(dialog.querySelector('.error'),friendly(error));}
    finally{button.disabled=false;}
  };
  return dialog;
}
export async function adminList(node,page,query,data,refresh,heading) {
  const users=page==='users',species=page==='species',items=users?data.items:species?data.species:data.badges;
  const name=users?'Users':species?'Species':'Manage badges';
  const note=users?'Manage community and staff access.':species?'Reference species and identification traits.':'Milestones for verified monitoring work.';
  const filters=users?[
    ['role','Role',[['','All roles'],...roles]],
    ['status','Status',[['','All statuses'],['active','Active'],['inactive','Inactive'],['pending_approval','Awaiting approval'],['rejected','Declined']]],
    ['barangay_id','Barangay',[['','All barangays'],...(data.barangays??[]).map(b=>[b.id,b.name])]]]
    :[['active','Status',[['','All statuses'],['1','Active'],['0','Archived']]]];
  node.innerHTML=`${heading(name,note)}${listFilters(query,filters,users?'Name, email, or phone':species?'Scientific, common, or local name':'Badge name or milestone')}<div class="admin-toolbar"><button id="add">${users?'Create staff account':species?'Add species':'Add badge'}</button></div>${table(users?['User','Contact / barangay','Role and status']:species?['Species','Identification traits','Status','Actions']:['Badge','Rule','Earned','Status','Actions'],items.map(item=>{
    if(users){
      const editable=['active','inactive'].includes(item.status);
      const access=editable?`<form class="user-form admin-access" data-id="${item.id}" aria-label="Access for ${esc(item.full_name)}">${errorBox}${select('role','Role',roles,item.role)}${select('status','Status',[['active','Active'],['inactive','Inactive']],item.status)}<button>Save</button></form>`:`${pill(item.status==='pending_approval'?'Awaiting approval':item.status)}<a class="button outline" href="#expert-applications">View application</a>`;
      return `<tr>${cell('User',`<strong>${esc(item.full_name)}</strong>${item.created_at?`<small>Joined ${esc(String(item.created_at).slice(0,10))}</small>`:''}`)}${cell('Contact',`${esc(item.email)}<small>${esc(item.phone||'No phone')} · ${esc(item.barangay_name||'No barangay')}</small>`)}${cell('Access',access)}</tr>`;
    }
    const title=species?`<strong>${esc(item.common_name)}</strong><small><em>${esc(item.scientific_name)}</em></small><small>${esc(item.local_name||'')}</small>`:`<strong>${esc(item.badge_name)}</strong><small>${esc(item.description)}</small>`;
    const info=species?`<small><b>Roots:</b> ${esc(item.root_type)}</small><small><b>Leaves:</b> ${esc(item.leaf_shape)}</small><small><b>Bark:</b> ${esc(item.bark_texture)}</small>`:`${esc(new Map(metrics).get(item.metric)||item.metric)} ≥ ${esc(item.target_value)}`;
    return `<tr data-id="${item.id}">${cell(species?'Species':'Badge',title)}${cell(species?'Traits':'Rule',info)}${species?'':cell('Earned',esc(item.earned_count??0))}${cell('Status',pill(active(item)?'Active':'Archived'))}${cell('Actions',`<div class="admin-row-actions"><button type="button" class="outline edit-item" data-id="${item.id}" aria-label="Edit ${esc(species?item.common_name:item.badge_name)}">Edit</button><button type="button" class="outline archive-item" data-id="${item.id}">${active(item)?'Archive':'Restore'}</button></div>`)}</tr>`;
  }).join(''))}<p class="empty filter-empty" hidden>No ${users?'users':species?'species':'badges'} match. Try another search or reset the filters.</p>${users?pager(data,'users',query):''}<dialog id="admin-editor" class="admin-editor" aria-label="Edit ${name.toLowerCase()}"></dialog>`;
  node.querySelector('.list-filters button[type=submit]').textContent='Filter';
  node.querySelector('.clear-filters').textContent='Reset';
  if(users){
    bindListFilters(node,query,q=>listRoute('users',q),data.total);
    node.querySelector('.filter-empty').hidden=items.length>0;
    node.querySelectorAll('.user-form').forEach(form=>form.onsubmit=async event=>{
      event.preventDefault();const button=event.submitter;
      if(!await confirm('Update account access?','This updates permissions and ends their current sessions.'))return;
      button.disabled=true;
      try{await api('users.php',{body:{...formValues(form),id:Number(form.dataset.id)}});toast('Access updated.');await refresh();}
      catch(error){showError(form.querySelector('.error'),friendly(error));}finally{button.disabled=false;}
    });
    node.querySelector('#add').onclick=()=>{
      const dialog=editor(node,'Create staff account',`<p class="muted">Create approved staff access. Share the sign-in details securely.</p><div class="row">${field('first_name','First name','','text','required maxlength="80" autocomplete="given-name"')}${field('last_name','Last name','','text','required maxlength="80" autocomplete="family-name"')}${field('email','Email','','email','required maxlength="190" autocomplete="email"')}${field('phone','Phone (optional)','','tel','maxlength="30"')}${select('role','Role',roles.slice(1),'expert')}${select('barangay_id','Barangay',[['','Choose barangay'],...(data.barangays??[]).map(b=>[b.id,b.name])],'','required')}${field('password','Initial password','','password','required minlength="8" maxlength="25" autocomplete="new-password"')}${field('password_confirmation','Confirm password','','password','required minlength="8" maxlength="25" autocomplete="new-password"')}</div><div id="staff-credential">${field('expert_id_code','Expert credential ID','','text','required maxlength="80"')}<small>Confirm this credential before granting expert access.</small></div>`,async values=>{
        const result=await api('users.php',{body:{...values,action:'create_staff'}});toast(result.message);await refresh();
      });
      dialog.querySelector('button[type=submit]').textContent='Create staff account';
      dialog.querySelector('[name=role]').onchange=event=>{
        const expert=event.target.value==='expert';dialog.querySelector('#staff-credential').hidden=!expert;dialog.querySelector('[name=expert_id_code]').required=expert;
      };
    };
    return;
  }
  const rows=[...node.querySelectorAll('tbody tr')].map(row=>[row,items.find(item=>item.id===Number(row.dataset.id))]);
  const apply=()=>filterLocalList(node,query,rows,(item,q)=>matchesSearch(species?[item.scientific_name,item.common_name,item.local_name]:[item.badge_name,item.description,new Map(metrics).get(item.metric)],q)&&(!q.active||Number(item.active)===Number(q.active)));
  bindListFilters(node,query,apply);apply();
  const edit=item=>editor(node,`${item.id?'Edit':'Add'} ${species?'species':'badge'}`,`<div class="row">${species?['scientific_name','common_name','local_name','family','iucn_code','iucn_label','population_trend','root_type','leaf_shape','bark_texture'].map(k=>field(k,k.replaceAll('_',' ').replace(/^./,c=>c.toUpperCase()),item[k]??'','text',`${['scientific_name','common_name','root_type','leaf_shape','bark_texture'].includes(k)?'required ':''}maxlength="255"`)).join(''):`${field('badge_name','Badge name',item.badge_name??'','text','required maxlength="120"')}${field('description','Description',item.description??'','text','required maxlength="1000"')}${select('metric','Milestone',metrics,item.metric)}${field('target_value','Target',item.target_value??1,'number','required min="1" max="1000000" step="1"')}`}${select('active','Status',[[1,'Active'],[0,'Archived']],item.active??1)}</div>`,async values=>{
    await api(`${page}.php`,{body:{...values,id:item.id,active:Number(values.active)}});toast('Saved.');await refresh();
  });
  node.querySelector('#add').onclick=()=>edit({});
  node.querySelectorAll('.edit-item').forEach(button=>button.onclick=()=>edit(items.find(item=>item.id===Number(button.dataset.id))));
  node.querySelectorAll('.archive-item').forEach(button=>button.onclick=async()=>{
    const item=items.find(item=>item.id===Number(button.dataset.id)),isActive=active(item);
    if(!await confirm(`${isActive?'Archive':'Restore'} ${species?'species':'badge'}?`,isActive?'Existing reports and earned certificates are kept.':'This becomes available again.'))return;
    button.disabled=true;
    try{await api(`${page}.php`,{body:{...item,active:isActive?0:1}});await refresh();}catch(error){toast(friendly(error));}finally{button.disabled=false;}
  });
}
