import L from 'leaflet';
import { api, friendly } from './client.js';
import { $, $$, esc, pill, field, select, formValues, errorBox, showError, toast, confirm, map, asset } from './ui.js';

export const reportDraft = {
  dirty: false, fields: {}, observations: {}, photo: null, step: 0, preview: null,
  reset() { this.dirty = false; this.fields = {}; this.observations = {}; this.photo = null; this.step = 0; this.preview = null; }
};
export async function reportWizard(node, query) {
  const data = await api('report-form.php');
  if (!node.isConnected) return () => {};
  const draft = reportDraft;
  if (!draft.dirty) {
    draft.reset(); draft.fields = {cluster_id: query.cluster ?? '', parent_report_id: query.parent ?? '', sitio_name: '', observed_alive_count: '', guardian_remarks: '', root_type: '', leaf_shape: '', bark_texture: '', location_source: ''};
    for (const c of data.criteria) draft.observations[c.code] = [];
  }
  let canvas, marker, accuracyCircle, watcher = null, watchTimer = null, photoUrl = null, stopped = false;
  const stopGps = () => {
    if (watcher !== null) navigator.geolocation.clearWatch(watcher);
    watcher = null; clearTimeout(watchTimer); watchTimer = null;
  };
  const dispose = () => { stopped = true; stopGps(); canvas?.remove(); canvas = null; if (photoUrl) URL.revokeObjectURL(photoUrl); };
  const changed = () => { draft.dirty = true; draft.preview = null; };
  const save = form => {
    if (!form) return;
    const values = formValues(form);
    for (const [key, value] of Object.entries(values)) if (key !== 'photo' && !key.startsWith('obs_') && key !== 'followup') draft.fields[key] = value;
  };
  async function render() {
    stopGps(); canvas?.remove(); canvas = null; marker = null; accuracyCircle = null;
    if (stopped || !node.isConnected) return;
    node.innerHTML = `<div class="page-head"><div><p class="eyebrow">Field observation</p><h1>Submit a report</h1></div><a class="button outline" href="#reports">Close</a></div><div class="steps">${['Details', 'Location', 'Checklist', 'Review'].map((label, i) => `<span class="${draft.step === i ? 'active' : ''}">${i + 1}. ${label}</span>`).join('')}</div><section class="card"><form id="report-form">${errorBox}<div id="step-body"></div><div class="actions"><button type="button" id="previous" class="outline">${draft.step ? '← Back' : 'Cancel'}</button><button id="next" type="submit">${draft.step === 3 ? 'Submit report' : 'Continue →'}</button></div></form></section>`;
    $('#previous').onclick = () => { save($('#report-form')); if (draft.step) { draft.step--; render().catch(e => toast(friendly(e))); } else location.hash = 'reports'; };
    if (draft.step === 0) await details();
    if (draft.step === 1) locationStep();
    if (draft.step === 2) checklist();
    if (draft.step === 3) summary();
    const form = $('#report-form');
    form.addEventListener('change', changed);
    form.addEventListener('input', changed);
    form.onsubmit = async event => {
      event.preventDefault(); const button = $('#next'); if (button.disabled) return;
      const error = form.querySelector('.error'); error.textContent = ''; save(form);
      button.disabled = true;
      try {
        if (draft.step === 0 && !draft.photo) throw new Error('Add a photo from this visit.');
        if (draft.step === 0 && $('#followup').checked && !draft.fields.parent_report_id) throw new Error('Choose the previous report for this follow-up.');
        if (draft.step === 1 && !['gps', 'manual'].includes(draft.fields.location_source)) throw new Error('Use GPS or tap the map to place your pin.');
        if (draft.step === 2) {
          for (const c of data.criteria) {
            if (c.selection_mode === 'single' && draft.observations[c.code]?.length !== 1) throw new Error(`Choose an answer for ${c.name}.`);
          }
          draft.preview = await api('report-preview.php', {body: {...draft.fields, observations: draft.observations,
            checklist_versions: Object.fromEntries(data.criteria.map(c => [c.id, c.version]))}});
        }
        if (draft.step < 3) { draft.step++; await render(); return; }
        if (!(await confirm('Submit this report?', 'Check your summary first. This sends your photo, location, and answers.'))) return;
        const body = new FormData();
        body.set('payload', JSON.stringify({...draft.fields, observations: draft.observations, checklist_versions: draft.preview?.checklist_versions, field_confirmation: '1'}));
        body.set('photo', draft.photo);
        const result = await api('submit-report.php', {body});
        draft.reset(); toast(result.message); location.hash = `report/${result.report.report_id ?? result.report.id}`;
      } catch (e) { if (node.isConnected) showError(error, friendly(e)); }
      finally { button.disabled = false; }
    };
  }
  async function details() {
    $('#step-body').innerHTML = `<h2>What did you observe?</h2><label class="field"><span>Field photo</span><input type="file" name="photo" accept="image/jpeg,image/png,image/webp" capture="environment" ${draft.photo ? '' : 'required'}><small>JPG, PNG, or WebP · Up to 5 MB</small></label><img id="photo-preview" class="preview-photo" alt="Your selected photo" ${draft.photo ? '' : 'hidden'}>
      <div class="row">${select('cluster_id', 'Site', [['', 'New observation site'], ...data.clusters.map(c => [c.id, c.name])], draft.fields.cluster_id)}${field('sitio_name', 'Location name', draft.fields.sitio_name, 'text', 'required maxlength="120" placeholder="Sitio or nearby landmark"')}</div>
      <label class="check"><input type="checkbox" id="followup" name="followup" ${draft.fields.parent_report_id ? 'checked' : ''}><span>This is a follow-up visit</span></label><div id="followup-options" ${draft.fields.parent_report_id ? '' : 'hidden'}></div>
      <div class="row" style="margin-top:20px">${field('observed_alive_count', 'Living mangroves counted', draft.fields.observed_alive_count, 'number', 'required min="0" max="1000000" step="1"')}${select('root_type', 'Root type', [['', 'Choose root type'], ...data.traits.root_type.map(v => [v, v])], draft.fields.root_type, 'required')}${select('leaf_shape', 'Leaf shape', [['', 'Choose leaf shape'], ...data.traits.leaf_shape.map(v => [v, v])], draft.fields.leaf_shape, 'required')}${select('bark_texture', 'Bark texture', [['', 'Choose bark texture'], ...data.traits.bark_texture.map(v => [v, v])], draft.fields.bark_texture, 'required')}</div>
      <label class="field"><span>Notes (optional)</span><textarea name="guardian_remarks" maxlength="5000">${esc(draft.fields.guardian_remarks)}</textarea></label>`;
    const showPhoto = () => {
      if (photoUrl) URL.revokeObjectURL(photoUrl);
      if (draft.photo) { photoUrl = URL.createObjectURL(draft.photo); $('#photo-preview').src = photoUrl; $('#photo-preview').hidden = false; }
    }; showPhoto();
    $('[name=photo]').onchange = event => {
      const photo = event.target.files[0]; if (!photo) return;
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(photo.type) || photo.size > 5 * 1024 * 1024) { event.target.value = ''; toast('Choose a JPG, PNG, or WebP photo under 5 MB.'); return; }
      draft.photo = photo; changed(); showPhoto();
    };
    let generation = 0;
    const followups = async () => {
      const current = ++generation, target = $('#followup-options');
      const enabled = $('#followup').checked, cluster = $('[name=cluster_id]').value;
      target.hidden = !enabled;
      if (!enabled) { target.innerHTML = ''; draft.fields.parent_report_id = ''; return; }
      if (!cluster) { target.innerHTML = '<p class="notice">Choose an existing site above.</p>'; return; }
      target.innerHTML = '<p class="muted">Loading your previous visits…</p>';
      const {reports} = await api('previous-reports.php', {query: {cluster_id: cluster}});
      if (current !== generation || !target.isConnected) return;
      target.innerHTML = select('parent_report_id', 'Previous visit', [['', 'Choose your previous report'], ...reports.map(r => [r.id, `${r.report_code} · ${r.health}`])], draft.fields.parent_report_id, 'required');
      if (!reports.length) target.insertAdjacentHTML('beforeend', '<p class="muted">No visits are available for a follow-up at this site.</p>');
    };
    $('#followup').onchange = () => followups().catch(e => toast(friendly(e)));
    $('[name=cluster_id]').onchange = () => { draft.fields.parent_report_id = ''; followups().catch(e => toast(friendly(e))); };
    if (draft.fields.parent_report_id) await followups();
  }
  function locationStep() {
    $('#step-body').innerHTML = `<h2>Where is the mangrove?</h2><p>Use your location or tap the map to place a pin.</p><div class="actions"><button type="button" id="gps">Use my location</button><button type="button" class="outline" id="manual">Place a pin</button><button type="button" class="outline" id="stop-gps" hidden>Stop GPS</button></div><p id="location-status" class="muted" role="status">${draft.fields.location_source ? 'Your selected pin is saved.' : 'Place your pin at the observation spot.'}</p><div id="location-map" class="map large"></div><div class="row">${field('latitude', 'Latitude', draft.fields.latitude ?? '', 'number', 'required min="-90" max="90" step="any" readonly')}${field('longitude', 'Longitude', draft.fields.longitude ?? '', 'number', 'required min="-180" max="180" step="any" readonly')}</div><details><summary>Location help</summary><p class="muted">The circle shows GPS accuracy. If it is wider than 100 metres, use it as a guide and tap your actual spot. Allow location access in your browser settings.</p></details>`;
    canvas = map($('#location-map'), [], {onClick: event => { stopGps(); choose(event.latlng.lat, event.latlng.lng, 'manual', null); $('#location-status').textContent = 'Pin placed. Check the spot before continuing.'; }});
    const b = data.location.barangay;
    if (b) canvas.setView([b.center_lat, b.center_lng], 15);
    const cluster = data.clusters.find(c => String(c.id) === String(draft.fields.cluster_id));
    if (cluster) { L.circle([cluster.center_lat, cluster.center_lng], {radius: cluster.radius_meters, color: '#5e8751', fillOpacity: .08}).addTo(canvas); canvas.setView([cluster.center_lat, cluster.center_lng], 18); }
    function choose(lat, lng, source, accuracy) {
      if (!marker) marker = L.marker([lat, lng], {icon: L.divIcon({html: '<span style="display:block;background:#245b2b;border:3px solid white;border-radius:50%;width:22px;height:22px;box-shadow:0 1px 5px #0008"></span>', className: '', iconSize: [22, 22], iconAnchor: [11, 11]})}).addTo(canvas);
      else marker.setLatLng([lat, lng]);
      draft.fields = {...draft.fields, latitude: lat, longitude: lng, location_source: source, location_accuracy: accuracy ?? ''};
      $('[name=latitude]').value = Number(lat).toFixed(7); $('[name=longitude]').value = Number(lng).toFixed(7); changed();
    }
    if (draft.fields.location_source) { choose(Number(draft.fields.latitude), Number(draft.fields.longitude), draft.fields.location_source, draft.fields.location_accuracy); canvas.setView([draft.fields.latitude, draft.fields.longitude], 18); }
    const start = () => {
      if (!navigator.geolocation) { toast('GPS is unavailable. Tap the map to place your pin.'); return; }
      stopGps(); $('#location-status').textContent = 'Finding your location…'; $('#stop-gps').hidden = false;
      watcher = navigator.geolocation.watchPosition(position => {
        if (stopped || draft.step !== 1 || !canvas) return;
        const {latitude, longitude, accuracy} = position.coords;
        if (!Number.isFinite(accuracy) || accuracy < 0) return;
        if (!accuracyCircle) accuracyCircle = L.circle([latitude, longitude], {radius: accuracy, color: '#5180bb', fillOpacity: .12}).addTo(canvas);
        else accuracyCircle.setLatLng([latitude, longitude]).setRadius(accuracy);
        canvas.fitBounds(accuracyCircle.getBounds(), {maxZoom: 18});
        if (accuracy <= 100) { choose(latitude, longitude, 'gps', accuracy); $('#location-status').textContent = `Pin found · About ${Math.round(accuracy)} m accuracy.`; }
        else $('#location-status').textContent = `Approximate area · About ${Math.round(accuracy)} m. Wait or tap your actual spot.`;
      }, () => { stopGps(); $('#location-status').textContent = 'GPS is unavailable. Tap your spot on the map.'; }, {enableHighAccuracy: true, maximumAge: 0, timeout: 20000});
      watchTimer = setTimeout(() => { stopGps(); if ($('#stop-gps')) $('#stop-gps').hidden = true; }, 60000);
    };
    $('#gps').onclick = start;
    $('#stop-gps').onclick = () => { stopGps(); $('#stop-gps').hidden = true; $('#location-status').textContent = 'GPS stopped. Your selected pin is kept.'; };
    $('#manual').onclick = () => { stopGps(); $('#stop-gps').hidden = true; $('#location-status').textContent = 'Tap the observation spot on the map.'; };
    navigator.permissions?.query({name: 'geolocation'}).then(permission => { if (permission.state === 'granted' && !draft.fields.location_source && draft.step === 1 && !stopped) start(); }).catch(() => {});
  }
  function checklist() {
    $('#step-body').innerHTML = `<h2>What can you see?</h2><p>Leaf color, pests, and roots determine the health score. Choose Not Sure when you cannot tell.</p>${data.criteria.map(c => `<fieldset class="choice-group"><legend>${esc(c.name)} <small>${c.score_group === 'health' ? 'Health score' : 'Context'}</small></legend><p>${esc(c.question_text)}</p>${c.guide_image ? `<img class="guide" src="${esc(asset(c.guide_image))}" alt="${esc(c.name)} guide">` : ''}<div class="choice-grid">${c.options.map(o => `<label class="choice"><input type="${c.selection_mode === 'multiple' ? 'checkbox' : 'radio'}" name="obs_${esc(c.code)}" value="${o.id}" data-code="${esc(o.code)}" ${draft.observations[c.code]?.includes(o.id) ? 'checked' : ''}>${o.image_path ? `<img src="${esc(asset(o.image_path))}" alt="">` : ''}<span>${esc(o.label)}</span></label>`).join('')}</div></fieldset>`).join('')}`;
    for (const c of data.criteria) {
      const inputs = $$(`[name=obs_${c.code}]`);
      inputs.forEach(input => input.onchange = () => {
        const special = ['unknown', 'all_of_the_above', 'none_of_the_above'];
        if (input.checked && c.selection_mode === 'multiple') inputs.filter(i => i !== input && (special.includes(input.dataset.code) || special.includes(i.dataset.code))).forEach(i => i.checked = false);
        draft.observations[c.code] = inputs.filter(i => i.checked).map(i => Number(i.value)); changed();
      });
    }
  }
  function summary() {
    const c = draft.preview?.classification, species = draft.preview?.species?.best;
    $('#step-body').innerHTML = `<h2>Review your report</h2><p>Check everything below. You can still make changes.</p><section class="summary-card"><h3>Details <button type="button" class="link edit" data-step="0">Edit</button></h3>${draft.photo ? '<img id="summary-photo" class="inline-photo" alt="Your field photo">' : ''}<dl class="summary"><dt>Location name</dt><dd>${esc(draft.fields.sitio_name)}</dd><dt>Living mangroves</dt><dd>${esc(draft.fields.observed_alive_count)}</dd><dt>Suggested species</dt><dd>${esc(species?.scientific_name ?? 'Needs identification')}</dd><dt>Notes</dt><dd>${esc(draft.fields.guardian_remarks || 'None')}</dd>${draft.fields.parent_report_id ? `<dt>Follow-up</dt><dd>Report #${esc(draft.fields.parent_report_id)}</dd>` : ''}</dl></section><section class="summary-card"><h3>Location <button type="button" class="link edit" data-step="1">Edit</button></h3><p>${esc(draft.fields.latitude)}, ${esc(draft.fields.longitude)} · ${draft.fields.location_source === 'gps' ? `GPS (about ${Math.round(Number(draft.fields.location_accuracy))} m)` : 'Manual pin'}</p></section><section class="summary-card"><h3>Checklist <button type="button" class="link edit" data-step="2">Edit</button></h3>${pill(c?.status ?? 'Unknown')}<p>${c?.health_score == null ? 'An expert will review the uncertain answers.' : `${c.health_score} / 6 health points. ${c.status === 'Healthy' ? 'This report will be verified automatically.' : 'An expert will review this report.'}`}</p>${data.criteria.map(criterion => `<p><strong>${esc(criterion.name)}:</strong> ${criterion.options.filter(o => draft.observations[criterion.code]?.includes(o.id)).map(o => esc(o.label)).join(', ') || 'None selected'}</p>`).join('')}</section><label class="check"><input type="checkbox" id="field-confirm" required><span>This photo, location, and checklist describe my field visit.</span></label>`;
    if (draft.photo) { if (photoUrl) URL.revokeObjectURL(photoUrl); photoUrl = URL.createObjectURL(draft.photo); $('#summary-photo').src = photoUrl; }
    $$('.edit').forEach(button => button.onclick = () => { draft.step = Number(button.dataset.step); render().catch(e => toast(friendly(e))); });
    // The confirmation checkbox does not invalidate an already checked preview.
    $('#field-confirm').addEventListener('change', event => event.stopPropagation());
    $('#field-confirm').addEventListener('input', event => event.stopPropagation());
  }
  await render();
  return dispose;
}
