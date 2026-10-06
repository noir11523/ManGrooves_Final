import L from 'leaflet';
import { api, apiUrl, friendly } from './client.js';
import {ReportDraftStore} from './report-draft.js';
import locationTools from '../../../public/assets/js/live-location.js';
import { $, $$, esc, pill, field, select, formValues, errorBox, showError, toast, confirm, map, asset } from './ui.js';

export const reportDraft = {
  dirty: false, fields: {}, observations: {}, photo: null, step: 0, preview: null, followup: false,
  flush: async () => {},
  reset() { this.dirty = false; this.fields = {}; this.observations = {}; this.photo = null; this.step = 0; this.preview = null; this.followup = false; this.checklistVersions = null; }
};
export async function reportWizard(node, query, user = null) {
  const data = await api('report-form.php');
  if (!node.isConnected) return () => {};
  const draft = reportDraft;
  const scope = user?.uid ?? user?.id;
  const storage = new ReportDraftStore(scope == null ? null : `${apiUrl('report-form.php')}:${scope}`);
  let draftMessage = '', saveWarning = '';
  if (scope != null || !draft.dirty || draft.owner !== scope) {
    draft.reset(); draft.fields = {cluster_id: query.cluster ?? '', parent_report_id: query.parent ?? '', sitio_name: '', observed_alive_count: '', guardian_remarks: '', root_type: '', leaf_shape: '', bark_texture: '', location_source: ''};
    for (const c of data.criteria) draft.observations[c.code] = [];
    draft.followup = Boolean(query.parent);
    try {
      const saved = await storage.load();
      if (saved) {
        Object.assign(draft, {fields: saved.fields, observations: saved.observations, photo: saved.photo,
          step: Math.max(0, Math.min(3, Number(saved.step) || 0)), followup: Boolean(saved.followup), dirty: true});
        const changedChecklist = data.criteria.some(c => saved.checklistVersions?.[c.id] !== c.version);
        for (const c of data.criteria) draft.observations[c.code] = (saved.observations[c.code] ?? []).filter(id => c.options.some(o => o.id === id));
        if (changedChecklist && draft.step > 1) { draft.step = 2; draftMessage = 'Draft restored. The checklist changed; check your answers again.'; }
        if (saved.missingPhoto) { draft.step = 0; draftMessage = 'Your details are restored. Please choose your field photo again.'; }
      }
    } catch { saveWarning = 'Could not restore your progress. Check device storage.'; }
  }
  draft.owner = scope;
  draft.checklistVersions = Object.fromEntries(data.criteria.map(c => [c.id, c.version]));
  let searchTimer, searchGeneration=0, locationGeneration=0;
  let canvas, marker, accuracyCircle, tracker = null, photoUrl = null, stopped = false, saving = 0;
  const stopGps = () => {
    locationGeneration++;
    tracker?.stop(); tracker = null;
    const button = node.querySelector('#gps');
    if (button) { button.disabled = false; button.removeAttribute('aria-busy'); button.textContent = 'Use my location'; }
  };
  const status = () => {
    const element = node.querySelector('#draft-notice');
    if (element) { element.textContent = saveWarning || draftMessage; element.hidden = !element.textContent; }
  };
  const persist = async () => {
    if (!draft.dirty) return;
    const revision = ++saving;
    try { await storage.save(draft); if (revision !== saving) return; saveWarning = ''; }
    catch { if (revision !== saving) return; saveWarning = 'Could not save your progress. Keep this page open and check device storage.'; }
    status();
  };
  const changed = () => { draftMessage = ''; save(node.querySelector('#report-form')); draft.dirty = true; draft.preview = null; void persist(); };
  const save = form => {
    if (!form) return;
    const values = formValues(form);
    for (const [key, value] of Object.entries(values)) if (key !== 'photo' && !key.startsWith('obs_') && key !== 'followup') draft.fields[key] = value;
    if (form.querySelector('#followup')) draft.followup = form.querySelector('#followup').checked;
  };
  const flush = async () => { save(node.querySelector('#report-form')); await persist(); };
  draft.flush = flush;
  const hidden = () => {
    if (document.visibilityState === 'hidden') {
      void flush();
      const searching = tracker?.active;
      stopGps();
      if (searching && draft.step === 1) {
        $('#gps').textContent = 'Try again';
        $('#location-status').textContent = 'Try again or place a pin.';
      }
    }
  };
  const leaving = () => { void flush(); };
  document.addEventListener('visibilitychange', hidden); window.addEventListener('pagehide', leaving);
  const dispose = () => { void flush(); stopped = true; clearTimeout(searchTimer);searchGeneration++;stopGps(); canvas?.remove(); canvas = null; if (photoUrl) URL.revokeObjectURL(photoUrl); document.removeEventListener('visibilitychange', hidden); window.removeEventListener('pagehide', leaving); draft.flush = async () => {}; };
  async function render() {
    clearTimeout(searchTimer); searchGeneration++;
    stopGps(); canvas?.remove(); canvas = null; marker = null; accuracyCircle = null;
    if (stopped || !node.isConnected) return;
    await persist();
    if (draft.step === 3 && !draft.preview) {
      try { draft.preview = await api('report-preview.php', {body: {...draft.fields, observations: draft.observations, checklist_versions: draft.checklistVersions}}); }
      catch { draft.step = 2; draftMessage = 'Draft restored. Check the checklist before reviewing your report.'; }
    }
    if (stopped || !node.isConnected) return;
    node.innerHTML = `<div class="page-head"><div><p class="eyebrow">Mangrove report</p><h1>Submit Report</h1></div><a class="button outline" href="#reports">Close</a></div><div class="steps" aria-label="Report steps">${['Details', 'Location', 'Checklist', 'Review'].map((label, i) => `<span class="${draft.step === i ? 'active' : ''}" ${draft.step === i ? 'aria-current="step"' : ''}>${i + 1}. ${label}</span>`).join('')}</div><section class="card"><form id="report-form">${errorBox}<div id="step-body"></div><div class="actions"><button type="button" id="previous" class="outline" ${draft.step ? '' : 'hidden'}>${draft.step ? '← Back' : 'Cancel'}</button><button id="next" type="submit">${draft.step === 3 ? 'Submit Report' : 'Continue →'}</button></div></form></section>`;
    node.querySelector('.steps').insertAdjacentHTML('afterend', '<p id="draft-notice" class="notice" role="status" hidden></p>');
    status();
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
        if (draft.step === 1 && !['gps', 'manual'].includes(draft.fields.location_source)) throw new Error('Search for a place or tap the map to set your pin.');
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
        await flush();
        const result = await api('submit-report.php', {body});
        draft.reset(); await storage.clear(); toast(result.message); location.hash = `report/${result.report.report_id ?? result.report.id}`;
      } catch (e) { if (node.isConnected) showError(error, friendly(e)); }
      finally { button.disabled = false; }
    };
  }
  async function details() {
    $('#step-body').innerHTML = `<h2>What did you observe?</h2><label class="field"><span>Field photo</span><input type="file" name="photo" accept="image/jpeg,image/png,image/webp" capture="environment" ${draft.photo ? '' : 'required'}><small>JPG, PNG, or WebP · Up to 5 MB</small></label><img id="photo-preview" class="preview-photo" alt="Your selected photo" ${draft.photo ? '' : 'hidden'}>
      <div class="row">${select('cluster_id', 'Site', [['', 'New site'], ...data.clusters.map(c => [c.id, c.name])], draft.fields.cluster_id)}${field('sitio_name', 'Location name', draft.fields.sitio_name, 'text', 'required maxlength="120" placeholder="Sitio or nearby landmark"')}</div>
      <label class="check"><input type="checkbox" id="followup" name="followup" ${draft.fields.parent_report_id ? 'checked' : ''}><span>This is a follow-up visit</span></label><div id="followup-options" ${draft.fields.parent_report_id ? '' : 'hidden'}></div>
      <div class="row" style="margin-top:20px">${field('observed_alive_count', 'Living mangroves counted', draft.fields.observed_alive_count, 'number', 'required min="0" max="1000000" step="1"')}${select('root_type', 'Root type', [['', 'Choose root type'], ...data.traits.root_type.map(v => [v, v])], draft.fields.root_type, 'required')}${select('leaf_shape', 'Leaf shape', [['', 'Choose leaf shape'], ...data.traits.leaf_shape.map(v => [v, v])], draft.fields.leaf_shape, 'required')}${select('bark_texture', 'Bark texture', [['', 'Choose bark texture'], ...data.traits.bark_texture.map(v => [v, v])], draft.fields.bark_texture, 'required')}</div>
      <label class="field"><span>Notes (optional)</span><textarea name="guardian_remarks" maxlength="5000">${esc(draft.fields.guardian_remarks)}</textarea></label>`;
    const showPhoto = () => {
      if (photoUrl) URL.revokeObjectURL(photoUrl);
      if (draft.photo) { photoUrl = URL.createObjectURL(draft.photo); $('#photo-preview').src = photoUrl; $('#photo-preview').hidden = false; }
    }; showPhoto();
    const placeInput = $('[name=sitio_name]');
    placeInput.autocomplete = 'off';
    placeInput.setAttribute('aria-controls', 'details-places');
    placeInput.insertAdjacentHTML('afterend', '<small>Choose a place or enter a landmark.</small><div id="details-places" class="list" role="region" aria-label="Suggested locations"></div><small id="details-place-status" role="status"></small>');
    const results = $('#details-places'), hint = $('#details-place-status');
    placeInput.oninput = () => {
      clearTimeout(searchTimer); const generation = ++searchGeneration, q = placeInput.value.trim();
      results.replaceChildren(); hint.textContent = '';
      if (draft.fields.location_selection === 'search' && q !== draft.fields.selected_place_label) {
        Object.assign(draft.fields, {latitude:'',longitude:'',location_source:'',location_accuracy:'',location_selection:'',selected_place_label:''});
      }
      if (q.length < 3) return;
      searchTimer = setTimeout(async () => {
        hint.textContent = 'Finding places...';
        try {
          const {places} = await api('places.php', {query:{q}});
          if (stopped || generation !== searchGeneration || !results.isConnected) return;
          results.innerHTML = places.map((place, i) => `<button type="button" class="report-row place-result" data-index="${i}">${esc(place.label)}</button>`).join('');
          hint.textContent = places.length ? 'Choose your location below.' : 'No matching places. Keep your landmark and place the pin in Step 2.';
          results.querySelectorAll('button').forEach(button => button.onclick = () => {
            const place = places[Number(button.dataset.index)], label = place.label.slice(0,120);
            ++searchGeneration; clearTimeout(searchTimer); stopGps(); placeInput.value = label;
            Object.assign(draft.fields, {sitio_name:label, latitude:place.latitude, longitude:place.longitude,
              location_source:'manual', location_accuracy:'',location_selection:'search',selected_place_label:label});
            results.replaceChildren(); hint.textContent = '';
            changed(); placeInput.focus();
          });
        } catch { if (generation === searchGeneration && results.isConnected) hint.textContent = 'Search is unavailable. Keep your landmark and place the pin in Step 2.'; }
      }, 700);
    };
    placeInput.onkeydown = event => {
      if (event.key === 'ArrowDown' && results.firstElementChild) { event.preventDefault(); results.firstElementChild.focus(); }
      if (event.key === 'Escape') { ++searchGeneration; clearTimeout(searchTimer); results.replaceChildren(); hint.textContent=''; }
    };
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
    $('#followup').checked = draft.followup || Boolean(draft.fields.parent_report_id);
    $('#followup').onchange = () => followups().catch(e => toast(friendly(e)));
    $('[name=cluster_id]').onchange = () => { draft.fields.parent_report_id = ''; followups().catch(e => toast(friendly(e))); };
    if ($('#followup').checked) await followups();
  }
  function locationStep() {
    $('#step-body').innerHTML = `<h2>Where is the mangrove?</h2><p id="location-status" class="muted" role="status">${draft.fields.location_source ? 'Your selected pin is saved.' : 'Finding your location… Allow access if asked.'}</p><label class="field"><span>Find an address or landmark</span><input id="place-search" type="search" autocomplete="off" placeholder="Type a place name"><small>Choose a result, then check the pin.</small></label><div id="place-results" class="list" role="status"></div><div id="location-map" class="map large"></div><details><summary>Location details</summary><div class="row">${field('latitude', 'Latitude', draft.fields.latitude ?? '', 'number', 'required min="-90" max="90" step="any" readonly')}${field('longitude', 'Longitude', draft.fields.longitude ?? '', 'number', 'required min="-180" max="180" step="any" readonly')}</div><p class="muted">Location is detected automatically. The circle shows estimated accuracy. An approximate area needs an exact pin.</p></details>`;
    const locationInput = $('#place-search');
    $('#location-status').insertAdjacentHTML('beforebegin', '<div class="actions"><button type="button" id="gps" aria-describedby="location-status">Use my location</button><button type="button" id="manual-pin" class="outline" aria-describedby="location-status">Place a pin</button></div>');
    const gpsButton = $('#gps');
    const mapElement = $('#location-map');
    mapElement.tabIndex = 0;
    mapElement.setAttribute('aria-label', 'Location map. Use arrow keys to move and Enter to place a pin.');
    $('#manual-pin').onclick = () => {
      stopGps();
      $('#location-status').textContent = 'Tap the map to place your pin, or move it with the arrow keys and press Enter.';
      mapElement.scrollIntoView({block:'center', behavior:'auto'});
      mapElement.focus({preventScroll:true});
    };
    mapElement.addEventListener('keydown', event => {
      if (event.key !== 'Enter' || event.target !== mapElement) return;
      event.preventDefault();
      const center = canvas.getCenter();
      stopGps(); choose(center.lat, center.lng, 'manual', null);
      $('#location-status').textContent = 'Pin placed. Check the spot before continuing.';
    });
    locationInput.value = draft.fields.sitio_name || '';
    locationInput.closest('.field').querySelector('span').textContent = 'Location name';
    locationInput.closest('.field').querySelector('small').textContent = 'Check the pin or choose another place.';
    if (draft.fields.location_source) $('#location-status').textContent = 'Check your pin below.';
    canvas = map($('#location-map'), [], {onClick: event => { stopGps(); choose(event.latlng.lat, event.latlng.lng, 'manual', null); $('#location-status').textContent = 'Pin placed. Check the spot before continuing.'; }});
    const currentCanvas = canvas;
    const b = data.location.barangay;
    if (b) canvas.setView([b.center_lat, b.center_lng], 15);
    const cluster = data.clusters.find(c => String(c.id) === String(draft.fields.cluster_id));
    if (cluster) { L.circle([cluster.center_lat, cluster.center_lng], {radius: cluster.radius_meters, color: '#5e8751', fillOpacity: .08}).addTo(canvas); canvas.setView([cluster.center_lat, cluster.center_lng], 18); }
    let addressGeneration = 0, lastAddressAt = 0;
    async function address(lat, lng) {
      const generation = ++addressGeneration;
      try {
        const result = await api('places.php', {query: {latitude: lat, longitude: lng}});
      if (stopped || draft.step !== 1 || canvas !== currentCanvas || generation !== addressGeneration || Math.abs(Number(draft.fields.latitude) - Number(lat)) > 0.0000001 || Math.abs(Number(draft.fields.longitude) - Number(lng)) > 0.0000001) return;
        const label = result.places?.[0]?.label;
        if (!label) return;
        $('#place-search').placeholder = label;
        if (!draft.fields.sitio_name) { draft.fields.sitio_name = label.slice(0,120); locationInput.value = draft.fields.sitio_name; void persist(); }
        $('#nearby-address').textContent = `Nearby address: ${label}. Check the map pin.`;
      } catch { /* A missing street label never changes the chosen coordinates. */ }
    }
    $('#location-status').insertAdjacentHTML('afterend', '<small id="nearby-address" class="muted"></small>');
    function choose(lat, lng, source, accuracy, restoring = false) {
      if (source === 'manual' && accuracyCircle) { accuracyCircle.remove(); accuracyCircle = null; }
      if (!marker) marker = L.marker([lat, lng], {icon: L.divIcon({html: '<span style="display:block;background:#245b2b;border:3px solid white;border-radius:50%;width:22px;height:22px;box-shadow:0 1px 5px #0008"></span>', className: '', iconSize: [22, 22], iconAnchor: [11, 11]})}).addTo(canvas);
      else marker.setLatLng([lat, lng]);
      draft.fields = {...draft.fields, latitude: lat, longitude: lng, location_source: source, location_accuracy: accuracy ?? ''};
      if (!restoring) { draft.fields.location_selection = source; draft.fields.selected_place_label = ''; }
      $('[name=latitude]').value = Number(lat).toFixed(7); $('[name=longitude]').value = Number(lng).toFixed(7);
      if (!restoring) {
        changed();
        if (source === 'manual' || Date.now() - lastAddressAt > 15000) { lastAddressAt = Date.now(); void address(lat, lng); }
      }
    }
    if (draft.fields.location_source) { choose(Number(draft.fields.latitude), Number(draft.fields.longitude), draft.fields.location_source, draft.fields.location_accuracy, true); canvas.setView([draft.fields.latitude, draft.fields.longitude], 18); }
    $('#place-search').oninput=()=>{
      clearTimeout(searchTimer);const generation=++searchGeneration,q=$('#place-search').value.trim(),target=$('#place-results');
      target.textContent='';if(q.length<3)return;
      searchTimer=setTimeout(async()=>{target.textContent='Finding places...';try{
        const {places}=await api('places.php',{query:{q}});if(generation!==searchGeneration||!target.isConnected)return;
        target.innerHTML=places.length?places.map((p,i)=>`<button type="button" class="report-row place-result" data-index="${i}">${esc(p.label)}</button>`).join(''):'No places found. Try a nearby landmark or tap the map.';
        target.querySelectorAll('button').forEach(button=>button.onclick=()=>{
          const p=places[Number(button.dataset.index)];
          ++searchGeneration;clearTimeout(searchTimer);stopGps();
          draft.fields.sitio_name=p.label.slice(0,120);
          choose(p.latitude,p.longitude,'manual',null);
          Object.assign(draft.fields,{location_selection:'search',selected_place_label:draft.fields.sitio_name});
          void persist();canvas.setView([p.latitude,p.longitude],18);target.innerHTML='';
          locationInput.value=draft.fields.sitio_name;$('#location-status').textContent='Check your pin below.';
        });
      }catch(e){if(generation===searchGeneration&&target.isConnected)target.textContent=friendly(e);}},700);
    };
    const circle = (latitude, longitude, accuracy) => {
        if (!accuracyCircle) accuracyCircle = L.circle([latitude, longitude], {radius: accuracy, color: '#5180bb', fillOpacity: .12}).addTo(canvas);
        else accuracyCircle.setLatLng([latitude, longitude]).setRadius(accuracy);
        canvas.fitBounds(accuracyCircle.getBounds(), {maxZoom: 18});
    };
    if (draft.fields.location_source === 'gps' && Number.isFinite(Number(draft.fields.location_accuracy))) {
      circle(Number(draft.fields.latitude), Number(draft.fields.longitude), Number(draft.fields.location_accuracy));
    }
    if (!draft.fields.location_source && locationInput.value.trim().length >= 3) locationInput.oninput();
    function startLocation() {
      stopGps();
      gpsButton.disabled = true;
      gpsButton.setAttribute('aria-busy', 'true');
      gpsButton.textContent = 'Finding location…';
      const generation = locationGeneration;
      const current = () => !stopped && draft.step === 1 && canvas === currentCanvas && generation === locationGeneration;
      tracker = new locationTools.AutomaticLocator({geolocation:navigator.geolocation,
        allowIpFallback:!locationTools.isMobileDevice(navigator),
        secure:window.isSecureContext || ['localhost','127.0.0.1'].includes(location.hostname),
        maxAccuracy:Number(data.location.max_gps_accuracy_meters)||100,
        onPosition:position=>{
          if (!current()) return;
          const {latitude,longitude,accuracy}=position.coords;
          circle(latitude,longitude,accuracy); choose(latitude,longitude,'gps',accuracy);
        },
        onApproximate:area=>{
          if (!current() || draft.fields.location_source) return;
          if (area.accuracy) circle(area.latitude,area.longitude,area.accuracy);
          else canvas.setView([area.latitude,area.longitude],11);
        },
        onState:({state,message})=>{
          if (!current()) return;
          const busy = ['searching','tracking'].includes(state);
          const retry = ['approximate','unavailable'].includes(state);
          gpsButton.disabled = busy;
          gpsButton.setAttribute('aria-busy', String(busy));
          gpsButton.textContent = busy ? 'Finding location…' : retry ? 'Try again' : 'Use my location';
          $('#location-status').textContent = retry && draft.fields.location_source
            ? 'Could not update your location. Your selected pin is unchanged. ' + message
            : message;
        }
      });
      tracker.start();
    }
    gpsButton.onclick = startLocation;
    if (!draft.fields.location_source) startLocation();
  }

  function checklist() {
    $('#step-body').innerHTML = `<h2>What can you see?</h2><p>Leaf color, pests, and roots determine the health score. Choose Not Sure when you cannot tell.</p>${data.criteria.map(c => `<fieldset class="choice-group"><legend>${esc(c.name)} <small>${c.score_group === 'health' ? 'Health score' : 'Other details'}</small></legend><p>${esc(c.question_text)}</p>${c.guide_image ? `<img class="guide" src="${esc(asset(c.guide_image))}" alt="${esc(c.name)} guide">` : ''}<div class="choice-grid">${c.options.map(o => `<label class="choice"><input type="${c.selection_mode === 'multiple' ? 'checkbox' : 'radio'}" name="obs_${esc(c.code)}" value="${o.id}" data-code="${esc(o.code)}" ${draft.observations[c.code]?.includes(o.id) ? 'checked' : ''}>${o.image_path ? `<img src="${esc(asset(o.image_path))}" alt="">` : ''}<span>${esc(o.label)}</span></label>`).join('')}</div></fieldset>`).join('')}`;
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
    $('#step-body').innerHTML = `<h2>Review your report</h2><p>Check everything below. You can still make changes.</p><section class="summary-card"><h3>Details <button type="button" class="link edit" data-step="0">Edit</button></h3>${draft.photo ? '<img id="summary-photo" class="inline-photo" alt="Your field photo">' : ''}<dl class="summary"><dt>Location name</dt><dd>${esc(draft.fields.sitio_name)}</dd><dt>Living mangroves</dt><dd>${esc(draft.fields.observed_alive_count)}</dd><dt>Species assessment</dt><dd>${esc(species?.scientific_name ?? 'Needs identification')}</dd><dt>Notes</dt><dd>${esc(draft.fields.guardian_remarks || 'None')}</dd>${draft.fields.parent_report_id ? `<dt>Follow-up</dt><dd>Report #${esc(draft.fields.parent_report_id)}</dd>` : ''}</dl></section><section class="summary-card"><h3>Location <button type="button" class="link edit" data-step="1">Edit</button></h3><p>${esc(draft.fields.latitude)}, ${esc(draft.fields.longitude)} · ${draft.fields.location_source === 'gps' ? `Device location (about ${Math.round(Number(draft.fields.location_accuracy))} m)` : 'Manual pin'}</p></section><section class="summary-card"><h3>Checklist <button type="button" class="link edit" data-step="2">Edit</button></h3>${pill(c?.status ?? 'Unknown')}<p>${c?.health_score == null ? 'An expert will review the uncertain answers.' : `${c.health_score} / 6 health points. ${c.status === 'Healthy' ? 'This report will be verified automatically.' : 'An expert will review this report.'}`}</p>${data.criteria.map(criterion => `<p><strong>${esc(criterion.name)}:</strong> ${criterion.options.filter(o => draft.observations[criterion.code]?.includes(o.id)).map(o => esc(o.label)).join(', ') || 'None selected'}</p>`).join('')}</section><label class="check"><input type="checkbox" id="field-confirm" required><span>This photo, location, and checklist describe my field visit.</span></label>`;
    if (draft.photo) { if (photoUrl) URL.revokeObjectURL(photoUrl); photoUrl = URL.createObjectURL(draft.photo); $('#summary-photo').src = photoUrl; }
    $$('.edit').forEach(button => button.onclick = () => { draft.step = Number(button.dataset.step); render().catch(e => toast(friendly(e))); });
    // The confirmation checkbox does not invalidate an already checked preview.
    $('#field-confirm').addEventListener('change', event => event.stopPropagation());
    $('#field-confirm').addEventListener('input', event => event.stopPropagation());
  }
  await render();
  return dispose;
}
