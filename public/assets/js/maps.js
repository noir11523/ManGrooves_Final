(() => {
    'use strict';

    const escapeHtml = (value) => String(value ?? '').replace(/[&<>'"]/g, (character) => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#039;', '"': '&quot;'
    })[character]);
    const healthColor = (health) => ({Healthy: '#2D5A27', Stressed: '#d49b16', 'At Risk': '#b42318', Unknown: '#6c757d'})[health] || '#6c757d';
    const clusterHref = (id) => {
        const target = new URL('cluster.php', window.location.href);
        target.searchParams.set('id', id);
        return target.href;
    };

    const createMap = (element, center = [10.2833, 123.8833], zoom = 14) => {
        if (!window.L || element._mangroovesMap) return element._mangroovesMap || null;
        const map = window.L.map(element).setView(center, zoom);
        window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 20,
            attribution: '&copy; OpenStreetMap contributors'
        }).addTo(map);
        element._mangroovesMap = map;
        return map;
    };

    const markerLayer = (map) => window.L.layerGroup().addTo(map);
    const renderClusters = (map, layer, clusters) => {
        layer.clearLayers();
        const bounds = [];
        clusters.forEach((cluster) => {
            const lat = Number(cluster.latitude);
            const lng = Number(cluster.longitude);
            if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
            bounds.push([lat, lng]);
            const color = healthColor(cluster.latest_health);
            const marker = window.L.circleMarker([lat, lng], {radius: 10, color: '#fff', weight: 2, fillColor: color, fillOpacity: 0.95}).addTo(layer);
            marker.bindPopup(`<strong>${escapeHtml(cluster.name)}</strong><br>${escapeHtml(cluster.cluster_code)} · ${escapeHtml(cluster.barangay_name)}<br><span style="color:${color}">${escapeHtml(cluster.latest_health)}</span>${cluster.scientific_name ? `<br><em>${escapeHtml(cluster.scientific_name)}</em>` : ''}<br><a href="${escapeHtml(clusterHref(cluster.id))}">View timeline</a>`);
        });
        if (bounds.length === 1) map.setView(bounds[0], 17);
        else if (bounds.length > 1) map.fitBounds(bounds, {padding: [30, 30], maxZoom: 17});
    };

    document.querySelectorAll('[data-cluster-map]').forEach(async (element) => {
        const map = createMap(element);
        if (!map) return;
        const layer = markerLayer(map);
        element._mangroovesLayer = layer;
        const parent = element.closest('[data-explore-map]');
        const endpoint = element.dataset.clustersUrl || parent?.dataset.clustersUrl;
        if (!endpoint) return;
        try {
            const response = await fetch(endpoint, {headers: {'Accept': 'application/json'}, credentials: 'same-origin'});
            const payload = await response.json();
            if (!response.ok || !payload.ok) throw new Error(payload.message || 'Map data is unavailable.');
            renderClusters(map, layer, payload.clusters);
        } catch (error) {
            element.insertAdjacentHTML('afterend', `<div class="alert alert-warning mt-2">${escapeHtml(error.message)}</div>`);
        }
    });

    document.querySelectorAll('[data-single-cluster-map]').forEach((element) => {
        const lat = Number(element.dataset.lat);
        const lng = Number(element.dataset.lng);
        const map = createMap(element, [lat, lng], 17);
        if (!map) return;
        const color = healthColor(element.dataset.health);
        window.L.circle([lat, lng], {radius: 75, color, fillColor: color, fillOpacity: 0.2}).addTo(map);
        window.L.circleMarker([lat, lng], {radius: 10, color: '#fff', weight: 2, fillColor: color, fillOpacity: 1}).addTo(map).bindPopup(`<strong>${escapeHtml(element.dataset.name)}</strong><br>${escapeHtml(element.dataset.health)}`).openPopup();
    });

    const explore = document.querySelector('[data-explore-map]');
    if (explore) {
        const mapElement = explore.querySelector('[data-cluster-map]');
        const form = explore.querySelector('[data-species-search-form]');
        const input = explore.querySelector('[data-species-search]');
        const results = explore.querySelector('[data-species-results]');
        const count = explore.querySelector('[data-species-count]');

        const showSpecies = async (speciesId) => {
            const map = mapElement?._mangroovesMap;
            const layer = mapElement?._mangroovesLayer;
            if (!map || !layer) return;
            const endpoint = new URL(explore.dataset.speciesUrl, window.location.href);
            endpoint.searchParams.set('species_id', speciesId);
            const response = await fetch(endpoint, {headers: {'Accept': 'application/json'}, credentials: 'same-origin'});
            const payload = await response.json();
            if (response.ok && payload.ok) renderClusters(map, layer, payload.clusters);
        };

        const speciesCard = (item) => `<article class="card border-0 shadow-sm" data-species-card data-species-id="${Number(item.id)}"><div class="card-body"><div class="d-flex justify-content-between gap-2"><div><h3 class="h6 mb-1"><em>${escapeHtml(item.scientific_name)}</em></h3><p class="mb-1">${escapeHtml(item.common_name)}</p></div><span class="badge ${item.iucn_code === 'VU' ? 'text-bg-warning' : 'text-bg-success'} align-self-start">${escapeHtml(item.iucn_code || 'N/A')}</span></div><p class="small text-body-secondary mb-2">${escapeHtml(item.local_name || 'No recorded local name')} · ${escapeHtml(item.family || 'Family unlisted')}</p><p class="small mb-2"><strong>${Number(item.cluster_count)}</strong> monitored cluster${Number(item.cluster_count) === 1 ? '' : 's'}${item.cluster_names ? `: ${escapeHtml(item.cluster_names)}` : ''}</p><button class="btn btn-sm btn-outline-success" type="button" data-show-species="${Number(item.id)}">Show on map</button></div></article>`;

        explore.addEventListener('click', (event) => {
            const button = event.target.closest('[data-show-species]');
            if (button) showSpecies(button.dataset.showSpecies).catch(() => {});
        });
        form?.addEventListener('submit', async (event) => {
            event.preventDefault();
            const endpoint = new URL(explore.dataset.speciesUrl, window.location.href);
            endpoint.searchParams.set('q', input.value.trim());
            results.setAttribute('aria-busy', 'true');
            try {
                const response = await fetch(endpoint, {headers: {'Accept': 'application/json'}, credentials: 'same-origin'});
                const payload = await response.json();
                if (!response.ok || !payload.ok) throw new Error(payload.message || 'Search failed.');
                results.innerHTML = payload.species.length ? payload.species.map(speciesCard).join('') : '<div class="text-center text-body-secondary py-5">No species matched your search.</div>';
                count.textContent = `${payload.species.length} result${payload.species.length === 1 ? '' : 's'}`;
                const url = new URL(window.location.href);
                input.value.trim() ? url.searchParams.set('q', input.value.trim()) : url.searchParams.delete('q');
                history.replaceState({}, '', url);
            } catch (error) {
                results.innerHTML = `<div class="alert alert-warning">${escapeHtml(error.message)}</div>`;
            } finally {
                results.removeAttribute('aria-busy');
            }
        });
    }

    const reportTable = document.querySelector('[data-report-table]');
    const modalElement = document.querySelector('[data-report-modal]');
    if (reportTable && modalElement && window.bootstrap) {
        const modal = window.bootstrap.Modal.getOrCreateInstance(modalElement);
        const body = modalElement.querySelector('[data-report-modal-body]');
        const openReport = async (id) => {
            body.innerHTML = '<div class="text-center py-5"><div class="spinner-border text-success" role="status"><span class="visually-hidden">Loading…</span></div></div>';
            modal.show();
            const endpoint = new URL(reportTable.dataset.detailUrl, window.location.href);
            endpoint.searchParams.set('id', id);
            try {
                const response = await fetch(endpoint, {headers: {'Accept': 'application/json'}, credentials: 'same-origin'});
                const payload = await response.json();
                if (!response.ok || !payload.ok) throw new Error(payload.message || 'Unable to load the report.');
                body.innerHTML = payload.html;
                const current = new URL(window.location.href);
                current.searchParams.set('id', id);
                history.replaceState({}, '', current);
            } catch (error) {
                body.innerHTML = `<div class="alert alert-danger mb-0">${escapeHtml(error.message)}</div>`;
            }
        };
        reportTable.addEventListener('click', (event) => {
            const button = event.target.closest('[data-view-report]');
            if (button) openReport(button.dataset.viewReport);
        });
        modalElement.addEventListener('hidden.bs.modal', () => {
            const current = new URL(window.location.href);
            current.searchParams.delete('id');
            history.replaceState({}, '', current);
        });
        if (reportTable.dataset.openReport) openReport(reportTable.dataset.openReport);
    }
})();
