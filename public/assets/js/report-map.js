(() => {
    const element = document.querySelector('[data-submitted-map]');
    if (!element) return;
    if (!window.L) { element.textContent = 'Map unavailable. Use the report list below.'; return; }
    const map = L.map(element).setView([10.2833, 123.8833], 14);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>'}).addTo(map);
    const bounds = [];
    document.querySelectorAll('[data-report-point]').forEach(link => {
        const lat = Number(link.dataset.lat), lng = Number(link.dataset.lng);
        if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 85 || Math.abs(lng) > 180) return;
        bounds.push([lat, lng]);
        const popup = document.createElement('div');
        const title = document.createElement('strong'); title.textContent = link.dataset.code;
        const status = document.createElement('p'); status.textContent = `${link.dataset.status} · ${link.dataset.health}`;
        const open = document.createElement('a'); open.href = link.href; open.textContent = 'View report';
        popup.append(title, status, open);
        L.circleMarker([lat, lng], {radius: 10, weight: 2, color: '#fff', fillOpacity: .95, fillColor: {Healthy: '#2d5a27', Stressed: '#d49b16', 'At Risk': '#b42318'}[link.dataset.health] || '#777'}).addTo(map).bindPopup(popup);
    });
    if (bounds.length) map.fitBounds(bounds, {padding: [30, 30], maxZoom: 17});
})();
