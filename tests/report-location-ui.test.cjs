// Exercise real wizard event handlers with a minimal DOM and simulated device readings.
// These checks do not measure physical GPS reception or browser rendering.
const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');

class Element {
    constructor() {
        this.value = '';
        this.hidden = false;
        this.dataset = {};
        this.listeners = {};
        this.classList = {toggle() {}};
    }
    addEventListener(event, callback) { this.listeners[event] = callback; }
    querySelectorAll() { return []; }
    querySelector() { return null; }
    checkValidity() { return true; }
    setCustomValidity() {}
    reportValidity() {}
    focus() {}
    closest() { return null; }
    setAttribute() {}
    click() { if (!this.disabled) return this.listeners.click?.(); }
}

async function wizard({permission = 'prompt', saved = {}, withMap = false, fetchImpl} = {}) {
    const elements = {};
    const element = name => elements[name] ||= new Element();
    const form = new Element();
    const panels = [1, 2, 3].map(step => Object.assign(new Element(), {dataset: {stepPanel: step}}));
    form.dataset = {maxGpsAccuracy: 100};
    form.querySelector = selector => element(selector);
    form.querySelectorAll = selector => selector === '[data-step-panel]' ? panels : [];
    for (const [key, value] of Object.entries(saved)) element(`[data-${key}]`).value = value;
    element('[data-photo-input]').files = [{type: 'image/jpeg', size: 100}];
    const document = new Element();
    document.hidden = false;
    document.querySelector = selector => selector === '[data-report-wizard]' ? form : null;
    const calls = [];
    const alternatives = [];
    const requests = [];
    const timeouts = new Map();
    let fakeNow = Date.now();
    const intervals = new Map();
    let timerId = 0;
    const context = {
        document,
        navigator: {
            permissions: {query: async () => ({state: permission})},
            geolocation: {
                watchPosition(success, error) { calls.push({success, error}); return calls.length; },
                getCurrentPosition(success, error, options) { alternatives.push({success, error, options}); },
                clearWatch() {}
            }
        },
        isSecureContext: true,
        Date: class extends Date { static now() { return fakeNow; } },
        setInterval(fn) { intervals.set(++timerId, fn); return timerId; },
        clearInterval(id) { intervals.delete(id); },
        setTimeout(fn, delay) { timeouts.set(++timerId, {fn, delay}); return timerId; },
        clearTimeout(id) { timeouts.delete(id); },
        scrollTo() {}, addEventListener() {}, URL, console, AbortController,
        fetch: async (...args) => {
            requests.push(args);
            return fetchImpl ? fetchImpl(...args) : {ok: true, json: async () => ({latitude: '10.28', longitude: '123.88', accuracy: 50, city: 'Cebu'})};
        }
    };
    const mapEvents = {};
    const map = {
        views: [], bounds: [],
        setView(point, zoom) { this.views.push({point, zoom}); return this; },
        fitBounds(bounds, options) { this.bounds.push({bounds, options}); },
        on(name, fn) { mapEvents[name] = fn; }, removeLayer() {}, invalidateSize() {}
    };
    if (withMap) context.L = {
        map: () => map, tileLayer: () => ({addTo() {}}), divIcon: () => ({}),
        marker: () => ({
            addTo() { return this; }, on() {}, setLatLng() {}, dragging: {enable() {}, disable() {}}
        }),
        circle: (point, options) => ({addTo() { return this; }, getBounds() { return {point, options}; }})
    };
    context.window = context;
    vm.createContext(context);
    for (const script of ['live-location.js', 'report-wizard.js']) {
        vm.runInContext(fs.readFileSync(path.join(__dirname, '../public/assets/js', script), 'utf8'), context);
    }
    await Promise.resolve();
    return {
        element, calls, panels, document, requests, alternatives, map,
        tapMap(latitude = 10.286, longitude = 123.886) { mapEvents.click?.({latlng: {lat: latitude, lng: longitude}}); },
        consent(checked = true) {
            element('[data-ip-area-consent]').checked = checked;
            element('[data-ip-area-consent]').listeners.change();
        },
        expireIp() { [...timeouts.values()].filter(timer => timer.delay === 10000).forEach(timer => timer.fn()); },
        advance(ms) { fakeNow += ms; [...intervals.values()].forEach(fn => fn()); },
        fix(accuracy = 10, latitude = 10.2833) {
            calls.at(-1).success({timestamp: fakeNow, coords: {latitude, longitude: 123.8833, accuracy}});
        }
    };
}

test('automatic capture starts only with previously granted permission and empty coordinates', async () => {
    assert.equal((await wizard({permission: 'granted'})).calls.length, 1);
    assert.equal((await wizard({permission: 'prompt'})).calls.length, 0);
    assert.equal((await wizard({permission: 'denied'})).calls.length, 0);
    const saved = {latitude: '10.28', longitude: '123.88', 'location-source': 'manual'};
    assert.equal((await wizard({permission: 'granted', saved})).calls.length, 0);
});

test('restored manual points initialize correctly when Leaflet is present', async () => {
    const f = await wizard({withMap: true, saved: {latitude: '10.28', longitude: '123.88', 'location-source': 'manual'}});
    assert.equal(f.element('[data-latitude]').value, '10.28000000');
    assert.equal(f.element('[data-location-source]').value, 'manual');
});

test('coarse readings leave coordinates empty; fresh readings update until locked', async () => {
    const f = await wizard();
    f.element('[data-use-gps]').click();
    f.fix(50000);
    assert.equal(f.element('[data-latitude]').value, '');
    assert.equal(f.element('[data-save-location]').disabled, true);
    f.fix(30);
    assert.equal(f.element('[data-latitude]').value, '10.28330000');
    assert.equal(f.element('[data-location-accuracy]').value, '30.00');
    f.fix(25, 10.284);
    assert.equal(f.element('[data-latitude]').value, '10.28400000');
    f.element('[data-save-location]').click();
    f.fix(10, 10.29); // Queued device callback after stop.
    assert.equal(f.element('[data-latitude]').value, '10.28400000');
    assert.equal(f.element('[data-use-gps]').hidden, false);
});

test('cancel restores the old manual selection without changing its source or accuracy', async () => {
    const f = await wizard({saved: {latitude: '10.28', longitude: '123.88', 'location-source': 'manual'}});
    f.element('[data-use-gps]').click();
    f.fix();
    f.element('[data-cancel-location]').click();
    assert.equal(f.element('[data-latitude]').value, '10.28000000');
    assert.equal(f.element('[data-location-source]').value, 'manual');
    assert.equal(f.element('[data-location-accuracy]').value, '');
});

test('editing manual coordinates cancels live capture and late updates cannot overwrite them', async () => {
    const f = await wizard();
    f.element('[data-use-gps]').click();
    f.element('[data-latitude]').value = '10.285';
    f.element('[data-longitude]').value = '123.89';
    f.element('[data-latitude]').listeners.input();
    f.fix();
    assert.equal(f.element('[data-latitude]').value, '10.285');
    assert.equal(f.element('[data-location-source]').value, 'manual');
});

test('stale readings cannot be locked or continued until refreshed', async () => {
    const f = await wizard();
    f.element('[data-use-gps]').click();
    f.fix();
    f.advance(16000);
    assert.equal(f.element('[data-save-location]').disabled, true);
    f.element('[data-step-next]').click();
    assert.equal(f.panels[0].hidden, false);
    f.fix();
    f.element('[data-step-next]').click();
    assert.equal(f.panels[0].hidden, true);
    const selected = f.element('[data-latitude]').value;
    f.fix(10, 10.295);
    assert.equal(f.element('[data-latitude]').value, selected);
});

test('map failure does not preserve an invalid restored GPS reading', async () => {
    const f = await wizard({saved: {latitude: '10.28', longitude: '123.88', 'location-source': 'gps', 'location-accuracy': '50000'}});
    assert.equal(f.element('[data-latitude]').value, '');
    assert.equal(f.element('[data-location-source]').value, '');
});

test('hidden pages stop location updates and preserve the captured observation', async () => {
    const f = await wizard();
    f.element('[data-use-gps]').click();
    f.fix();
    f.document.hidden = true;
    f.document.listeners.visibilitychange();
    const selected = f.element('[data-latitude]').value;
    f.fix(10, 10.30);
    assert.equal(f.element('[data-latitude]').value, selected);
    assert.equal(f.element('[data-use-gps]').hidden, false);
});

test('device-area fallback moves only the map; tapping the site creates an honest manual pin', async () => {
    const f = await wizard({withMap: true});
    f.element('[data-use-gps]').click();
    f.fix(50000);
    assert.equal(f.element('[data-show-device-area]').hidden, false);
    assert.equal(f.element('[data-location-options]').open, true);
    f.element('[data-show-device-area]').click();
    assert.equal(f.map.bounds.at(-1).bounds.options.radius, 50000);
    assert.equal(f.element('[data-latitude]').value, '');
    assert.equal(f.element('[data-location-source]').value, '');
    f.element('[data-step-next]').click();
    assert.equal(f.panels[0].hidden, false);
    f.tapMap();
    assert.equal(f.element('[data-location-source]').value, 'manual');
    assert.equal(f.element('[data-location-accuracy]').value, '');
    assert.equal(f.element('[data-latitude]').value, '10.28600000');
    f.fix(10, 10.30); // A stopped high-accuracy callback cannot undo the pin.
    assert.equal(f.element('[data-latitude]').value, '10.28600000');
    f.element('[data-step-next]').click();
    assert.equal(f.panels[0].hidden, true);
});

test('area guidance over an existing point blocks continuation until selected or canceled', async () => {
    const f = await wizard({withMap: true, saved: {latitude: '10.28', longitude: '123.88', 'location-source': 'manual'}});
    f.element('[data-use-gps]').click();
    f.fix(50000);
    f.element('[data-show-device-area]').click();
    f.element('[data-step-next]').click();
    assert.equal(f.panels[0].hidden, false);
    f.element('[data-cancel-area]').click();
    assert.equal(f.element('[data-latitude]').value, '10.28000000');
    f.element('[data-step-next]').click();
    assert.equal(f.panels[0].hidden, true);
});

test('IP lookup requires explicit opt-in and never runs automatically after denial', async () => {
    const f = await wizard({withMap: true});
    f.element('[data-use-gps]').click();
    f.calls[0].error({code: 1});
    assert.equal(f.requests.length, 0);
    await f.element('[data-show-ip-area]').click();
    assert.equal(f.requests.length, 0);
    f.consent();
    assert.equal(f.requests.length, 0); // Checking alone does not contact GeoJS.
    await f.element('[data-show-ip-area]').click();
    assert.equal(f.requests.length, 1);
    assert.equal(f.map.bounds.at(-1).bounds.options.radius, 50000);
    assert.equal(f.element('[data-latitude]').value, '');
    assert.match(f.element('[data-area-status]').textContent, /Approximate IP area/);
    f.tapMap();
    assert.equal(f.element('[data-location-source]').value, 'manual');
    assert.equal(f.element('[data-location-accuracy]').value, '');
});

test('IP responses with claimed high precision are still map guidance, never GPS', async () => {
    const f = await wizard({withMap: true, fetchImpl: async () => ({ok: true, json: async () => ({latitude: 10.28, longitude: 123.88, accuracy: 0.005})})});
    f.consent();
    await f.element('[data-show-ip-area]').click();
    assert.equal(f.element('[data-location-source]').value, '');
    assert.equal(f.element('[data-location-accuracy]').value, '');
    f.tapMap();
    assert.equal(f.element('[data-location-source]').value, 'manual');
});

test('late IP lookup cannot overwrite a manual pin or a new live capture', async () => {
    for (const action of ['manual', 'gps', 'cancel', 'revoke', 'hidden']) {
        let resolveRequest;
        const f = await wizard({withMap: true, fetchImpl: () => new Promise(resolve => { resolveRequest = resolve; })});
        f.consent();
        const pending = f.element('[data-show-ip-area]').click();
        if (action === 'revoke') f.consent(false);
        else if (action === 'hidden') { f.document.hidden = true; f.document.listeners.visibilitychange(); }
        else if (action === 'cancel') f.element('[data-cancel-area]').click();
        else {
            f.element(action === 'manual' ? '[data-use-manual]' : '[data-use-gps]').click();
            if (action === 'manual') f.tapMap();
            else f.fix(20);
        }
        const before = f.element('[data-latitude]').value;
        resolveRequest({ok: true, json: async () => ({latitude: 14, longitude: 121, accuracy: 500})});
        await pending;
        assert.equal(f.map.bounds.length, 0, action);
        assert.equal(f.element('[data-latitude]').value, before, action);
        assert.equal(f.requests[0][1].signal.aborted, true, action);
    }
});

test('IP timeouts and malformed results fail safely and allow retry', async () => {
    const f = await wizard({withMap: true, fetchImpl: (url, options) => new Promise((resolve, reject) => {
        options.signal.addEventListener('abort', () => reject(new Error('aborted')));
    })});
    f.consent();
    const pending = f.element('[data-show-ip-area]').click();
    assert.equal(f.element('[data-show-ip-area]').disabled, true);
    f.expireIp();
    await pending;
    assert.match(f.element('[data-area-status]').textContent, /failed or timed out/);
    assert.equal(f.element('[data-show-ip-area]').disabled, false);
    assert.equal(f.element('[data-latitude]').value, '');
    const invalid = await wizard({withMap: true, fetchImpl: async () => ({ok: true, json: async () => ({latitude: 'bad'})})});
    invalid.consent();
    await invalid.element('[data-show-ip-area]').click();
    assert.equal(invalid.map.bounds.length, 0);
    assert.equal(invalid.element('[data-latitude]').value, '');
});

test('map-dependent fallback stays disabled without Leaflet and does not contact IP provider', async () => {
    const f = await wizard();
    f.consent();
    assert.equal(f.element('[data-show-ip-area]').disabled, true);
    await f.element('[data-show-ip-area]').click();
    assert.equal(f.requests.length, 0);
});

test('alternative device fix can populate the form if its accuracy is acceptable', async () => {
    const f = await wizard({withMap: true});
    f.element('[data-use-gps]').click();
    f.advance(15000);
    assert.equal(f.alternatives.length, 1);
    f.alternatives[0].success({timestamp: Date.now() + 15000, coords: {latitude: 10.28, longitude: 123.88, accuracy: 45}});
    assert.equal(f.element('[data-location-accuracy]').value, '45.00');
    assert.equal(f.element('[data-show-device-area]').hidden, true);
});

test('old coarse device estimates cannot be reused after five minutes', async () => {
    const f = await wizard({withMap: true});
    f.element('[data-use-gps]').click();
    f.fix(50000);
    f.advance(300001);
    f.element('[data-show-device-area]').click();
    assert.equal(f.map.bounds.length, 0);
    assert.match(f.element('[data-area-status]').textContent, /too old/);
});

test('unknown IP accuracy stays unknown and its label cannot become HTML or the site name', async () => {
    const label = '<img src=x onerror=alert(1)>';
    const f = await wizard({withMap: true, fetchImpl: async () => ({ok: true, json: async () => ({latitude: 10.28, longitude: 123.88, city: label})})});
    f.consent();
    await f.element('[data-show-ip-area]').click();
    assert.equal(f.map.bounds.length, 0);
    assert.equal(f.map.views.at(-1).zoom, 10);
    assert.match(f.element('[data-area-status]').textContent, /accuracy unknown/);
    assert.ok(f.element('[data-area-status]').textContent.includes(label));
    assert.equal(f.element('[data-area-status]').innerHTML, undefined);
    assert.equal(f.element('#sitio_name').value, '');
});
