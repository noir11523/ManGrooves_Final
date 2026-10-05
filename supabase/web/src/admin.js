import { api, friendly } from './client.js';
import { $, $$, esc, field, select, formValues, errorBox, showError, toast, confirm, pager, asset } from './ui.js';
import {listFilters, bindListFilters, listRoute, filterLocalList, matchesSearch} from './list-filters.js';

function head(title, note = '') { return `<div class="page-head"><div><h1>${esc(title)}</h1><p class="muted">${esc(note)}</p></div><a class="button outline" href="#dashboard">← Dashboard</a></div>`; }
const specials = ['unknown', 'all_of_the_above', 'none_of_the_above'];
const labels = {standard: 'Regular choice', unknown: 'Not Sure', all_of_the_above: 'All of the above', none_of_the_above: 'None of the above'};
export async function checklistPage(node) {
  const {criteria} = await api('checklist.php');
  if (!node.isConnected) return;
  node.innerHTML = `${head('Health checklist', 'Edit questions, photos, and choices. Existing reports keep their original answers.')}<p class="notice">Health uses leaf color, pests, and roots: 6 Healthy · 3–5 Stressed · 0–2 At Risk. All of the above uses the lowest health score. Not Sure is unscored and requires review.</p><div id="criteria"></div>`;
  const root = $('#criteria'); let temporaryId = -1;
  const query = {}, rows = [];
  root.insertAdjacentHTML('beforebegin', listFilters(query, [], 'Checklist name or question'));
  root.insertAdjacentHTML('afterend', '<p class="empty filter-empty" hidden>No checklist questions match.</p>');
  const apply = () => filterLocalList(node, query, rows, (item,q) => matchesSearch([item.name, item.question_text],q));
  bindListFilters(node, query, apply);
  for (const criterion of criteria) {
    const data = structuredClone(criterion), images = new Map(), wrapper = document.createElement('section');
    wrapper.className = 'card'; wrapper.style.marginTop = '20px'; root.append(wrapper);
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
      wrapper.innerHTML = `<form>${errorBox}<div class="row">${field('name', 'Checklist name', data.name, 'text', 'required maxlength="120"')}${field('question_text', 'Question', data.question_text, 'text', 'required maxlength="255"')}</div>
        ${data.guide_image && !data.remove_guide ? `<img class="guide" src="${esc(asset(data.guide_image))}" alt="${esc(data.name)} guide">` : ''}<label class="field"><span>Guide photo</span><input type="file" data-image="guide_image" accept="image/jpeg,image/png,image/webp"><small>${images.has('guide_image') ? esc(images.get('guide_image').name) : 'Up to 5 MB'}</small></label>${data.guide_image ? `<label class="check"><input type="checkbox" name="remove_guide" ${data.remove_guide ? 'checked' : ''}>Remove guide photo</label>` : ''}
        <div class="choice-grid" style="margin-top:18px">${data.options.map(o => {
          const special = specials.includes(o.code ?? o.kind), health = data.score_group === 'health';
          return `<div class="option-editor ${o.delete ? 'removed' : ''}" data-option="${o.id}">${o.delete ? `<p>${esc(o.label)} will be removed.</p><button type="button" class="outline restore">Undo</button>` : `${field('label', 'Choice', o.label, 'text', 'required maxlength="190"')}${special ? `<p><strong>Scoring:</strong> ${(o.code ?? o.kind) === 'unknown' ? 'Not scored · Expert review' : (o.code ?? o.kind) === 'none_of_the_above' ? '0 points' : health ? 'Lowest regular score' : 'Sum of regular choices'}</p>` : field('points', 'Points', o.points, 'number', `required min="${health ? 0 : -2}" max="2" step="1"`)}${o.image_path && !o.remove_image ? `<img class="guide" src="${esc(asset(o.image_path))}" alt="${esc(o.label)}">` : ''}<label class="field"><span>Choice photo</span><input type="file" data-image="option_image_${o.id}" accept="image/jpeg,image/png,image/webp"><small>${images.has(`option_image_${o.id}`) ? esc(images.get(`option_image_${o.id}`).name) : 'Optional'}</small></label>${o.image_path ? `<label class="check"><input type="checkbox" name="remove_image" ${o.remove_image ? 'checked' : ''}>Remove photo</label>` : ''}<button type="button" class="link remove">Remove choice</button>`}</div>`;
        }).join('')}</div>
        <div class="actions">${select('new_kind', 'Add a choice', Object.entries(labels).filter(([key]) => key === 'standard' || ((key !== 'none_of_the_above' || data.selection_mode === 'multiple') && !data.options.some(o => !o.delete && (o.code ?? o.kind) === key))))}<button type="button" class="outline add">Add choice</button></div><button type="submit">Save checklist</button></form>`;
      wrapper.querySelectorAll('[data-image]').forEach(input => input.onchange = () => {
        const file = input.files[0];
        if (!file) { images.delete(input.dataset.image); return; }
        if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) { input.value = ''; toast('Choose an image under 5 MB.'); return; }
        images.set(input.dataset.image, file);
      });
      wrapper.querySelector('.add').onclick = () => {
        read(); if (data.options.filter(o => !o.delete).length >= 30) { toast('Use up to 30 choices.'); return; }
        const kind = wrapper.querySelector('[name=new_kind]').value;
        data.options.push({id: temporaryId--, kind, label: kind === 'standard' ? '' : labels[kind], points: 0, image_path: null}); render();
      };
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
  if (page === 'users') {
    node.innerHTML = `${head('Users', 'Manage access for guardians, experts, and administrators.')}<div class="list">${data.items.map(u => `<form class="card user-form" data-id="${u.id}">${errorBox}<h2>${esc(u.full_name)}</h2><p>${esc(u.email)}</p><div class="row">${select('role', 'Role', [['guardian', 'Coastal Guardian'], ['expert', 'System Expert'], ['system_admin', 'System Administrator']], u.role)}${select('status', 'Account status', [['active', 'Active'], ['inactive', 'Inactive']], u.status)}</div><button type="submit">Save access</button></form>`).join('')}</div>${pager(data, 'users')}`;
    const roleOptions = [['','All roles'],['guardian','Coastal Guardians'],['expert','Experts'],['system_admin','Administrators']];
    const statusOptions = [['','All statuses'],['active','Active'],['inactive','Inactive'],['pending_approval','Awaiting expert approval'],['rejected','Expert application declined']];
    node.querySelector('.list').insertAdjacentHTML('beforebegin', listFilters(query, [['role','Role',roleOptions],['status','Account status',statusOptions]], 'Name, email, or barangay'));
    node.querySelector('.pagination')?.remove();
    node.insertAdjacentHTML('beforeend', `${!data.items.length ? '<p class="empty">No users match. Try another search or clear the filters.</p>' : ''}${pager(data,'users',query)}`);
    bindListFilters(node, query, q => listRoute('users',q), data.total);
    // Applications must be reviewed in their existing approval workflow.
    for (const u of data.items.filter(u => !['active','inactive'].includes(u.status))) {
      const form = node.querySelector(`.user-form[data-id="${u.id}"]`);
      form.querySelector('.row').remove(); form.querySelector('button').remove();
      form.insertAdjacentHTML('beforeend', `<p class="notice">${u.status === 'pending_approval' ? 'Awaiting expert approval' : 'Expert application declined'}</p><a class="button outline" href="#expert-applications">View expert applications</a>`);
    }
    $$('.user-form').forEach(form => form.onsubmit = async event => {
      event.preventDefault(); const button = event.submitter;
      if (!(await confirm('Update account access?', 'This changes the selected user’s permissions and ends their current sessions.'))) return;
      button.disabled = true;
      try { await api('users.php', {body: {...formValues(form), id: Number(form.dataset.id)}}); toast('Access updated.'); await adminPage(node,page,query); }
      catch (error) { showError(form.querySelector('.error'), friendly(error)); } finally { button.disabled = false; }
    }); return;
  }
  const species = page === 'species', items = species ? data.species : data.badges;
  node.innerHTML = `${head(species ? 'Species catalog' : 'Badge settings', species ? 'Reference traits help suggest a species. Experts confirm uncertain matches.' : 'Set milestones for verified monitoring work.')}<button id="add" class="outline">Add ${species ? 'species' : 'badge'}</button><div id="editor" style="margin-top:20px"></div><div class="list" style="margin-top:20px">${items.map(item => `<button class="report-row edit-item" data-id="${item.id}"><strong>${esc(species ? item.scientific_name : item.badge_name)}</strong><small>${item.active ? 'Active' : 'Archived'}</small></button>`).join('')}</div>`;
  node.querySelector('#add').insertAdjacentHTML('beforebegin', listFilters(query, [['active','Status',[['','All statuses'],['1','Active'],['0','Archived']]]], species ? 'Scientific, common, or local name' : 'Badge name or description'));
  node.insertAdjacentHTML('beforeend', '<p class="empty filter-empty" hidden>No items match. Try another search or clear the filters.</p>');
  const rows = [...node.querySelectorAll('.edit-item')].map(element => [element,items.find(item=>item.id===Number(element.dataset.id))]);
  const apply = () => filterLocalList(node,query,rows,(item,q)=>matchesSearch(species?[item.scientific_name,item.common_name,item.local_name]:[item.badge_name,item.description],q) && (!q.active || Number(item.active)===Number(q.active)));
  bindListFilters(node,query,apply); apply();
  const edit = item => {
    $('#editor').innerHTML = `<form class="card" id="catalog-editor">${errorBox}<h2>${item.id ? 'Edit' : 'Add'} ${species ? 'species' : 'badge'}</h2><div class="row">${species ? ['scientific_name', 'common_name', 'local_name', 'family', 'iucn_code', 'iucn_label', 'population_trend', 'root_type', 'leaf_shape', 'bark_texture'].map(k => field(k, k.replaceAll('_', ' ').replace(/^./, c => c.toUpperCase()), item[k] ?? '', 'text', ['scientific_name', 'common_name', 'root_type', 'leaf_shape', 'bark_texture'].includes(k) ? 'required maxlength="255"' : 'maxlength="255"')).join('')
      : `${field('badge_name', 'Badge name', item.badge_name ?? '', 'text', 'required maxlength="120"')}${field('description', 'Description', item.description ?? '', 'text', 'required maxlength="255"')}${select('metric', 'Milestone', [['verified_reports', 'Verified reports'], ['verified_followups', 'Verified follow-ups'], ['distinct_species', 'Different species'], ['uncorrected_reports', 'Reports verified without corrections'], ['steward_days', 'Days since first verified report']], item.metric)}${field('target_value', 'Target', item.target_value ?? 1, 'number', 'required min="1" step="1"')}`}${select('active', 'Status', [[1, 'Active'], [0, 'Archived']], item.active ?? 1)}</div><div class="actions"><button type="submit">Save</button><button type="button" id="cancel-editor" class="outline">Cancel</button></div></form>`;
    $('#cancel-editor').onclick = () => $('#editor').innerHTML = '';
    $('#catalog-editor').onsubmit = async event => {
      event.preventDefault(); const button = event.submitter; button.disabled = true;
      try { const values = formValues(event.target); await api(`${page}.php`, {body: {...values, id: item.id, active: Number(values.active)}}); toast('Saved.'); await adminPage(node, page, query); }
      catch (e) { showError(event.target.querySelector('.error'), friendly(e)); } finally { button.disabled = false; }
    };
    $('#editor').scrollIntoView({behavior: 'smooth', block: 'start'});
  };
  $('#add').onclick = () => edit({});
  $$('.edit-item').forEach(button => button.onclick = () => edit(items.find(item => item.id === Number(button.dataset.id))));
}
