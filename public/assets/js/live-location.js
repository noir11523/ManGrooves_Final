/* Browser location capture. Reported accuracy is an estimate, not proof of GPS hardware. */
(function (root, factory) {
    'use strict';
    if (typeof module === 'object' && module.exports) module.exports = factory();
    else root.ManGroovesLiveLocation = factory();
})(typeof window === 'object' ? window : this, function () {
    'use strict';

    class Tracker {
        constructor(options) {
            this.geolocation = options.geolocation;
            this.secure = options.secure;
            this.maxAccuracy = options.maxAccuracy || 100;
            this.onPosition = options.onPosition || (() => {});
            this.onApproximate = options.onApproximate || (() => {});
            this.onState = options.onState || (() => {});
            this.now = options.now || Date.now;
            this.setInterval = options.setInterval || globalThis.setInterval.bind(globalThis);
            this.clearInterval = options.clearInterval || globalThis.clearInterval.bind(globalThis);
            this.waitMs = options.waitMs || 60000;
            this.freshMs = 15000;
            this.active = false;
            this.generation = 0;
            this.watchId = null;
            this.timerId = null;
            this.position = null;
            this.approximatePosition = null;
        }

        isFresh(position = this.position) {
            const age = this.now() - position?.timestamp;
            return Boolean(position && Number.isFinite(age) && age >= -1000 && age <= this.freshMs);
        }

        emit(state, message) {
            this.onState({state, message, active: this.active, position: this.position});
        }

        stop() {
            // Invalidate queued callbacks before clearing the OS watch.
            this.generation += 1;
            this.active = false;
            if (this.watchId !== null) this.geolocation?.clearWatch(this.watchId);
            if (this.timerId !== null) this.clearInterval(this.timerId);
            this.watchId = null;
            this.timerId = null;
        }

        finish(state, message) {
            this.stop();
            this.emit(state, message);
        }

        start() {
            this.stop();
            this.position = null;
            this.approximatePosition = null;
            this.bestAccuracy = null;
            this.lastTimestamp = -Infinity;
            if (!this.secure) {
                this.emit('insecure', 'Open the secure site for location access, or place a pin manually.');
                return;
            }
            if (!this.geolocation) {
                this.emit('unsupported', 'Location is unavailable. Place a pin manually.');
                return;
            }
            this.active = true;
            this.deadline = this.now() + this.waitMs;
            const alternativeAt = this.now() + 15000;
            let alternativeRequested = false;
            const generation = this.generation;
            const receive = position => {
                if (!this.active || generation !== this.generation) return;
                const coords = position?.coords;
                if (!coords || ![coords.latitude, coords.longitude, coords.accuracy, position.timestamp].every(Number.isFinite)
                    || Math.abs(coords.latitude) > 90 || Math.abs(coords.longitude) > 180 || coords.accuracy < 0
                    || !this.isFresh(position) || position.timestamp < this.lastTimestamp) return;
                this.lastTimestamp = position.timestamp;
                this.bestAccuracy = this.bestAccuracy === null ? coords.accuracy : Math.min(this.bestAccuracy, coords.accuracy);
                if (coords.accuracy > this.maxAccuracy) {
                    this.approximatePosition = position;
                    this.onApproximate(position);
                    this.emit('approximate', `Approximate: ±${Math.ceil(coords.accuracy)} m. Finding a clearer location...`);
                    return;
                }
                // Use the latest accurate position, not an older "best" one: the user may move.
                this.position = position;
                this.deadline = this.now() + this.waitMs;
                this.onPosition(position);
                this.emit('tracking', `Accuracy: ±${Math.ceil(coords.accuracy)} m. Tap Use this location when ready.`);
            };
            const requestAlternative = () => {
                if (alternativeRequested || !this.active || generation !== this.generation
                    || typeof this.geolocation.getCurrentPosition !== 'function') return;
                alternativeRequested = true;
                try {
                    // A second, low-power request may resolve sooner via the OS network provider.
                    // It cannot force Wi-Fi/IP or tell us which sensor the browser used.
                    this.geolocation.getCurrentPosition(receive, error => {
                        if (this.active && generation === this.generation && error.code === 1) {
                            this.finish('denied', 'Allow location in your browser and device settings, then retry.');
                        }
                    }, {enableHighAccuracy: false, maximumAge: 0, timeout: 15000});
                } catch (error) { /* Keep the primary watch running if the optional request fails. */ }
            };
            this.emit('searching', 'Finding your location. Allow access if asked.');
            this.timerId = this.setInterval(() => {
                if (!this.active || generation !== this.generation) return;
                if (this.now() >= this.deadline) {
                    const message = this.position
                        ? 'Location expired. Try again or place a pin.'
                        : this.bestAccuracy !== null
                            ? `Approximate: ±${Math.ceil(this.bestAccuracy)} m. Try again or place a pin manually.`
                            : 'Location not found. Try again or place a pin manually.';
                    this.finish('timeout', message);
                } else if (!this.isFresh()) {
                    if (this.now() >= alternativeAt) requestAlternative();
                    if (!this.active || this.isFresh()) return;
                    const seconds = Math.max(1, Math.ceil((this.deadline - this.now()) / 1000));
                    this.emit(this.position ? 'stale' : 'searching', this.position
                        ? `Refreshing location (${seconds}s)...`
                        : `Finding location (${seconds}s)${this.bestAccuracy !== null ? ` - accuracy ±${Math.ceil(this.bestAccuracy)} m` : ''}...`);
                }
            }, 1000);
            try {
                const watchId = this.geolocation.watchPosition(receive, error => {
                    if (!this.active || generation !== this.generation) return;
                    if (error.code === 1) {
                        this.finish('denied', 'Allow location in your browser and device settings, then retry.');
                    } else {
                        // A watch continues after transient unavailable/timeout errors; allow it to recover.
                        this.emit('retrying', 'Still finding your location. You can place a pin instead.');
                        requestAlternative();
                    }
                }, {enableHighAccuracy: true, maximumAge: 0, timeout: 15000});
                if (this.active && generation === this.generation) this.watchId = watchId;
                else this.geolocation.clearWatch(watchId);
            } catch (error) {
                this.finish('unavailable', 'Check location access in your browser and device settings.');
            }
        }
    }

    function parseIpArea(payload) {
        const coordinate = (value, limit) => {
            if (!['string', 'number'].includes(typeof value) || String(value).trim() === '') return null;
            const parsed = Number(value);
            return Number.isFinite(parsed) && Math.abs(parsed) <= limit ? parsed : null;
        };
        const latitude = coordinate(payload?.latitude, 90);
        const longitude = coordinate(payload?.longitude, 180);
        if (latitude === null || longitude === null) throw new Error('No usable IP area was returned.');
        const kilometers = coordinate(payload?.accuracy, 20000);
        return {
            latitude, longitude,
            // GeoJS reports a radius in KILOMETERS. Missing accuracy is unknown, never zero.
            accuracy: kilometers !== null && kilometers > 0 ? kilometers * 1000 : null,
            label: [payload.city, payload.region, payload.country]
                .filter(value => typeof value === 'string' && value.trim()).map(value => value.slice(0, 80)).join(', ')
        };
    }

    async function lookupIpArea({fetch: request = globalThis.fetch, signal} = {}) {
        const response = await request('https://get.geojs.io/v1/ip/geo.json', {
            method: 'GET', mode: 'cors', credentials: 'omit', referrerPolicy: 'no-referrer',
            cache: 'no-store', redirect: 'error', headers: {'Accept': 'application/json'}, signal
        });
        if (!response.ok) throw new Error('The IP area service is unavailable.');
        return parseIpArea(await response.json());
    }

    class AutomaticLocator {
        constructor(options) { this.options = options; this.active = false; }
        stop() {
            this.active = false;
            this.tracker?.stop();
            clearTimeout(this.timer);
            this.abort?.abort();
        }
        start() {
            this.stop(); this.active = true; this.best = null; this.accepted = false;
            this.abort = new AbortController();
            const controller = this.abort;
            const options = this.options;
            const finish = async () => {
                if (!this.active || this.abort !== controller || this.finishing) return;
                this.finishing = true; this.tracker?.stop(); clearTimeout(this.timer);
                if (this.accepted) { this.stop(); return; }
                // Browser coordinate attributes can be prototype getters, not enumerable fields.
                const coords = this.best?.coords;
                let area = this.best && Date.now() - this.best.timestamp < 30000
                    ? {latitude:coords.latitude, longitude:coords.longitude, accuracy:coords.accuracy, label:''} : null;
                if (!area || area.accuracy > 5000) {
                    options.onState?.({state:'searching', message:'Finding the nearest area…'});
                    const timeout = setTimeout(() => controller.abort(), 10000);
                    try {
                        const ip = await (options.lookupIpArea || lookupIpArea)({signal:controller.signal});
                        // A known device estimate beats an IP location with unknown precision.
                        if (!area || (ip.accuracy && ip.accuracy < area.accuracy)) area = ip;
                    } catch { /* Search and manual pin placement remain available. */ }
                    finally { clearTimeout(timeout); }
                }
                if (!this.active || this.abort !== controller) return;
                if (area) options.onApproximate?.(area);
                options.onState?.({state:area?'approximate':'unavailable',message:area?'Approximate area. Check the map and tap your exact spot.':'Location unavailable. Search a place or tap the map.'});
                this.stop();
            };
            this.finishing = false;
            this.tracker = new Tracker({...options, waitMs:30000,
                onPosition:position=>{
                    if (!this.active) return;
                    this.accepted = true; options.onPosition?.(position);
                    options.onState?.({state:'tracking',message:`Location found · about ${Math.round(position.coords.accuracy)} m accuracy. Check the pin.`});
                    if (position.coords.accuracy <= 20) this.stop();
                },
                onApproximate:position=>{
                    if (!this.active || this.accepted) return;
                    if (!this.best || position.coords.accuracy < this.best.coords.accuracy) this.best=position;
                },
                onState:state=>{
                    if (!this.active || this.accepted) return;
                    if (['denied','unsupported','insecure','unavailable','timeout'].includes(state.state)) void finish();
                    else options.onState?.({state:'searching',message:'Finding your location… Allow access if asked.'});
                }});
            this.timer=setTimeout(finish,30000);
            this.tracker.start();
        }
    }

    return {Tracker, AutomaticLocator, parseIpArea, lookupIpArea};
});
