// DOM unit tests: actual forms and events, with network/map adapters stubbed.
// These do not replace visual browser/device testing.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {build} from 'esbuild';
import {JSDOM} from 'jsdom';
import {classify, updateCriterion} from '../../functions/src/domain.js';

const reference = JSON.parse(await readFile(new URL('../../functions/data/reference.json', import.meta.url), 'utf8'));
const dom = new JSDOM('<main id="page"></main><div id="toast" hidden></div><dialog id="confirm"><h2 id="confirm-title"></h2><p id="confirm-body"></p></dialog>', {url: 'http://localhost:5002/#submit'});
for (const key of ['window', 'document', 'location', 'navigator', 'FormData', 'File', 'Event']) {
  Object.defineProperty(globalThis, key, {value: dom.window[key], configurable: true});
}
dom.window.HTMLElement.prototype.scrollIntoView = () => {};
dom.window.HTMLDialogElement.prototype.showModal = function () { this.open = true; };
URL.createObjectURL = () => 'blob:test-photo'; URL.revokeObjectURL = () => {};
let gps;
Object.defineProperty(navigator, 'geolocation', {value: {watchPosition(callback) { gps = callback; return 1; }, clearWatch() {}}});
const bundle = await build({stdin: {contents: 'export * from "./report-form.js"; export * from "./admin.js"; export {toast} from "./ui.js";',
  resolveDir: fileURLToPath(new URL('../src/', import.meta.url))}, bundle: true, write: false, format: 'esm', platform: 'node', plugins: [{name: 'adapters', setup(b) {
    b.onResolve({filter: /client\.js$/}, () => ({path: 'client', namespace: 'stub'}));
    b.onResolve({filter: /^leaflet$/}, () => ({path: 'map', namespace: 'stub'}));
    b.onLoad({filter: /.*/, namespace: 'stub'}, ({path}) => ({contents: path === 'client'
      ? 'export const api = (...args) => globalThis.testApi(...args); export const friendly = e => e.message;'
      : `const layer = () => ({addTo(){return this},setLatLng(){return this},setRadius(){return this},getBounds(){return []}});
         export default {map(){return globalThis.testMap={events:{},setView(){return this},fitBounds(){return this},remove(){},on(k,f){this.events[k]=f;return this}}},
         tileLayer:layer,circle:layer,marker:layer,divIcon:o=>o};` }));
  }}]});
const ui = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`);
const $ = selector => document.querySelector(selector);
const tick = () => new Promise(resolve => setImmediate(resolve));
const change = element => element.dispatchEvent(new Event('change', {bubbles: true}));
const set = (name, value) => { const input = $(`[name=${name}]`); input.value = value; change(input); };
const submit = () => { const form = $('#report-form'); return form.onsubmit({preventDefault() {}, submitter: $('#next')}); };
const closeConfirm = answer => { const dialog = $('#confirm'); dialog.returnValue = answer; dialog.open = false; dialog.dispatchEvent(new Event('close')); };

test('report form hides follow-ups, keeps edits, distinguishes approximate GPS, and confirms before sending', async () => {
  const submissions = [];
  globalThis.testApi = async (path, {body} = {}) => {
    if (path === 'report-form.php') return {criteria: reference.criteria, clusters: [], species: reference.species,
      traits: Object.fromEntries(['root_type', 'leaf_shape', 'bark_texture'].map(k => [k, [reference.species[0][k]]])), location: {barangay: reference.barangays[0]}};
    if (path === 'report-preview.php') {
      assert.deepEqual(body.checklist_versions, Object.fromEntries(reference.criteria.map(c => [c.id, c.version])));
      return {classification: classify(reference.criteria, body.observations), species: {best: reference.species[0]}, checklist_versions: body.checklist_versions};
    }
    if (path === 'submit-report.php') { submissions.push(JSON.parse(body.get('payload'))); return {report: {report_id: 123}, message: 'Report submitted.'}; }
    throw new Error(`Unexpected API call: ${path}`);
  };
  ui.reportDraft.reset();
  const dispose = await ui.reportWizard($('#page'), {});
  try {
    assert.equal($('#followup-options').hidden, true);
    const photo = new File(['test bytes'], 'field.jpg', {type: 'image/jpeg'});
    Object.defineProperty($('[name=photo]'), 'files', {value: [photo]}); change($('[name=photo]'));
    set('sitio_name', 'First location'); set('observed_alive_count', '12');
    for (const k of ['root_type', 'leaf_shape', 'bark_texture']) set(k, reference.species[0][k]);
    await submit(); assert.equal(ui.reportDraft.step, 1);
    $('#gps').click(); gps({coords: {latitude: 10.2833, longitude: 123.8833, accuracy: 180}});
    assert.equal(ui.reportDraft.fields.location_source, '');
    await submit(); assert.equal(ui.reportDraft.step, 1);
    assert.match($('.error').textContent, /tap the map/);
    globalThis.testMap.events.click({latlng: {lat: 10.2833, lng: 123.8833}});
    assert.equal(ui.reportDraft.fields.location_source, 'manual');
    await submit(); assert.equal(ui.reportDraft.step, 2);
    for (const c of reference.criteria.filter(c => c.selection_mode === 'single')) {
      $(`[name=obs_${c.code}][value="${c.options[0].id}"]`).click();
    }
    const context = reference.criteria.find(c => c.code === 'leaf_condition');
    $(`[name=obs_leaf_condition][value="${context.options.find(o => o.code === 'all_of_the_above').id}"]`).click();
    const multi = reference.criteria.find(c => c.selection_mode === 'multiple');
    $(`[name=obs_${multi.code}][value="${multi.options[0].id}"]`).click();
    const none = multi.options.find(o => o.code === 'none_of_the_above');
    $(`[name=obs_${multi.code}][value="${none.id}"]`).click();
    assert.deepEqual(ui.reportDraft.observations[multi.code], [none.id]);
    await submit(); assert.equal(ui.reportDraft.step, 3);
    assert.match($('#step-body').textContent, /6 \/ 6 health points/);
    assert.equal(document.querySelectorAll('.edit').length, 3);
    $('#field-confirm').click(); assert.ok(ui.reportDraft.preview);
    const cancelled = submit(); await tick(); assert.equal($('#confirm').open, true);
    assert.equal(submissions.length, 0); closeConfirm('cancel'); await cancelled;
    assert.equal(submissions.length, 0);
    $('.edit[data-step="0"]').click(); await tick();
    assert.equal(ui.reportDraft.photo, photo); set('sitio_name', 'Updated location');
    await submit(); await submit(); await submit();
    assert.match($('#step-body').textContent, /Updated location/);
    $('#field-confirm').click(); const final = submit(); await tick(); closeConfirm('confirm'); await final;
    assert.equal(submissions.length, 1); assert.equal(submissions[0].sitio_name, 'Updated location');
    assert.equal(submissions[0].field_confirmation, '1'); assert.equal(location.hash, '#report/123');
    assert.equal(ui.reportDraft.dirty, false);
  } finally { dispose(); clearTimeout(ui.toast.timer); }
});

test('checklist editor retains names while adding, undoing and deleting choices, and saving photos', async () => {
  const original = structuredClone(reference.criteria[0]); let saved;
  globalThis.testApi = async (path, {body} = {}) => {
    assert.equal(path, 'checklist.php');
    if (!body) return {criteria: [original]};
    const input = JSON.parse(body.get('payload'));
    assert.equal(body.get('guide_image').name, 'guide.jpg');
    let id = 9000; saved = updateCriterion(original, input, () => id++);
    return {criteria: [saved], message: 'Checklist saved.'};
  };
  await ui.checklistPage($('#page'));
  set('name', 'Leaf appearance');
  $('.add').click();
  const added = $('[data-option="-1"]');
  added.querySelector('[name=label]').value = 'Mixed colors'; added.querySelector('[name=points]').value = '1';
  const removable = original.options.find(o => o.points === 1);
  $(`[data-option="${removable.id}"] .remove`).click();
  $(`[data-option="${removable.id}"] .restore`).click();
  $(`[data-option="${removable.id}"] .remove`).click();
  assert.equal($('[name=name]').value, 'Leaf appearance');
  assert.equal($('[data-option="-1"] [name=label]').value, 'Mixed colors');
  const fileInput = $('[data-image=guide_image]');
  Object.defineProperty(fileInput, 'files', {value: [new File(['photo'], 'guide.jpg', {type: 'image/jpeg'})]}); change(fileInput);
  const form = $('#criteria form'); await form.onsubmit({preventDefault() {}, submitter: form.querySelector('[type=submit]')});
  assert.ok(saved); assert.equal(saved.name, 'Leaf appearance');
  assert.ok(saved.options.some(o => o.label === 'Mixed colors' && o.points === 1));
  assert.ok(saved.archived_options.some(o => o.id === removable.id));
  assert.equal(saved.options.some(o => o.id === removable.id), false);
  clearTimeout(ui.toast.timer);
});
