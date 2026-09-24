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
            this.waitMs = 60000;
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
                this.emit('insecure', 'Live location needs HTTPS or localhost. Open the secure site, or choose your observation point manually.');
                return;
            }
            if (!this.geolocation) {
                this.emit('unsupported', 'This browser does not offer device location. Choose your observation point manually.');
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
                    this.emit('approximate', `Approximate reading: ±${Math.ceil(coords.accuracy)} m. Still checking for a better fix. You can show the approximate device area and place the actual observation pin manually.`);
                    return;
                }
                // Use the latest accurate position, not an older "best" one: the user may move.
                this.position = position;
                this.deadline = this.now() + this.waitMs;
                this.onPosition(position);
                this.emit('tracking', `Location updating (estimated ±${Math.ceil(coords.accuracy)} m). Choose “Use this location” at your observation site.`);
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
                            this.finish('denied', 'Location access was denied. Allow location for this site and in Windows Settings, then retry.');
                        }
                    }, {enableHighAccuracy: false, maximumAge: 0, timeout: 15000});
                } catch (error) { /* Keep the primary watch running if the optional request fails. */ }
            };
            this.emit('searching', 'Allow location access if prompted. Finding a fresh, accurate location…');
            this.timerId = this.setInterval(() => {
                if (!this.active || generation !== this.generation) return;
                if (this.now() >= this.deadline) {
                    const message = this.position
                        ? 'Live updates stopped: no recent accurate reading. Capture again before choosing this location.'
                        : this.bestAccuracy !== null
                            ? `This device returned only an approximate ±${Math.ceil(this.bestAccuracy)} m location. Check Location help, retry, or select the actual observation point manually.`
                            : 'No fresh location was received. Check Location help, then retry or select the actual observation point manually.';
                    this.finish('timeout', message);
                } else if (!this.isFresh()) {
                    if (this.now() >= alternativeAt) requestAlternative();
                    if (!this.active || this.isFresh()) return;
                    const seconds = Math.max(1, Math.ceil((this.deadline - this.now()) / 1000));
                    this.emit(this.position ? 'stale' : 'searching', this.position
                        ? `The last reading is no longer live. Waiting for a fresh reading (${seconds}s remaining)…`
                        : `Waiting for accuracy of ±${this.maxAccuracy} m or better${this.bestAccuracy !== null ? `; best estimate ±${Math.ceil(this.bestAccuracy)} m` : ''} (${seconds}s remaining)…`);
                }
            }, 1000);
            try {
                const watchId = this.geolocation.watchPosition(receive, error => {
                    if (!this.active || generation !== this.generation) return;
                    if (error.code === 1) {
                        this.finish('denied', 'Location access was denied. Allow location for this site and in Windows Settings, then retry.');
                    } else {
                        // A watch continues after transient unavailable/timeout errors; allow it to recover.
                        this.emit('retrying', 'The device has not provided a fresh position yet. Still trying; check Location help if this continues.');
                        requestAlternative();
                    }
                }, {enableHighAccuracy: true, maximumAge: 0, timeout: 15000});
                if (this.active && generation === this.generation) this.watchId = watchId;
                else this.geolocation.clearWatch(watchId);
            } catch (error) {
                this.finish('unavailable', 'Location could not start. Check browser and Windows location permissions, then retry.');
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

    return {Tracker, parseIpArea, lookupIpArea};
});
