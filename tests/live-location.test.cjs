const test = require('node:test');
const assert = require('node:assert/strict');
const {Tracker, parseIpArea, lookupIpArea} = require('../public/assets/js/live-location.js');

function fixture(overrides = {}) {
    let now = 1700000000000;
    let nextId = 0;
    const callbacks = new Map();
    const intervals = new Map();
    const cleared = [];
    const positions = [];
    const states = [];
    const alternatives = [];
    const approximate = [];
    const geolocation = {
        watchPosition(success, error, options) {
            const id = nextId++;
            callbacks.set(id, {success, error, options});
            return id;
        },
        clearWatch(id) { cleared.push(id); },
        getCurrentPosition(success, error, options) { alternatives.push({success, error, options}); }
    };
    const tracker = new Tracker({
        geolocation, secure: true, now: () => now,
        setInterval(fn) { const id = nextId++; intervals.set(id, fn); return id; },
        clearInterval(id) { intervals.delete(id); },
        onPosition(position) { positions.push(position); },
        onApproximate(position) { approximate.push(position); },
        onState(state) { states.push(state); },
        ...overrides
    });
    const reading = (accuracy = 10, changes = {}) => ({
        timestamp: now, coords: {latitude: 10.2833, longitude: 123.8833, accuracy}, ...changes
    });
    return {
        tracker, positions, states, callbacks, cleared, intervals, reading, alternatives, approximate,
        receive(position) { callbacks.get(tracker.watchId).success(position); },
        error(code) { callbacks.get(tracker.watchId).error({code}); },
        advance(ms) { now += ms; [...intervals.values()].forEach(fn => fn()); }
    };
}

test('requests uncached high accuracy and keeps the watch running after success', () => {
    const f = fixture();
    f.tracker.start();
    const options = f.callbacks.get(f.tracker.watchId).options;
    assert.equal(options.enableHighAccuracy, true);
    assert.equal(options.maximumAge, 0);
    f.receive(f.reading());
    assert.equal(f.positions.length, 1);
    assert.equal(f.tracker.active, true);
    assert.equal(f.tracker.isFresh(), true);
});

test('a 50km network estimate never becomes a selected point', () => {
    const f = fixture();
    f.tracker.start();
    f.receive(f.reading(50000));
    assert.equal(f.positions.length, 0);
    assert.equal(f.tracker.position, null);
    f.advance(60000);
    assert.equal(f.states.at(-1).state, 'timeout');
    assert.match(f.states.at(-1).message, /50000/);
    assert.equal(f.tracker.active, false);
    assert.equal(f.intervals.size, 0);
});

test('temporary unavailability and timeout recover when an accurate reading arrives', () => {
    const f = fixture();
    f.tracker.start();
    f.error(2);
    f.error(3);
    f.advance(16000);
    f.receive(f.reading(45));
    assert.equal(f.positions.length, 1);
    assert.equal(f.states.at(-1).state, 'tracking');
});

test('denied permission stops the watch immediately and requests a settings change', () => {
    const f = fixture();
    f.tracker.start();
    const id = f.tracker.watchId;
    f.error(1);
    assert.equal(f.tracker.active, false);
    assert.deepEqual(f.cleared, [id]);
    assert.equal(f.states.at(-1).state, 'denied');
});

test('insecure contexts and browsers without geolocation never start a watch', () => {
    for (const options of [{secure: false}, {geolocation: null}]) {
        const f = fixture(options);
        f.tracker.start();
        assert.equal(f.callbacks.size, 0);
        assert.equal(f.tracker.active, false);
        assert.equal(f.intervals.size, 0);
    }
});

test('ignores invalid coordinates, fabricated timestamps and stale cached readings', () => {
    const f = fixture();
    f.tracker.start();
    const now = f.reading().timestamp;
    for (const position of [
        f.reading(10, {timestamp: now - 20000}),
        f.reading(10, {timestamp: now + 5000}),
        f.reading(10, {timestamp: undefined}),
        f.reading(10, {coords: {latitude: 91, longitude: 123, accuracy: 1}}),
        f.reading(10, {coords: {latitude: 10, longitude: Infinity, accuracy: 1}}),
        f.reading(10, {coords: {latitude: null, longitude: 123, accuracy: 1}}),
        f.reading(NaN), f.reading(-1)
    ]) f.receive(position);
    assert.equal(f.positions.length, 0);
});

test('uses the latest accurate location after movement even if accuracy was better earlier', () => {
    const f = fixture();
    f.tracker.start();
    f.receive(f.reading(5));
    f.advance(3000);
    const moved = f.reading(50, {coords: {latitude: 10.284, longitude: 123.884, accuracy: 50}});
    f.receive(moved);
    assert.equal(f.tracker.position, moved);
    f.receive(f.reading(50000));
    assert.equal(f.tracker.position, moved);
    assert.equal(f.positions.length, 2);
});

test('rejects out-of-order callbacks that would jump to an earlier location', () => {
    const f = fixture();
    f.tracker.start();
    const earlier = f.reading(5);
    f.advance(1000);
    const latest = f.reading(20);
    f.receive(latest);
    f.receive(earlier);
    assert.equal(f.tracker.position, latest);
    assert.equal(f.positions.length, 1);
});

test('a stalled stream becomes stale then stops, but a new fix can recover it', () => {
    const f = fixture();
    f.tracker.start();
    f.receive(f.reading());
    f.advance(16000);
    assert.equal(f.tracker.isFresh(), false);
    assert.equal(f.states.at(-1).state, 'stale');
    f.receive(f.reading());
    assert.equal(f.tracker.isFresh(), true);
    f.advance(60000);
    assert.equal(f.tracker.active, false);
    assert.match(f.states.at(-1).message, /no recent accurate reading/);
});

test('cancel/manual selection prevents queued callbacks overwriting the selected point', () => {
    const f = fixture();
    f.tracker.start();
    const originalCallback = f.callbacks.get(f.tracker.watchId);
    f.tracker.stop();
    originalCallback.success(f.reading());
    assert.equal(f.positions.length, 0);
    f.tracker.start();
    originalCallback.success(f.reading());
    originalCallback.error({code: 1});
    assert.equal(f.tracker.active, true);
    assert.equal(f.positions.length, 0);
    f.receive(f.reading());
    assert.equal(f.positions.length, 1);
});

test('failure to start and immediate permission errors leave no timers or watches', () => {
    const thrown = fixture({geolocation: {watchPosition() { throw new Error('blocked'); }}});
    thrown.tracker.start();
    assert.equal(thrown.intervals.size, 0);
    assert.equal(thrown.states.at(-1).state, 'unavailable');
    let clearedId = null;
    const immediate = fixture({geolocation: {
        watchPosition(success, error) { error({code: 1}); return 0; },
        clearWatch(id) { clearedId = id; }
    }});
    immediate.tracker.start();
    assert.equal(immediate.intervals.size, 0);
    assert.equal(immediate.tracker.active, false);
    assert.equal(clearedId, 0);
});

test('a stalled precise request tries one uncached alternative device request', () => {
    const f = fixture();
    f.tracker.start();
    f.advance(15000);
    assert.equal(f.alternatives.length, 1);
    assert.equal(f.alternatives[0].options.enableHighAccuracy, false);
    assert.equal(f.alternatives[0].options.maximumAge, 0);
    f.alternatives[0].success(f.reading(40));
    assert.equal(f.positions.length, 1);
    assert.equal(f.tracker.active, true);
    f.advance(16000);
    assert.equal(f.alternatives.length, 1);
});

test('temporary errors request the alternative immediately; permission denial never does', () => {
    const f = fixture();
    f.tracker.start();
    f.error(2);
    assert.equal(f.alternatives.length, 1);
    f.error(3);
    assert.equal(f.alternatives.length, 1);
    f.alternatives[0].error({code: 1});
    assert.equal(f.tracker.active, false);
    const denied = fixture();
    denied.tracker.start();
    denied.error(1);
    assert.equal(denied.alternatives.length, 0);
});

test('coarse alternative readings are map guidance only and canceled callbacks are ignored', () => {
    const f = fixture();
    f.tracker.start();
    f.error(3);
    f.alternatives[0].success(f.reading(50000));
    assert.equal(f.approximate.length, 1);
    assert.equal(f.positions.length, 0);
    assert.equal(f.tracker.approximatePosition.coords.accuracy, 50000);
    f.tracker.stop();
    f.alternatives[0].success(f.reading(5));
    assert.equal(f.positions.length, 0);
});

test('IP response parsing validates coordinates and converts kilometer uncertainty', () => {
    const area = parseIpArea({latitude: '10.28', longitude: '123.88', accuracy: 50, city: 'Cebu', country: 'Philippines'});
    assert.equal(area.latitude, 10.28);
    assert.equal(area.accuracy, 50000);
    assert.equal(area.label, 'Cebu, Philippines');
    assert.equal(parseIpArea({latitude: 0, longitude: 0}).accuracy, null);
    for (const bad of [undefined, {}, {latitude: null, longitude: 123}, {latitude: '', longitude: 123},
        {latitude: false, longitude: 123}, {latitude: 91, longitude: 123}, {latitude: 10, longitude: 181}]) {
        assert.throws(() => parseIpArea(bad));
    }
});

test('IP lookup sends no cookies, referrer, credentials or report data', async () => {
    let captured;
    const controller = new AbortController();
    const area = await lookupIpArea({signal: controller.signal, fetch: async (url, options) => {
        captured = {url, options};
        return {ok: true, json: async () => ({latitude: '10.28', longitude: '123.88', accuracy: 50})};
    }});
    assert.equal(captured.url, 'https://get.geojs.io/v1/ip/geo.json');
    assert.equal(captured.options.credentials, 'omit');
    assert.equal(captured.options.referrerPolicy, 'no-referrer');
    assert.equal(captured.options.cache, 'no-store');
    assert.equal(captured.options.redirect, 'error');
    assert.equal(captured.options.body, undefined);
    assert.equal(captured.options.signal, controller.signal);
    assert.equal(area.accuracy, 50000);
    await assert.rejects(lookupIpArea({fetch: async () => ({ok: false})}), /unavailable/);
    await assert.rejects(lookupIpArea({fetch: async () => ({ok: true, json: async () => ({})})}), /usable/);
});
