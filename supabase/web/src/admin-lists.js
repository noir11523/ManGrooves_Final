import {residentialAddressFields,formattedAddress,bindBarangayPicker,contactFields,barangayName} from './address-fields.js';
import {api,friendly} from './client.js';
import {esc,field,select,formValues,errorBox,showError,toast,confirm,pager,pill} from './ui.js';
import {listFilters,bindListFilters,listRoute,filterLocalList,matchesSearch} from './list-filters.js';

const roles=[['guardian','Coastal Guardian'],['expert','Expert'],['system_admin','Administrator']];
const metrics=[['verified_reports','Verified reports'],['verified_followups','Verified follow-ups'],['distinct_species','Different species'],['uncorrected_reports','Verified without corrections'],['steward_days','Monitoring days']];
const cell=(label,value)=>`<td data-label="${esc(label)}">${value}</td>`;
const table=(headers,rows)=>`<section class="report-table-card"><div class="table-wrap"><table class="report-table admin-table"><thead><tr>${headers.map(h=>`<th scope="col">${h}</th>`).join('')}</tr></thead><tbody>${rows}</tbody></table></div></section>`;
const active=item=>Number(item.active)!==0;

export function editor(node,title,content,save,{remove}={}) {
  const dialog=node.querySelector('#admin-editor');
  dialog.innerHTML=`<form class="admin-editor-form"><div class="page-head"><h2>${esc(title)}</h2><button type="button" class="outline close-editor" aria-label="Close editor">Close</button></div>${errorBox}${content}<div class="actions">${remove?'<button type="button" class="danger delete-item">Delete species</button>':''}<button type="submit">Save</button><button type="button" class="outline close-editor">Cancel</button></div></form>`;
  dialog.querySelectorAll('.close-editor').forEach(button=>button.onclick=()=>dialog.close());
  let busy=false;
  dialog.oncancel=event=>{if(busy)event.preventDefault();};
  const execute=async action=>{
    if(busy)return;busy=true;dialog.querySelectorAll('button').forEach(button=>button.disabled=true);
    dialog.querySelector('.error').textContent='';
    try{if(await action()!==false)dialog.close();}
    catch(error){showError(dialog.querySelector('.error'),friendly(error));}
    finally{busy=false;dialog.querySelectorAll('button').forEach(button=>button.disabled=false);}
  };
  dialog.showModal();
  dialog.querySelector('form').onsubmit=event=>{
    event.preventDefault();return execute(()=>save(formValues(event.target)));
  };
  if(remove)dialog.querySelector('.delete-item').onclick=()=>execute(remove);
  return dialog;
}
export async function adminList(node,page,query,data,refresh,heading) {
  const users=page==='users',species=page==='species',items=users?data.items:species?data.species:data.badges;
  const name=users?'Users':species?'Species and Sites':'Manage badges';
  const note=users?'Manage community and staff access. Badges record verified milestones; counts show verified and total submitted reports.':species?'Edit species names and identification traits here. To add or pin a location, open Sites.':'Milestones for verified monitoring work.';
  const filters=users?[
    ['role','Role',[['','All roles'],...roles,['applicant','Expert applicants']]],
    ['status','Status',[['','All statuses'],['active','Active'],['inactive','Suspended'],['pending_approval','Awaiting approval'],['rejected','Declined']]],
    ['barangay_id','Barangay',[['','All barangays'],...(data.barangays??[]).map(b=>[b.id,barangayName(b)])]],
    ['badge_tier','Highest badge tier',[['','All badges'],['gold','Gold'],['silver','Silver'],['bronze','Bronze'],['other','Other earned badges'],['none','No badges yet'],['earned','Any earned badge']]]]
    :[['active','Status',[['','All statuses'],['1','Active'],['0','Archived']]]];
  node.innerHTML=`${heading(name,note)}${users?`<p class="user-counts"><span><strong>${data.summary?.active_experts??0}</strong> active experts</span><span><strong>${data.summary?.active_guardians??0}</strong> active coastal guardians</span><span><strong>${data.summary?.pending_experts??0}</strong> awaiting approval</span></p>`:''}${listFilters(query,filters,users?'Name, email, or phone':species?'Local, common, or scientific name':'Badge name or milestone')}<div class="admin-toolbar"><button id="add">${users?'Create staff account':species?'Add species':'Add badge'}</button></div>${table(users?['User','Contact / barangay','Badges','Role and status']:species?['Species','Identification traits','Status','Actions']:['Badge','Rule','Earned','Status','Actions'],items.map(item=>{
    if(users){
      const editable=['active','inactive'].includes(item.status);
      const access=editable?`<form class="user-form admin-access" data-id="${item.id}" aria-label="Access for ${esc(item.full_name)}">${errorBox}${select('role','Role',roles,item.role)}${select('status','Status',[['active','Active'],['inactive','Suspended']],item.status)}<button>Save</button></form>`:`${pill(item.status==='pending_approval'?'Awaiting approval':item.status)}<a class="button outline" href="#expert-applications?uid=${encodeURIComponent(item.application_uid??'')}">View application</a>`;
      return `<tr>${cell('User',`<strong>${esc(item.full_name)}</strong>${item.created_at?`<small>Joined ${esc(String(item.created_at).slice(0,10))}</small>`:''}`)}${cell('Contact / barangay',`${esc(item.email)}<small>${esc(item.phone||'Mobile number not added')}</small><small>${esc(formattedAddress(item))}</small>`)}${cell('Badges',`<div class="earned-badges">${item.badges?.length?item.badges.map(b=>`<span class="badge-name" title="${esc(b.description||'Earned through verified observations')}">${esc(b.name)}</span>`).join(''):'<span class="muted">No badges yet</span>'}</div><small class="badge-report-counts">${item.report_counts?.verified??0} verified · ${item.report_counts?.total??0} total reports</small>`)}${cell('Access',access+(editable&&item.application_uid?`<a class="button outline" href="#expert-applications?uid=${encodeURIComponent(item.application_uid)}">View application</a>`:'')+(item.can_delete?`<div class="actions"><button type="button" class="danger delete-user" data-id="${item.id}" aria-label="Delete ${esc(item.full_name)}">Delete user</button></div>`:''))}</tr>`;
    }
    const title=species?`<strong class="species-local">${esc(item.local_name||item.common_name)}</strong>${item.local_name?`<small>${esc(item.common_name)}</small>`:''}<small><em>${esc(item.scientific_name)}</em></small>`:`<strong>${esc(item.badge_name)}</strong><small>${esc(item.description)}</small>`;
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
    node.querySelectorAll('.delete-user').forEach(button=>button.onclick=async()=>{
      const item=items.find(u=>u.id===Number(button.dataset.id));
      if(!await confirm('Delete user?',`Permanently delete ${item.full_name} (${item.email}) and their sign-in access? Existing reports and review history are kept. This cannot be undone.`))return;
      button.disabled=true;
      try{const result=await api('users.php',{body:{action:'delete',id:item.id,confirm_email:item.email}});toast(result.message);await refresh();}
      catch(error){toast(friendly(error));}finally{button.disabled=false;}
    });
    node.querySelector('#add').onclick=()=>{
      const dialog=editor(node,'Create staff account',`<p class="muted">Create approved staff access. Share the sign-in details securely.</p><div class="row">${field('first_name','First name','','text','required maxlength="80" autocomplete="given-name"')}${field('last_name','Last name','','text','required maxlength="80" autocomplete="family-name"')}${field('email','Email','','email','required maxlength="190" autocomplete="email"')}${contactFields()}${select('role','Role',roles.slice(1),'expert')}${residentialAddressFields(data.barangays??[],{},'staff-barangay')}${field('password','Initial password','','password','required minlength="8" maxlength="25" autocomplete="new-password"')}${field('password_confirmation','Confirm password','','password','required minlength="8" maxlength="25" autocomplete="new-password"')}</div><div id="staff-credential"><label class="field"><span>Work or professional ID photo</span><input type="file" name="id_photo" accept="image/jpeg,image/png,image/webp" required><small>Private · JPG, PNG or WebP up to 5 MB. Verify the credentials before granting access.</small></label></div>`,async values=>{
        const file=dialog.querySelector('[name=id_photo]').files[0];delete values.id_photo;const body=new FormData();body.set('payload',JSON.stringify({...values,action:'create_staff'}));if(values.role==='expert'&&file)body.set('id_photo',file);const result=await api('users.php',{body});toast(result.message);await refresh();
      });
      bindBarangayPicker(dialog,data.barangays??[]);
      dialog.querySelector('button[type=submit]').textContent='Create staff account';
      dialog.querySelector('[name=role]').onchange=event=>{
        const expert=event.target.value==='expert';dialog.querySelector('#staff-credential').hidden=!expert;dialog.querySelector('[name=id_photo]').required=expert;dialog.querySelector('[name=id_photo]').disabled=!expert;
      };
    };
    return;
  }
  const rows=[...node.querySelectorAll('tbody tr')].map(row=>[row,items.find(item=>item.id===Number(row.dataset.id))]);
  const apply=()=>filterLocalList(node,query,rows,(item,q)=>matchesSearch(species?[item.scientific_name,item.common_name,item.local_name]:[item.badge_name,item.description,new Map(metrics).get(item.metric)],q)&&(!q.active||Number(item.active)===Number(q.active)));
  bindListFilters(node,query,apply);apply();
  const edit=item=>editor(node,`${item.id?'Edit':'Add'} ${species?'species':'badge'}`,`<div class="row">${species?['local_name','common_name','scientific_name','family','iucn_code','iucn_label','population_trend','root_type','leaf_shape','bark_texture'].map(k=>field(k,k.startsWith('iucn_')?'IUCN '+k.slice(5):k.startsWith('iucn_')?'IUCN '+k.slice(5):k.replaceAll('_',' ').replace(/^./,c=>c.toUpperCase()),item[k]??'','text',`${['scientific_name','common_name','root_type','leaf_shape','bark_texture'].includes(k)?'required ':''}maxlength="255"`)).join(''):`${field('badge_name','Badge name',item.badge_name??'','text','required maxlength="120"')}${field('description','Description',item.description??'','text','required maxlength="1000"')}${select('metric','Milestone',metrics,item.metric)}${field('target_value','Target',item.target_value??1,'number','required min="1" max="1000000" step="1"')}`}${select('active','Status',[[1,'Active'],[0,'Archived']],item.active??1)}</div>`,async values=>{
    await api(`${page}.php`,{body:{...values,id:item.id,active:Number(values.active)}});toast('Saved.');await refresh();
  },{remove:species&&item.id?async()=>{
    if(!await confirm('Delete species?',`Remove “${item.local_name||item.common_name||item.scientific_name}” from the species list? Existing reports are kept. This cannot be undone here.`))return false;
    const result=await api('species.php',{body:{id:item.id,action:'delete'}});toast(result.message);await refresh();
  }:undefined
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
