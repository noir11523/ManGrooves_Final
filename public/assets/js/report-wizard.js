(() => {
    'use strict';

    const form = document.querySelector('[data-report-wizard]');
    if (!form) return;

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
    const photoInput = form.querySelector('[data-photo-input]');
    const photoPreview = form.querySelector('[data-photo-preview]');
    const csrf = document.querySelector('meta[name="csrf-token"]')?.content || '';
    let currentStep = 1;
    let map = null;
    let marker = null;
    let manualMode = source?.value === 'manual';
    let previewObjectUrl = null;

    const setStep = (step) => {
        currentStep = Math.max(1, Math.min(3, step));
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
        const percentage = currentStep === 1 ? 33 : (currentStep === 2 ? 66 : 100);
        progress?.setAttribute('aria-valuenow', String(percentage));
        const bar = progress?.querySelector('.progress-bar');
        if (bar) bar.style.width = `${percentage}%`;
        backButton.hidden = currentStep === 1;
        nextButton.hidden = currentStep === 3;
        submitButton.hidden = currentStep !== 3;
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
            if (!latitude.value || !longitude.value || !['gps', 'manual'].includes(source.value)) {
                return showFieldError(latitude, 'Capture your GPS location or place a manual map pin.');
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
        if (!Number.isFinite(parsedLat) || !Number.isFinite(parsedLng)) return;
        latitude.value = parsedLat.toFixed(8);
        longitude.value = parsedLng.toFixed(8);
        source.value = mode;
        accuracy.value = mode === 'gps' && Number.isFinite(Number(measuredAccuracy)) ? Number(measuredAccuracy).toFixed(2) : '';
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
            map.setView([parsedLat, parsedLng], 18);
        }
        locationStatus.textContent = mode === 'gps'
            ? `GPS captured${accuracy.value ? ` (±${Math.round(Number(accuracy.value))} m)` : ''}.`
            : 'Manual pin selected. Tap or drag the pin to refine it.';
    };

    if (window.L) {
        const initialLat = Number(latitude.value) || 10.2833;
        const initialLng = Number(longitude.value) || 123.8833;
        map = window.L.map(form.querySelector('[data-location-map]')).setView([initialLat, initialLng], latitude.value ? 18 : 15);
        window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 20,
            attribution: '&copy; OpenStreetMap contributors'
        }).addTo(map);
        if (latitude.value && longitude.value) setLocation(latitude.value, longitude.value, source.value || 'manual', accuracy.value);
        map.on('click', (event) => {
            if (manualMode) setLocation(event.latlng.lat, event.latlng.lng, 'manual');
        });
    } else {
        latitude.readOnly = false;
        longitude.readOnly = false;
        const manualCoordinates = () => {
            if (latitude.value && longitude.value) {
                source.value = 'manual';
                accuracy.value = '';
                locationStatus.textContent = 'Manual coordinates entered. Verify them carefully before submitting.';
            }
        };
        latitude.addEventListener('input', manualCoordinates);
        longitude.addEventListener('input', manualCoordinates);
        locationStatus.textContent = 'The map could not load. Enter coordinates manually or use live GPS.';
    }

    form.querySelector('[data-use-gps]')?.addEventListener('click', () => {
        if (!navigator.geolocation) {
            locationStatus.textContent = 'GPS is unavailable in this browser. Use a manual pin.';
            return;
        }
        locationStatus.textContent = 'Capturing an accurate GPS position…';
        navigator.geolocation.getCurrentPosition(
            (position) => setLocation(position.coords.latitude, position.coords.longitude, 'gps', position.coords.accuracy),
            (error) => {
                const messages = {
                    1: 'Location permission was denied. Allow it in browser settings or use a manual pin.',
                    2: 'A GPS position is unavailable. Move to an open area or use a manual pin.',
                    3: 'GPS capture timed out. Try again or use a manual pin.'
                };
                locationStatus.textContent = messages[error.code] || 'GPS capture failed. Use a manual pin.';
            },
            {enableHighAccuracy: true, timeout: 15000, maximumAge: 0}
        );
    });

    form.querySelector('[data-use-manual]')?.addEventListener('click', () => {
        manualMode = true;
        source.value = 'manual';
        accuracy.value = '';
        locationStatus.textContent = map
            ? 'Manual mode is active. Tap the exact observation spot on the map.'
            : 'Manual mode is active. Enter latitude and longitude carefully.';
        if (marker?.dragging) marker.dragging.enable();
    });

    const loadPreviousReports = async () => {
        const clusterId = clusterSelect?.value || '';
        const selectedParent = String(form.dataset.selectedParent || parentSelect?.value || '');
        parentSelect.innerHTML = '<option value="">Not a follow-up</option>';
        if (!clusterId) return;
        try {
            const endpoint = new URL(form.dataset.previousReportsUrl, window.location.href);
            endpoint.searchParams.set('cluster_id', clusterId);
            const response = await fetch(endpoint, {headers: {'Accept': 'application/json'}, credentials: 'same-origin'});
            const payload = await response.json();
            if (!response.ok || !payload.ok) throw new Error(payload.message || 'Unable to load follow-ups.');
            payload.reports.forEach((report) => {
                const option = document.createElement('option');
                option.value = String(report.id);
                option.textContent = `${report.report_code} — ${report.health} (${new Date(report.submitted_at.replace(' ', 'T')).toLocaleDateString()})`;
                option.selected = String(report.id) === selectedParent;
                parentSelect.append(option);
            });
            form.dataset.selectedParent = '';
        } catch (error) {
            form.querySelector('[data-followup-help]').textContent = error.message;
        }
    };

    clusterSelect?.addEventListener('change', () => {
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
    const hasObservationConflict = () => selectedObservationCodes('negative_signs').includes('no_animals')
        && selectedObservationCodes('bio_indicators').length > 0;

    const observationInputs = [...form.querySelectorAll('[data-criteria-code] input')];
    const resolveObservationConflict = (changed) => {
        if (!changed.checked) return;
        if (changed.dataset.optionCode === 'no_animals') {
            form.querySelectorAll('[data-criteria-code="bio_indicators"] input:checked').forEach((input) => { input.checked = false; });
        } else if (changed.closest('[data-criteria-code]')?.dataset.criteriaCode === 'bio_indicators') {
            const noAnimals = form.querySelector('[data-option-code="no_animals"]');
            if (noAnimals) noAnimals.checked = false;
        }
    };

    let healthTimer = 0;
    const updateHealthPreview = () => {
        window.clearTimeout(healthTimer);
        healthTimer = window.setTimeout(async () => {
            const singleChoiceGroups = [...form.querySelectorAll('[data-criteria-code]')]
                .filter((group) => group.querySelector('input[type="radio"]'));
            if (!singleChoiceGroups.every((group) => group.querySelector('input:checked'))) return;
            const body = new FormData();
            body.append('csrf_token', csrf);
            observationInputs.filter((input) => input.checked).forEach((input) => body.append(input.name, input.value));
            const target = form.querySelector('[data-health-preview]');
            try {
                const response = await fetch(form.dataset.healthPreviewUrl, {method: 'POST', body, headers: {'Accept': 'application/json'}, credentials: 'same-origin'});
                const payload = await response.json();
                if (!response.ok || !payload.ok) throw new Error(payload.message || 'Preview unavailable.');
                const result = payload.classification;
                target.className = `alert border d-flex align-items-center justify-content-between gap-3 ${result.status === 'Healthy' ? 'alert-success' : (result.status === 'Stressed' ? 'alert-warning' : 'alert-danger')}`;
                target.innerHTML = `<span><strong>Preview: ${escapeHtml(result.status)}</strong><br><small>Canonical health ${result.health_score}/${result.health_max_score}; context ${result.context_score}; environment ${result.environmental_score} (separate)</small></span>`;
            } catch (error) {
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
    const updateSpeciesPreview = () => {
        window.clearTimeout(speciesTimer);
        speciesTimer = window.setTimeout(async () => {
            const fields = [...form.querySelectorAll('[data-species-trait]')];
            if (!fields.every((field) => field.value)) return;
            const body = new FormData();
            body.append('csrf_token', csrf);
            fields.forEach((field) => body.append(field.name, field.value));
            const target = form.querySelector('[data-species-preview]');
            try {
                const response = await fetch(form.dataset.speciesMatchUrl, {method: 'POST', body, headers: {'Accept': 'application/json'}, credentials: 'same-origin'});
                const payload = await response.json();
                if (!response.ok || !payload.ok) throw new Error(payload.message || 'Match preview unavailable.');
                if (!payload.best) {
                    target.innerHTML = '<strong>Needs manual identification.</strong> The ranked traits are not confident enough for an automatic suggestion.';
                    return;
                }
                const alternatives = payload.ranked.slice(1, 3).map((item) => `<em>${escapeHtml(item.scientific_name)}</em> (${Number(item.confidence).toFixed(0)}%)`).join(', ');
                target.innerHTML = `<strong>Best trait match:</strong> <em>${escapeHtml(payload.best.scientific_name)}</em> — ${Number(payload.best.confidence).toFixed(0)}%${alternatives ? `<br><small>Other ranked matches: ${alternatives}</small>` : ''}`;
            } catch (error) {
                target.textContent = error.message;
            }
        }, 250);
    };
    form.querySelectorAll('[data-species-trait]').forEach((field) => field.addEventListener('change', updateSpeciesPreview));
    updateSpeciesPreview();

    form.addEventListener('submit', (event) => {
        if (![1, 2, 3].every(validateStep) || !form.checkValidity()) {
            event.preventDefault();
            const invalid = form.querySelector(':invalid');
            const invalidPanel = invalid?.closest('[data-step-panel]');
            if (invalidPanel) setStep(Number(invalidPanel.dataset.stepPanel));
            invalid?.reportValidity();
            return;
        }
        submitButton.disabled = true;
        submitButton.innerHTML = '<span class="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>Submitting securely…';
    });

    setStep(1);
})();
