(function () {
    'use strict';

    function escapeHtml(value) {
        return String(value == null ? '' : value).replace(/[&<>'"]/g, function (character) {
            return {'&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'}[character];
        });
    }

    function initVerificationForms() {
        document.querySelectorAll('.js-verification-form').forEach(function (form) {
            var correctionFields = form.querySelector('.js-correction-fields');
            var rejectionHint = form.querySelector('.js-rejection-required');
            var feedback = form.querySelector('[name="expert_feedback"]');
            var attentionField = form.querySelector('.js-attention-field');
            var attentionCheckbox = form.querySelector('[name="needs_attention"]');

            function updateDecision() {
                var chosen = form.querySelector('[name="action"]:checked');
                var action = chosen ? chosen.value : 'confirm';
                if (correctionFields) {
                    correctionFields.hidden = action !== 'correct';
                    correctionFields.querySelectorAll('select, input').forEach(function (field) {
                        field.disabled = action !== 'correct';
                    });
                }
                if (feedback) {
                    feedback.required = action === 'reject';
                }
                if (rejectionHint) {
                    rejectionHint.hidden = action !== 'reject';
                }
                if (attentionField) {
                    attentionField.hidden = action === 'reject';
                }
                if (attentionCheckbox) {
                    attentionCheckbox.disabled = action === 'reject';
                }
            }

            form.querySelectorAll('[name="action"]').forEach(function (radio) {
                radio.addEventListener('change', updateDecision);
            });
            form.addEventListener('submit', function (event) {
                var chosen = form.querySelector('[name="action"]:checked');
                if (chosen && chosen.value === 'reject' && feedback && !feedback.value.trim()) {
                    event.preventDefault();
                    feedback.setCustomValidity('Explain why this report is being rejected.');
                    feedback.reportValidity();
                    feedback.focus();
                    return;
                }
                if (feedback) {
                    feedback.setCustomValidity('');
                }
                var message = chosen && chosen.value === 'reject'
                    ? 'Reject this report and send the feedback to the guardian?'
                    : 'Save this expert decision?';
                if (!window.confirm(message)) {
                    event.preventDefault();
                }
            });
            if (feedback) {
                feedback.addEventListener('input', function () { feedback.setCustomValidity(''); });
            }
            updateDecision();
        });
    }

    function initConfirmForms() {
        document.querySelectorAll('.js-confirm-form').forEach(function (form) {
            form.addEventListener('submit', function (event) {
                if (!window.confirm(form.dataset.confirm || 'Continue with this action?')) {
                    event.preventDefault();
                }
            });
        });
    }

    function tileLayer(map) {
        return window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '&copy; OpenStreetMap contributors'
        }).addTo(map);
    }

    function initReportMap() {
        var element = document.getElementById('report-map');
        if (!element || !window.L) return;
        var lat = Number(element.dataset.lat);
        var lng = Number(element.dataset.lng);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
        var map = window.L.map(element).setView([lat, lng], 17);
        tileLayer(map);
        window.L.marker([lat, lng]).addTo(map).bindPopup(escapeHtml(element.dataset.label || 'Report location')).openPopup();
    }

    function healthColor(health) {
        if (health === 'Healthy') return '#2d7a3e';
        if (health === 'Stressed') return '#d69e2e';
        if (health === 'At Risk') return '#c53030';
        return '#718096';
    }

    function initAnalytics() {
        var data = window.mangroovesAnalytics;
        if (!data) return;

        if (window.Chart) {
            var healthCanvas = document.getElementById('health-chart');
            if (healthCanvas) {
                new window.Chart(healthCanvas, {
                    type: 'doughnut',
                    data: {labels: data.health.labels, datasets: [{data: data.health.values, backgroundColor: ['#2d7a3e', '#d69e2e', '#c53030']}]},
                    options: {responsive: true, plugins: {legend: {position: 'bottom'}}}
                });
            }
            var growthCanvas = document.getElementById('growth-chart');
            if (growthCanvas) {
                var canViewSurvival = Boolean(data.capabilities && data.capabilities.canViewSurvival);
                var growthDatasets = [];
                var growthScales;
                if (canViewSurvival) {
                    growthDatasets.push({label: 'Average survival (%)', data: data.growth.survival, borderColor: '#2d7a3e', backgroundColor: 'rgba(45,122,62,.15)', yAxisID: 'y', tension: 0.25, spanGaps: true});
                    growthDatasets.push({label: 'Verified reports', data: data.growth.verified, borderColor: '#805ad5', backgroundColor: 'rgba(128,90,213,.15)', yAxisID: 'y1', tension: 0.25});
                    growthScales = {y: {beginAtZero: true, title: {display: true, text: 'Survival %'}}, y1: {beginAtZero: true, position: 'right', grid: {drawOnChartArea: false}, ticks: {precision: 0}, title: {display: true, text: 'Reports'}}};
                } else {
                    growthDatasets.push({label: 'Verified reports', data: data.growth.verified, borderColor: '#805ad5', backgroundColor: 'rgba(128,90,213,.15)', yAxisID: 'y', tension: 0.25, fill: true});
                    growthScales = {y: {beginAtZero: true, ticks: {precision: 0}, title: {display: true, text: 'Reports'}}};
                }
                new window.Chart(growthCanvas, {
                    type: 'line',
                    data: {
                        labels: data.growth.labels,
                        datasets: growthDatasets
                    },
                    options: {responsive: true, interaction: {mode: 'index', intersect: false}, scales: growthScales}
                });
            }
            var verificationCanvas = document.getElementById('verification-chart');
            if (verificationCanvas) {
                new window.Chart(verificationCanvas, {
                    type: 'bar',
                    data: {labels: data.verification.labels, datasets: [{label: 'Reports', data: data.verification.values, backgroundColor: ['#d69e2e', '#2d7a3e', '#c53030']}]},
                    options: {responsive: true, indexAxis: 'y', plugins: {legend: {display: false}}, scales: {x: {beginAtZero: true, ticks: {precision: 0}}}}
                });
            }
        }

        var mapElement = document.getElementById('analytics-map');
        if (mapElement && window.L) {
            var map = window.L.map(mapElement).setView([10.3157, 123.8854], 11);
            tileLayer(map);
            var bounds = [];
            data.map.forEach(function (cluster) {
                if (!Number.isFinite(Number(cluster.lat)) || !Number.isFinite(Number(cluster.lng))) return;
                var point = [Number(cluster.lat), Number(cluster.lng)];
                bounds.push(point);
                var popup = '<strong>' + escapeHtml(cluster.code) + ' — ' + escapeHtml(cluster.name) + '</strong>' +
                    '<br>' + escapeHtml(cluster.barangay) +
                    '<br>Health: ' + escapeHtml(cluster.health || 'Unknown') +
                    '<br>Species: ' + escapeHtml(cluster.species || 'Unassigned');
                if (data.capabilities && data.capabilities.canViewSurvival) {
                    var survival = cluster.survival == null ? 'N/A' : Number(cluster.survival).toFixed(1) + '%';
                    popup += '<br>Survival: ' + escapeHtml(survival);
                }
                popup += '<br><a href="' + escapeHtml(data.clusterUrl + cluster.id) + '">Open timeline</a>';
                window.L.circleMarker(point, {radius: 9, color: '#fff', weight: 2, fillColor: healthColor(cluster.health), fillOpacity: 0.9}).addTo(map).bindPopup(popup);
            });
            if (bounds.length) map.fitBounds(bounds, {padding: [30, 30], maxZoom: 16});
        }
    }

    function initCluster() {
        var data = window.mangroovesCluster;
        if (!data) return;
        var mapElement = document.getElementById('cluster-map');
        if (mapElement && window.L) {
            var center = [Number(data.map.lat), Number(data.map.lng)];
            var map = window.L.map(mapElement).setView(center, 17);
            tileLayer(map);
            window.L.circle(center, {radius: Number(data.map.radius) || 75, color: '#2d7a3e', fillColor: '#68a357', fillOpacity: 0.18}).addTo(map);
            window.L.marker(center).addTo(map).bindPopup(escapeHtml(data.map.name)).openPopup();
        }
        var canvas = document.getElementById('cluster-survival-chart');
        if (canvas && window.Chart) {
            new window.Chart(canvas, {
                type: 'line',
                data: {labels: data.chart.labels, datasets: [{label: 'Survival (%)', data: data.chart.rates, borderColor: '#2d7a3e', backgroundColor: 'rgba(45,122,62,.15)', fill: true, tension: 0.25}]},
                options: {responsive: true, scales: {y: {beginAtZero: true, suggestedMax: 100, title: {display: true, text: 'Survival %'}}}, plugins: {tooltip: {callbacks: {afterLabel: function (context) {return 'Alive: ' + data.chart.alive[context.dataIndex];}}}}}
            });
        }
    }

    document.addEventListener('DOMContentLoaded', function () {
        initVerificationForms();
        initConfirmForms();
        initReportMap();
        initAnalytics();
        initCluster();
        document.querySelectorAll('.js-print-analytics').forEach(function (button) {
            button.addEventListener('click', function () { window.print(); });
        });
    });
})();
