import L from 'leaflet';
import { api, apiUrl } from './client.js';
export const $ = selector => document.querySelector(selector);
export const $$ = selector => [...document.querySelectorAll(selector)];
export const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[char]));
export const displayLabel = value => ({pending:'Pending',verified:'Verified',rejected:'Rejected',approved:'Approved',declined:'Declined',active:'Active',inactive:'Inactive',confirm:'Confirmed',correct:'Corrected',reject:'Rejected',auto_verify:'Verified automatically'}[value] ?? value ?? 'Not available');
export const reportStatus = report => report.status === 'pending' && (report.needs_attention === true || Number(report.needs_attention) === 1) ? 'Needs attention' : report.status;
export const pill = value => `<span class="pill ${esc(String(value).toLowerCase().replaceAll(' ', '-'))}">${esc(displayLabel(value))}</span>`;
export const field = (name, label, value = '', type = 'text', extra = '') => `<label class="field"><span>${esc(label)}</span><input name="${esc(name)}" type="${type}" value="${esc(value)}" ${extra}></label>`;
export const select = (name, label, options, value = '', extra = '') => `<label class="field"><span>${esc(label)}</span><select name="${esc(name)}" ${extra}>${options.map(([id, label]) => `<option value="${esc(id)}" ${String(id) === String(value ?? '') ? 'selected' : ''}>${esc(label)}</option>`).join('')}</select></label>`;
export const formValues = form => Object.fromEntries(new FormData(form));
export const errorBox = '<div class="error" role="alert"></div>';
export const showError = (element, message) => { element.textContent = message; element.scrollIntoView({block: 'nearest', behavior: 'smooth'}); };
export function toast(message) { const node = $('#toast'); node.textContent = message; node.hidden = false; clearTimeout(toast.timer); toast.timer = setTimeout(() => node.hidden = true, 5500); }
export function confirm(title, message) {
  return new Promise(resolve => {
    const dialog = $('#confirm'); $('#confirm-title').textContent = title; $('#confirm-body').textContent = message;
    dialog.returnValue = 'cancel'; dialog.addEventListener('close', () => resolve(dialog.returnValue === 'confirm'), {once: true}); dialog.showModal();
  });
}
export function pager(data, base, query = {}) {
  if (!(data.pages > 1)) return '';
  const route = page => `#${base}?${new URLSearchParams({...query, page})}`;
  return `<div class="pagination">${data.page > 1 ? `<a href="${esc(route(data.page - 1))}">← Previous</a>` : '<span></span>'}<small>Page ${data.page} of ${data.pages} · ${data.total} records</small>${data.page < data.pages ? `<a href="${esc(route(data.page + 1))}">Next →</a>` : '<span></span>'}</div>`;
}
export function reportRows(items) {
  if (!items.length) return '<p class="empty">No reports here yet.</p>';
  return `<div class="list">${items.map(r => `<a class="report-row" href="#report/${r.id}"><div><strong>${esc(r.report_code)}</strong><p>${esc(r.cluster_name ?? r.sitio_name ?? r.barangay_name)} · ${esc(r.display_health ?? r.final_health ?? r.suggested_health ?? '')}</p><small>${esc(r.submitted_at?.slice(0, 10))}</small></div>${pill(reportStatus(r))}</a>`).join('')}</div>`;
}
export const healthColor = health => ({Healthy: '#3f7f43', Stressed: '#cf961d', 'At Risk': '#c6513c'}[health] ?? '#788778');
export function mapPoint(item) {
  const values = [item.latitude ?? item.center_lat, item.longitude ?? item.center_lng];
  if (values.some(value => !['number','string'].includes(typeof value) || String(value).trim() === '')) return null;
  const [lat, lng] = values.map(Number);
  return Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 85.05112878 && Math.abs(lng) <= 180 ? [lat, lng] : null;
}
export function mapMarkers(canvas, items, {timelineMode = 'health', fit = true} = {}) {
  const bounds = [], markers = [];
  for (const item of items) {
    const point = mapPoint(item);
    if (!point) continue;
    bounds.push(point);
    const health = item.latest_health ?? item.display_health ?? item.final_health ?? item.suggested_health;
    const marker = L.circleMarker(point, {radius: 9, color: '#fff', weight: 2, fillOpacity: 1, fillColor: healthColor(health)}).addTo(canvas);
    markers.push(marker);
    const content = document.createElement('div');
    const title = document.createElement('strong'); title.textContent = item.name ?? item.report_code;
    const label = document.createElement('p'); label.textContent = health ?? 'Unknown';
    const link = document.createElement('a'); link.textContent = item.name ? (timelineMode==='growth'?'View growth timeline':'View health history') : 'View report'; link.href = item.name ? `#cluster/${item.id}?tab=${timelineMode}` : `#report/${item.id}`;
    content.append(title, label, link); marker.bindPopup(content);
    if (item.name) marker.on('mouseover', () => marker.openPopup());
  }
  if (fit && bounds.length) canvas.fitBounds(bounds, {padding: [30, 30], maxZoom: 16});
  return {bounds, markers};
}
export function map(container, items, {onClick, timelineMode = 'health', onTileError} = {}) {
  const canvas = L.map(container, {scrollWheelZoom: false}).setView([10.2833, 123.8833], 14);
  const tiles = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>', maxZoom: 19});
  if (onTileError) tiles.on('tileerror', onTileError);
  tiles.addTo(canvas);
  mapMarkers(canvas, items, {timelineMode});
  if (onClick) canvas.on('click', onClick);
  return canvas;
}
export async function privatePhoto(img, path) {
  try { const blob = await api(path, {blob: true}); const url = URL.createObjectURL(blob); img.src = url; img.onload = () => URL.revokeObjectURL(url); }
  catch { img.alt = 'Photo unavailable'; }
}
export function asset(path) { if (path.startsWith('../mobile-api/')) return apiUrl(path.slice('../mobile-api/'.length)); return new URL(`/assets/${path}`, location.origin).href; }
export async function download(path, name, query = {}) {
  const blob = await api(path, {blob: true, query}), url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 60000);
}
