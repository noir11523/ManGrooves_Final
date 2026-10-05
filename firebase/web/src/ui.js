import L from 'leaflet';
import { api } from './client.js';
export const $ = selector => document.querySelector(selector);
export const $$ = selector => [...document.querySelectorAll(selector)];
export const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[char]));
export const pill = value => `<span class="pill ${esc(String(value).toLowerCase().replaceAll(' ', '-'))}">${esc(value)}</span>`;
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
  const route = page => `#${base}?${new URLSearchParams({...query, page})}`;
  return `<div class="pagination">${data.page > 1 ? `<a href="${esc(route(data.page - 1))}">← Previous</a>` : '<span></span>'}<small>Page ${data.page} of ${data.pages} · ${data.total} records</small>${data.page < data.pages ? `<a href="${esc(route(data.page + 1))}">Next →</a>` : '<span></span>'}</div>`;
}
export function reportRows(items) {
  if (!items.length) return '<p class="empty">No reports here yet.</p>';
  return `<div class="list">${items.map(r => `<a class="report-row" href="#report/${r.id}"><div><strong>${esc(r.report_code)}</strong><p>${esc(r.cluster_name ?? r.sitio_name ?? r.barangay_name)} · ${esc(r.display_health ?? r.final_health ?? r.suggested_health ?? '')}</p><small>${esc(r.submitted_at?.slice(0, 10))}</small></div>${pill(r.status)}</a>`).join('')}</div>`;
}
export const healthColor = health => ({Healthy: '#3f7f43', Stressed: '#cf961d', 'At Risk': '#c6513c'}[health] ?? '#788778');
export function map(container, items, {large = false, onClick} = {}) {
  const canvas = L.map(container, {scrollWheelZoom: false}).setView([10.2833, 123.8833], 14);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>', maxZoom: 19}).addTo(canvas);
  const bounds = [];
  for (const item of items) {
    const lat = Number(item.latitude ?? item.center_lat), lng = Number(item.longitude ?? item.center_lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    bounds.push([lat, lng]);
    const health = item.latest_health ?? item.display_health ?? item.final_health ?? item.suggested_health;
    const marker = L.circleMarker([lat, lng], {radius: 9, color: '#fff', weight: 2, fillOpacity: 1, fillColor: healthColor(health)}).addTo(canvas);
    const content = document.createElement('div');
    const title = document.createElement('strong'); title.textContent = item.name ?? item.report_code;
    const label = document.createElement('p'); label.textContent = health ?? 'Unknown';
    const link = document.createElement('a'); link.textContent = item.name ? 'View timeline' : 'View report'; link.href = item.name ? `#cluster/${item.id}` : `#report/${item.id}`;
    content.append(title, label, link); marker.bindPopup(content);
    if (item.name) marker.on('mouseover', () => marker.openPopup());
  }
  if (bounds.length) canvas.fitBounds(bounds, {padding: [30, 30], maxZoom: 16});
  if (onClick) canvas.on('click', onClick);
  return canvas;
}
export async function privatePhoto(img, path) {
  try { const blob = await api(path, {blob: true}); const url = URL.createObjectURL(blob); img.src = url; img.onload = () => URL.revokeObjectURL(url); }
  catch { img.alt = 'Photo unavailable'; }
}
export function asset(path) { return new URL(`/assets/${path}`, location.origin).href; }
export async function download(path, name, query = {}) {
  const blob = await api(path, {blob: true, query}), url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 60000);
}
