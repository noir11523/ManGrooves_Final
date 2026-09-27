(() => {
    'use strict';

    const form = document.querySelector('[data-report-wizard]');
    if (!form) return;

    form.querySelectorAll('[data-criteria-code]').forEach((group) => {
        const choices = [...group.querySelectorAll('input[type="checkbox"]')];
        const aggregate = (choice) => ['none_of_the_above', 'all_of_the_above'].includes(choice.dataset.optionCode);
        choices.forEach((choice) => choice.addEventListener('change', () => {
            if (!choice.checked) return;
            choices.forEach((other) => {
                if (other !== choice && (aggregate(choice) || aggregate(other))) other.checked = false;
            });
        }));
    });

    const escapeHtml = (value) => String(value).replace(/[&<>'"]/g, (character) => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#039;', '"': '&quot;'
    })[character]);

    const panels = [...form.querySelectorAll('[data-step-panel]')];
    const indicators = [...form.querySelectorAll('[data-step-indicator]')];
    const progress = form.querySelector('[data-wizard-progress]');
    const backButton = form.querySelector('[data-step-back]');
    const nextButton = form.querySelector('[data-step-next]');
    const submitButton = form.querySelector('[data-submit-report]');
    const latitude = form.querySelector('[data-latitude]');
    const longitude = form.querySelector('[data-longitude]');
    const accuracy = form.querySelector('[data-location-accuracy]');
    const source = form.querySelector('[data-location-source]');
    const locationStatus = form.querySelector('[data-location-status]');
    const clusterSelect = form.querySelector('[data-cluster-select]');
    const parentSelect = form.querySelector('[data-parent-report]');
    const followupToggle = form.querySelector('[data-followup-toggle]');
    const followupFields = form.querySelector('[data-followup-fields]');
    const followupToggleWrap = form.querySelector('[data-followup-toggle-wrap]');
    const summary = form.querySelector('[data-report-summary]');
    const exitLink = form.querySelector('[data-exit-report]');
    let submitting = false;
    let reviewed = false;
    const photoInput = form.querySelector('[data-photo-input]');
    const photoPreview = form.querySelector('[data-photo-preview]');
    const gpsButton = form.querySelector('[data-use-gps]');
    const saveLocationButton = form.querySelector('[data-save-location]');
    const cancelLocationButton = form.querySelector('[data-cancel-location]');
    const locationHelp = form.querySelector('[data-location-help]');
    const locationOptions = form.querySelector('[data-location-options]');
    const deviceAreaButton = form.querySelector('[data-show-device-area]');
    const ipAreaButton = form.querySelector('[data-show-ip-area]');
    const ipConsent = form.querySelector('[data-ip-area-consent]');
    const cancelAreaButton = form.querySelector('[data-cancel-area]');
    const areaStatus = form.querySelector('[data-area-status]');
    const maxGpsAccuracy = Math.max(10, Number(form.dataset.maxGpsAccuracy) || 100);
    const barangayCenter = [Number(form.dataset.centerLat) || 10.2833, Number(form.dataset.centerLng) || 123.8833];
    const csrf = document.querySelector('meta[name="csrf-token"]')?.content || '';
    let currentStep = 1;
    let map = null;
    let marker = null;
    let manualMode = source?.value === 'manual';
    let previewObjectUrl = null;
    let liveLocation = null;
    let accuracyCircle = null;
    let gpsNeedsRefresh = false;
    let locationChoiceMade = false;
    let previousLocation = null;
    let deviceArea = null;
    let areaCircle = null;
    let areaPending = false;
    let ipRequest = null;
    let ipTimeout = null;
    let ipGeneration = 0;

    const renderSummary = () => {
        if (!summary) return;
        const value = name => form.querySelector(`[name="${name}"]`)?.value?.trim() || 'None';
        const row = (label, text) => `<dt class="col-sm-4">${escapeHtml(label)}</dt><dd class="col-sm-8">${escapeHtml(text)}</dd>`;
        const card = (step, title, content) => `<div class="card mb-3"><div class="card-body"><div class="d-flex justify-content-between align-items-center mb-3"><h3 class="h6 mb-0">${title}</h3><button type="button" class="btn btn-sm btn-outline-success" data-edit-step="${step}">Edit ${title.toLowerCase()}</button></div>${content}</div></div>`;
        const site = row('Site', clusterSelect?.value ? clusterSelect.selectedOptions[0].textContent : 'New site')
            + row('Location name', value('sitio_name'))
            + row('Map pin', `${latitude.value}, ${longitude.value}`)
            + row('Location type', source.value === 'gps' ? `GPS (±${Math.ceil(Number(accuracy.value))} m)` : 'Manual pin')
            + row('Living mangroves', value('observed_alive_count'))
            + (parentSelect?.value ? row('Follow-up to', parentSelect.selectedOptions[0].textContent) : '');
        const health = [...form.querySelectorAll('[data-criteria-code]')].map(group => {
            const answers = [...group.querySelectorAll('input:checked')].map(input => group.querySelector(`label[for="${input.id}"]`)?.textContent.trim() || input.dataset.optionCode).join(', ');
            return row(group.querySelector('legend')?.textContent.trim() || group.dataset.criteriaCode.replaceAll('_', ' '), answers || 'None selected');
        }).join('');
        const details = row('Roots', value('root_type')) + row('Leaves', value('leaf_shape'))
            + row('Bark', value('bark_texture')) + row('Notes', value('guardian_remarks'));
        summary.innerHTML = card(1, 'Site', `${previewObjectUrl ? `<img class="img-fluid rounded mb-3" style="max-height:180px" src="${escapeHtml(previewObjectUrl)}" alt="Report photo">` : ''}<dl class="row mb-0">${site}</dl>`)
            + card(2, 'Health', `<dl class="row mb-0">${health}</dl>`)
            + card(3, 'Details', `<dl class="row mb-0">${details}</dl>`);
    };
    summary?.addEventListener('click', event => {
        const edit = event.target.closest('[data-edit-step]');
        if (edit && !submitting) setStep(Number(edit.dataset.editStep));
    });

    const setStep = (step) => {
        if (step !== 1 && liveLocation?.active && !freezeLiveLocation()) return;
        currentStep = Math.max(1, Math.min(4, step));
        panels.forEach((panel) => { panel.hidden = Number(panel.dataset.stepPanel) !== currentStep; });
        indicators.forEach((item) => {
            const active = Number(item.dataset.stepIndicator) === currentStep;
            item.classList.toggle('text-success', active);
            item.classList.toggle('fw-semibold', active);
            item.classList.toggle('text-body-secondary', !active);
            const badge = item.querySelector('.badge');
            badge?.classList.toggle('text-bg-success', active);
            badge?.classList.toggle('text-bg-secondary', !active);
        });
        const percentage = currentStep * 25;
        progress?.setAttribute('aria-valuenow', String(percentage));
        const bar = progress?.querySelector('.progress-bar');
        if (bar) bar.style.width = `${percentage}%`;
        backButton.hidden = currentStep === 1;
        nextButton.hidden = currentStep === 4;
        nextButton.textContent = currentStep === 3 ? 'Review report' : 'Continue';
        submitButton.hidden = currentStep !== 4;
        if (exitLink) exitLink.hidden = currentStep !== 1;
        if (currentStep === 4) { renderSummary(); reviewed = true; }
        else {
            reviewed = false;
            const confirmation = form.querySelector('[name="field_confirmation"]');
            if (confirmation) confirmation.checked = false;
        }
        if (currentStep === 1 && map) window.setTimeout(() => map.invalidateSize(), 0);
        panels.find((panel) => Number(panel.dataset.stepPanel) === currentStep)?.querySelector('h2')?.focus?.({preventScroll: true});
        window.scrollTo({top: 0, behavior: 'smooth'});
    };

    const showFieldError = (field, message) => {
        if (!field) return false;
        const fieldPanel = field.closest('[data-step-panel]');
        if (fieldPanel?.hidden) setStep(Number(fieldPanel.dataset.stepPanel));
        field.setCustomValidity(message);
        field.reportValidity();
        field.setCustomValidity('');
        field.focus();
        return false;
    };

    const validateStep = (step) => {
        const panel = panels.find((candidate) => Number(candidate.dataset.stepPanel) === step);
        if (!panel) return true;
        for (const control of panel.querySelectorAll('input, select, textarea')) {
            if (!control.checkValidity()) {
                if (panel.hidden) setStep(step);
                control.reportValidity();
                control.focus();
                return false;
            }
        }
        if (step === 1) {
            const count = form.querySelector('[name="observed_alive_count"]');
            if (count?.value && !clusterSelect?.value && Number(count.value) < 1) return showFieldError(count, 'A new site needs at least one living mangrove.');
            if (areaPending || ipRequest) {
                locationStatus.textContent = 'Place a pin at your site or cancel the area search.';
                return false;
            }
            if (liveLocation?.active && !liveLocation.isFresh()) {
                locationStatus.textContent = 'Wait for a clear location or place a pin.';
                return false;
            }
            if (!latitude.value || !longitude.value || !['gps', 'manual'].includes(source.value)) {
                return showFieldError(latitude, 'Capture your GPS location or place a manual map pin.');
            }
            if (source.value === 'gps') {
                if (gpsNeedsRefresh) {
                    locationStatus.textContent = 'Location expired. Try again or place a pin.';
                    return false;
                }
                const gpsAccuracy = Number(accuracy.value);
                if (accuracy.value.trim() === '' || !Number.isFinite(gpsAccuracy) || gpsAccuracy < 0 || gpsAccuracy > maxGpsAccuracy) {
                    return showFieldError(gpsButton, `Wait for GPS accuracy of ±${maxGpsAccuracy} m or better, or place the pin manually.`);
                }
            }
            if (!photoInput.files?.length) return showFieldError(photoInput, 'Take or choose a mangrove photo.');
            const file = photoInput.files[0];
            const allowed = ['image/jpeg', 'image/png', 'image/webp'];
            const maxBytes = Number(form.dataset.maxPhotoBytes || 5242880);
            if (file.type && !allowed.includes(file.type)) return showFieldError(photoInput, 'Choose a JPG, PNG, or WebP image.');
            if (file.size < 1 || file.size > maxBytes) return showFieldError(photoInput, `Choose a photo smaller than ${(maxBytes / 1048576).toFixed(1)} MB.`);
        }
        if (step === 2 && hasObservationConflict()) {
            return showFieldError(form.querySelector('[data-option-code="no_animals"]'), '“No Animals at All” conflicts with selected animal bio-indicators.');
        }
        return true;
    };

    nextButton?.addEventListener('click', () => {
        if (validateStep(currentStep)) setStep(currentStep + 1);
    });
    backButton?.addEventListener('click', () => setStep(currentStep - 1));

    const setLocation = (lat, lng, mode, measuredAccuracy = '') => {
        const parsedLat = Number(lat);
        const parsedLng = Number(lng);
        if (String(lat).trim() === '' || String(lng).trim() === ''
            || !Number.isFinite(parsedLat) || !Number.isFinite(parsedLng)
            || Math.abs(parsedLat) > 90 || Math.abs(parsedLng) > 180) return;
        cancelIpLookup();
        clearAreaPreview();
        if (mode === 'manual') {
            stopGpsCapture();
            gpsNeedsRefresh = false;
        }
        latitude.value = parsedLat.toFixed(8);
        longitude.value = parsedLng.toFixed(8);
        source.value = mode;
        accuracy.value = mode === 'gps'
            && String(measuredAccuracy).trim() !== ''
            && Number.isFinite(Number(measuredAccuracy))
            ? Number(measuredAccuracy).toFixed(2)
            : '';
        manualMode = mode === 'manual';
        if (map && window.L) {
            if (!marker) {
                const pinIcon = window.L.divIcon({
                    className: '',
                    html: '<span aria-hidden="true" style="display:block;width:24px;height:24px;border:3px solid #fff;border-radius:50% 50% 50% 0;background:#2D5A27;box-shadow:0 2px 7px rgba(0,0,0,.35);transform:rotate(-45deg)"></span>',
                    iconSize: [24, 24],
                    iconAnchor: [12, 22]
                });
                marker = window.L.marker([parsedLat, parsedLng], {draggable: manualMode, icon: pinIcon}).addTo(map);
                marker.on('dragend', () => {
                    const point = marker.getLatLng();
                    setLocation(point.lat, point.lng, 'manual');
                });
            }
            marker.setLatLng([parsedLat, parsedLng]);
            if (marker.dragging) manualMode ? marker.dragging.enable() : marker.dragging.disable();
            if (accuracyCircle) {
                map.removeLayer(accuracyCircle);
                accuracyCircle = null;
            }
            if (mode === 'gps' && accuracy.value !== '') {
                accuracyCircle = window.L.circle([parsedLat, parsedLng], {
                    radius: Number(accuracy.value), color: '#2D5A27', weight: 1, fillOpacity: 0.10, interactive: false
                }).addTo(map);
            }
            map.setView([parsedLat, parsedLng], 18);
        }
        locationStatus.textContent = mode === 'gps'
            ? `Location captured${accuracy.value ? ` (estimated ±${Math.ceil(Number(accuracy.value))} m)` : ''}.`
            : 'Manual pin selected. Tap or drag the pin to refine it.';
    };

    // Keep restored form input honest even if map tiles/Leaflet are unavailable.
    if (source.value === 'gps' && (accuracy.value.trim() === '' || !Number.isFinite(Number(accuracy.value))
        || Number(accuracy.value) < 0 || Number(accuracy.value) > maxGpsAccuracy)) {
        latitude.value = longitude.value = source.value = accuracy.value = '';
        locationStatus.textContent = 'Location was too approximate. Try again or place a pin.';
    }

    if (window.L) {
        const initialCluster = clusterSelect?.value ? clusterSelect.selectedOptions[0] : null;
        const initialLat = latitude.value !== '' ? Number(latitude.value) : Number(initialCluster?.dataset.lat ?? barangayCenter[0]);
        const initialLng = longitude.value !== '' ? Number(longitude.value) : Number(initialCluster?.dataset.lng ?? barangayCenter[1]);
        map = window.L.map(form.querySelector('[data-location-map]')).setView([initialLat, initialLng], latitude.value ? 18 : 15);
        window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '&copy; OpenStreetMap contributors'
        }).addTo(map);
        if (latitude.value && longitude.value) {
            setLocation(latitude.value, longitude.value, source.value || 'manual', accuracy.value);
        }
        map.on('click', (event) => {
            if (manualMode) setLocation(event.latlng.lat, event.latlng.lng, 'manual');
        });
    } else {
        latitude.readOnly = false;
        longitude.readOnly = false;
        const manualCoordinates = () => {
            locationChoiceMade = true;
            stopGpsCapture();
            cancelIpLookup();
            clearAreaPreview();
            source.value = 'manual';
            accuracy.value = '';
            gpsNeedsRefresh = false;
            locationStatus.textContent = 'Coordinates saved. Check your pin before submitting.';
        };
        latitude.addEventListener('input', manualCoordinates);
        longitude.addEventListener('input', manualCoordinates);
        locationStatus.textContent = 'Map unavailable. Enter coordinates or use GPS.';
    }

    function areaControls() {
        if (deviceAreaButton) {
            deviceAreaButton.hidden = !deviceArea;
            deviceAreaButton.disabled = !map || Boolean(ipRequest);
        }
        if (ipAreaButton) ipAreaButton.disabled = !map || !ipConsent?.checked || Boolean(ipRequest);
        if (cancelAreaButton) cancelAreaButton.hidden = !areaPending && !ipRequest;
    }

    function cancelIpLookup() {
        ipGeneration += 1;
        ipRequest?.abort();
        ipRequest = null;
        if (ipTimeout !== null) window.clearTimeout(ipTimeout);
        ipTimeout = null;
        areaControls();
    }

    function clearAreaPreview() {
        if (areaCircle && map) map.removeLayer(areaCircle);
        areaCircle = null;
        areaPending = false;
        areaControls();
    }

    function showApproximateArea(area, label) {
        if (!map) {
            if (areaStatus) areaStatus.textContent = 'Map unavailable. Enter coordinates or retry GPS.';
            return;
        }
        stopGpsCapture();
        clearAreaPreview();
        areaPending = true;
        locationChoiceMade = true;
        manualMode = true;
        marker?.dragging?.enable();
        if (area.accuracy !== null) {
            areaCircle = window.L.circle([area.latitude, area.longitude], {
                radius: area.accuracy, color: '#b36b00', weight: 2, dashArray: '6 6', fillOpacity: 0.07, interactive: false
            }).addTo(map);
            map.fitBounds(areaCircle.getBounds(), {maxZoom: 16, padding: [24, 24]});
        } else {
            map.setView([area.latitude, area.longitude], 10);
        }
        const uncertainty = area.accuracy === null ? 'accuracy unknown'
            : `estimated radius ${area.accuracy >= 1000 ? `${(area.accuracy / 1000).toFixed(1)} km` : `${Math.ceil(area.accuracy)} m`}`;
        const message = `${label} (${uncertainty}). Tap your actual site to place a pin.`;
        if (areaStatus) areaStatus.textContent = message;
        locationStatus.textContent = message;
        areaControls();
    }

    deviceAreaButton?.addEventListener('click', () => {
        if (!deviceArea || !map) return;
        if (Date.now() - deviceArea.timestamp > 300000) {
            deviceArea = null;
            areaControls();
            areaStatus.textContent = 'Area estimate expired. Try again.';
            return;
        }
        cancelIpLookup();
        showApproximateArea({latitude: deviceArea.coords.latitude, longitude: deviceArea.coords.longitude, accuracy: deviceArea.coords.accuracy}, 'Approximate area');
    });

    ipConsent?.addEventListener('change', () => {
        if (!ipConsent.checked) {
            cancelIpLookup();
            clearAreaPreview();
            if (areaStatus) areaStatus.textContent = 'Internet area search is off. You can place a pin.';
            if (!liveLocation?.active) locationStatus.textContent = latitude.value && longitude.value ? 'Your pin is saved.' : 'No location selected.';
        }
        areaControls();
    });
    ipAreaButton?.addEventListener('click', async () => {
        if (!ipConsent?.checked || !map || ipRequest) return;
        locationChoiceMade = true;
        stopGpsCapture();
        cancelIpLookup();
        clearAreaPreview();
        if (!window.ManGroovesLiveLocation?.lookupIpArea || !window.AbortController) {
            areaStatus.textContent = 'Area search unavailable. Place a pin.';
            return;
        }
        const requestGeneration = ipGeneration;
        const controller = new window.AbortController();
        ipRequest = controller;
        areaControls();
        areaStatus.textContent = 'Finding your approximate area...';
        ipTimeout = window.setTimeout(() => controller.abort(), 10000);
        try {
            const area = await window.ManGroovesLiveLocation.lookupIpArea({signal: controller.signal});
            if (requestGeneration !== ipGeneration || controller.signal.aborted || !ipConsent.checked || document.hidden) return;
            showApproximateArea(area, `Approximate IP area${area.label ? `: ${area.label}` : ''}`);
        } catch (error) {
            if (requestGeneration === ipGeneration) {
                areaStatus.textContent = 'Area not found. Try GPS or place a pin.';
            }
        } finally {
            if (requestGeneration === ipGeneration) {
                ipRequest = null;
                window.clearTimeout(ipTimeout);
                ipTimeout = null;
                areaControls();
            }
        }
    });
    cancelAreaButton?.addEventListener('click', () => {
        cancelIpLookup();
        clearAreaPreview();
        if (map) map.setView(latitude.value && longitude.value
            ? [Number(latitude.value), Number(longitude.value)] : barangayCenter, latitude.value ? 18 : 15);
        areaStatus.textContent = 'Search canceled. Your pin is saved.';
        locationStatus.textContent = latitude.value && longitude.value ? 'Your pin is saved.' : 'No location selected.';
    });
    areaControls();
    if (!map && areaStatus) areaStatus.textContent = 'Map unavailable. Enter coordinates or use GPS.';

    function locationControls(active) {
        if (gpsButton) { gpsButton.hidden = active; gpsButton.disabled = false; }
        if (saveLocationButton) {
            saveLocationButton.hidden = !active;
            saveLocationButton.disabled = !liveLocation?.isFresh();
        }
        if (cancelLocationButton) cancelLocationButton.hidden = !active;
    }

    function stopGpsCapture() {
        liveLocation?.stop();
        locationControls(false);
    }

    function freezeLiveLocation() {
        if (!liveLocation?.isFresh()) return false;
        stopGpsCapture();
        gpsNeedsRefresh = false;
        previousLocation = null;
        locationStatus.textContent = `Location saved (±${Math.ceil(Number(accuracy.value))} m).`;
        return true;
    }

    if (window.ManGroovesLiveLocation) {
        liveLocation = new window.ManGroovesLiveLocation.Tracker({
            geolocation: navigator.geolocation,
            secure: window.isSecureContext,
            maxAccuracy: maxGpsAccuracy,
            onPosition: (position) => {
                gpsNeedsRefresh = false;
                deviceArea = null;
                setLocation(position.coords.latitude, position.coords.longitude, 'gps', position.coords.accuracy);
            },
            onApproximate: (position) => {
                deviceArea = position;
                areaControls();
                if (!liveLocation.isFresh() && locationOptions) locationOptions.open = true;
            },
            onState: (state) => {
                locationControls(state.active);
                if (state.position && !liveLocation.isFresh()) gpsNeedsRefresh = true;
                locationStatus.textContent = state.message;
                if (['denied', 'insecure', 'unsupported', 'unavailable', 'timeout'].includes(state.state) && locationHelp) {
                    locationHelp.open = true;
                    if (locationOptions) locationOptions.open = true;
                }
            }
        });
    }

    const startLiveLocation = () => {
        locationChoiceMade = true;
        cancelIpLookup();
        clearAreaPreview();
        deviceArea = null;
        areaControls();
        if (!liveLocation) {
            locationStatus.textContent = 'Location unavailable. Refresh or place a pin.';
            return;
        }
        previousLocation = {lat: latitude.value, lng: longitude.value, mode: source.value, accuracy: accuracy.value, needsRefresh: gpsNeedsRefresh};
        // Ignore map taps while live capture is choosing the point.
        manualMode = false;
        marker?.dragging?.disable();
        liveLocation.start();
    };
    gpsButton?.addEventListener('click', startLiveLocation);
    saveLocationButton?.addEventListener('click', freezeLiveLocation);
    cancelLocationButton?.addEventListener('click', () => {
        stopGpsCapture();
        if (previousLocation?.lat && previousLocation?.lng) {
            setLocation(previousLocation.lat, previousLocation.lng, previousLocation.mode, previousLocation.accuracy);
            gpsNeedsRefresh = previousLocation.needsRefresh;
            locationStatus.textContent = 'Canceled. Your pin is saved.';
        } else {
            latitude.value = longitude.value = source.value = accuracy.value = '';
            gpsNeedsRefresh = false;
            if (marker) { map.removeLayer(marker); marker = null; }
            if (accuracyCircle) { map.removeLayer(accuracyCircle); accuracyCircle = null; }
            locationStatus.textContent = 'Canceled. Choose a location when ready.';
        }
        previousLocation = null;
    });

    form.querySelector('[data-use-manual]')?.addEventListener('click', () => {
        stopGpsCapture();
        cancelIpLookup();
        clearAreaPreview();
        locationChoiceMade = true;
        manualMode = true;
        locationStatus.textContent = map
            ? 'Tap your site on the map.'
            : 'Enter your site coordinates.';
        if (marker?.dragging) marker.dragging.enable();
    });

    // Start automatically only with permission already granted, never over a restored/manual point.
    if (navigator.permissions && window.isSecureContext && !latitude.value && !longitude.value) {
        navigator.permissions.query({name: 'geolocation'}).then(permission => {
            if (permission.state === 'granted' && !locationChoiceMade && currentStep === 1
                && !document.hidden && !latitude.value && !longitude.value) startLiveLocation();
        }).catch(() => { /* Browsers without permission queries use the explicit button. */ });
    }

    let parentRequest = 0;
    const syncFollowup = () => {
        const enabled = Boolean(followupToggle?.checked);
        if (followupFields) followupFields.hidden = !enabled;
        if (parentSelect) {
            parentSelect.disabled = !enabled;
            parentSelect.required = enabled;
            if (!enabled) parentSelect.value = '';
        }
    };
    followupToggle?.addEventListener('change', syncFollowup);
    const loadPreviousReports = async () => {
        const request = ++parentRequest;
        const clusterId = clusterSelect?.value || '';
        const selectedParent = String(form.dataset.selectedParent || parentSelect?.value || '');
        parentSelect.innerHTML = '<option value="">Choose a report</option>';
        if (followupToggleWrap) followupToggleWrap.hidden = true;
        if (!clusterId) { syncFollowup(); return; }
        try {
            const endpoint = new URL(form.dataset.previousReportsUrl, window.location.href);
            endpoint.searchParams.set('cluster_id', clusterId);
            const response = await fetch(endpoint, {headers: {'Accept': 'application/json'}, credentials: 'same-origin'});
            const payload = await response.json();
            if (request !== parentRequest) return;
            if (!response.ok || !payload.ok) throw new Error(payload.message || 'Could not load follow-ups.');
            const reports = payload.reports || [];
            reports.forEach((report) => {
                const option = document.createElement('option');
                option.value = String(report.id);
                option.textContent = `${report.report_code} - ${report.health}`;
                option.selected = String(report.id) === selectedParent;
                parentSelect.append(option);
            });
            if (followupToggleWrap) followupToggleWrap.hidden = reports.length === 0;
            if (followupToggle) followupToggle.checked = reports.some(report => String(report.id) === selectedParent);
            form.dataset.selectedParent = '';
            syncFollowup();
        } catch (error) {
            if (request !== parentRequest) return;
            form.querySelector('[data-followup-help]').textContent = error.message;
            if (followupToggleWrap) followupToggleWrap.hidden = !selectedParent;
            if (followupToggle) followupToggle.checked = Boolean(selectedParent);
            syncFollowup();
        }
    };

    clusterSelect?.addEventListener('change', () => {
        form.dataset.selectedParent = '';
        if (followupToggle) followupToggle.checked = false;
        syncFollowup();
        const option = clusterSelect.selectedOptions[0];
        const centerLat = Number(option?.dataset.lat);
        const centerLng = Number(option?.dataset.lng);
        if (map && Number.isFinite(centerLat) && Number.isFinite(centerLng)) map.setView([centerLat, centerLng], 17);
        loadPreviousReports();
    });
    if (clusterSelect?.value) loadPreviousReports();

    photoInput?.addEventListener('change', () => {
        if (previewObjectUrl) URL.revokeObjectURL(previewObjectUrl);
        photoPreview.hidden = true;
        photoPreview.replaceChildren();
        const file = photoInput.files?.[0];
        if (!file) return;
        const maxBytes = Number(form.dataset.maxPhotoBytes || 5242880);
        if ((file.type && !['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) || file.size > maxBytes) {
            validateStep(1);
            return;
        }
        previewObjectUrl = URL.createObjectURL(file);
        const image = document.createElement('img');
        image.className = 'img-fluid rounded border';
        image.style.maxHeight = '320px';
        image.alt = 'Selected report photo preview';
        image.src = previewObjectUrl;
        photoPreview.append(image);
        photoPreview.hidden = false;
    });

    const selectedObservationCodes = (criteriaCode) => [...form.querySelectorAll(`[data-criteria-code="${criteriaCode}"] input:checked`)]
        .map((input) => input.dataset.optionCode || '');
    const hasObservationConflict = () => selectedObservationCodes('negative_signs')
        .some((code) => ['no_animals', 'all_of_the_above'].includes(code))
        && selectedObservationCodes('bio_indicators').some((code) => code !== 'none_of_the_above');

    const observationInputs = [...form.querySelectorAll('[data-criteria-code] input')];
    const resolveObservationConflict = (changed) => {
        if (!changed.checked) return;
        const group = changed.closest('[data-criteria-code]')?.dataset.criteriaCode;
        if (group === 'negative_signs' && ['no_animals', 'all_of_the_above'].includes(changed.dataset.optionCode)) {
            form.querySelectorAll('[data-criteria-code="bio_indicators"] input:checked').forEach((input) => {
                if (input.dataset.optionCode !== 'none_of_the_above') input.checked = false;
            });
        } else if (group === 'bio_indicators' && changed.dataset.optionCode !== 'none_of_the_above') {
            form.querySelectorAll('[data-criteria-code="negative_signs"] input:checked').forEach((input) => {
                if (['no_animals', 'all_of_the_above'].includes(input.dataset.optionCode)) input.checked = false;
            });
        }
    };

    let healthTimer = 0;
    let healthRequest = 0;
    const updateHealthPreview = () => {
        const request = ++healthRequest;
        const preview = form.querySelector('[data-health-preview]');
        preview.textContent = 'Checking your answers...';
        window.clearTimeout(healthTimer);
        healthTimer = window.setTimeout(async () => {
            const singleChoiceGroups = [...form.querySelectorAll('[data-criteria-code]')]
                .filter((group) => group.querySelector('input[type="radio"]'));
            if (!singleChoiceGroups.every((group) => group.querySelector('input:checked'))) { preview.textContent = 'Answer each checklist question to see the result.'; return; }
            const body = new FormData();
            body.append('csrf_token', csrf);
            observationInputs.filter((input) => input.checked).forEach((input) => body.append(input.name, input.value));
            const target = form.querySelector('[data-health-preview]');
            try {
                const response = await fetch(form.dataset.healthPreviewUrl, {method: 'POST', body, headers: {'Accept': 'application/json'}, credentials: 'same-origin'});
                const payload = await response.json();
                if (!response.ok || !payload.ok) throw new Error(payload.message || 'Preview unavailable.');
                if (request !== healthRequest) return;
                const result = payload.classification;
                target.className = `alert border d-flex align-items-center justify-content-between gap-3 ${result.status === 'Healthy' ? 'alert-success' : (result.status === 'Stressed' ? 'alert-warning' : 'alert-danger')}`;
                target.innerHTML = `<span><strong>Preview: ${escapeHtml(result.status)}</strong><br><small>Health score: ${result.health_score}/${result.health_max_score}<br>6 Healthy | 3-5 Stressed | 0-2 At Risk</small><br>${(result.breakdown || []).map(row => `<small>${escapeHtml(row.name)}: ${escapeHtml(row.answer)} (${Number(row.points)}/2)</small>`).join('<br>')}</span>`;
            } catch (error) {
                if (request !== healthRequest) return;
                target.className = 'alert alert-warning border';
                target.textContent = error.message;
            }
        }, 250);
    };
    observationInputs.forEach((input) => input.addEventListener('change', () => {
        resolveObservationConflict(input);
        updateHealthPreview();
    }));
    updateHealthPreview();

    let speciesTimer = 0;
    let speciesRequest = 0;
    const updateSpeciesPreview = () => {
        const request = ++speciesRequest;
        const target = form.querySelector('[data-species-preview]');
        target.textContent = 'Choose the roots, leaves and bark to see a match.';
        window.clearTimeout(speciesTimer);
        speciesTimer = window.setTimeout(async () => {
            const fields = [...form.querySelectorAll('[data-species-trait]')];
            if (!fields.every((field) => field.value)) return;
            const body = new FormData();
            body.append('csrf_token', csrf);
            fields.forEach((field) => body.append(field.name, field.value));
            target.textContent = 'Checking species...';
            try {
                const response = await fetch(form.dataset.speciesMatchUrl, {method: 'POST', body, headers: {'Accept': 'application/json'}, credentials: 'same-origin'});
                const payload = await response.json();
                if (!response.ok || !payload.ok) throw new Error(payload.message || 'Match preview unavailable.');
                if (request !== speciesRequest) return;
                if (!payload.best) {
                    target.innerHTML = '<strong>Species unclear.</strong> An expert can help identify it.';
                    return;
                }
                const alternatives = payload.ranked.slice(1, 3).map((item) => `<em>${escapeHtml(item.scientific_name)}</em> (${Number(item.confidence).toFixed(0)}%)`).join(', ');
                target.innerHTML = `<strong>Suggested species:</strong> <em>${escapeHtml(payload.best.scientific_name)}</em> — ${Number(payload.best.confidence).toFixed(0)}% trait match${alternatives ? `<br><small>Other matches: ${alternatives}</small>` : ''}`;
            } catch (error) {
                if (request !== speciesRequest) return;
                target.textContent = error.message;
            }
        }, 250);
    };
    form.querySelectorAll('[data-species-trait]').forEach((field) => field.addEventListener('change', updateSpeciesPreview));
    updateSpeciesPreview();

    form.addEventListener('submit', (event) => {
        if (submitting) { event.preventDefault(); return; }
        if (![1, 2, 3].every(validateStep)) { event.preventDefault(); return; }
        if (currentStep !== 4 || !reviewed) {
            event.preventDefault();
            setStep(4);
            return;
        }
        if (!validateStep(4) || !form.checkValidity()) { event.preventDefault(); return; }
        if (!window.confirm('Submit report? Check that your photo, location and answers are correct.')) {
            event.preventDefault();
            return;
        }
        submitting = true;
        submitButton.disabled = true;
        submitButton.innerHTML = '<span class="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>Submitting...';
    });

    document.addEventListener('visibilitychange', () => {
        if (document.hidden && ipRequest) {
            cancelIpLookup();
            if (areaStatus) areaStatus.textContent = 'Area search paused. Try again when ready.';
        }
        if (document.hidden && liveLocation?.active) {
            if (!freezeLiveLocation()) {
                if (source.value === 'gps') gpsNeedsRefresh = true;
                stopGpsCapture();
                locationStatus.textContent = 'Location paused. Try again to continue.';
            }
        }
    });
    window.addEventListener('pagehide', () => { stopGpsCapture(); cancelIpLookup(); });
    setStep(1);
})();
