import { AppError, paginate, manilaDate } from './domain.js';

export const newest = (a, b) => String(b.submitted_at ?? b.created_at).localeCompare(String(a.submitted_at ?? a.created_at)) || b.id - a.id;
export const needsReview = r => r.status === 'pending';
export const reportLabel = r => r.display_report_number || r.report_number ? `Report #${r.display_report_number || r.report_number}` : (r.report_code?.startsWith('Report #') ? r.report_code : `Report #${r.report_id ?? r.id}`);
export const displayHealth = r => r.final_health ?? r.suggested_health ?? 'Unknown';
export const verifiedNeedsAttention = r => r.status === 'verified' && ['Stressed', 'At Risk', 'Unknown'].includes(r.final_health ?? 'Unknown');
export function filterReports(rows, query = {}) {
  const validDate = value => /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`)) && new Date(`${value}T00:00:00Z`).toISOString().slice(0,10) === value;
  for (const key of ['date_from','date_to']) if (query[key] && !validDate(query[key])) throw new AppError('Choose valid dates.');
  if (query.date_from && query.date_to && query.date_from > query.date_to) throw new AppError('From must be on or before To.');
  return rows.filter(r => (!query.status || r.status === query.status)
    && (!query.health || displayHealth(r) === query.health)
    && (!query.cluster_id || r.cluster_id === Number(query.cluster_id))
    && (query.needs_attention !== '1' || verifiedNeedsAttention(r))
    && (query.verified_attention !== '1' || verifiedNeedsAttention(r))
    && (!query.date_from || manilaDate(r.submitted_at) >= query.date_from)
    && (!query.date_to || manilaDate(r.submitted_at) <= query.date_to)
    && (!String(query.q ?? '').trim() || `${reportLabel(r)} ${r.display_report_number?'':r.report_code ?? ''} ${r.guardian_name ?? ''} ${r.cluster_name ?? ''} ${r.sitio_name ?? ''} ${r.barangay_name ?? ''} ${r.species_local_name ?? ''} ${r.species_common_name ?? ''} ${r.final_species_name ?? r.suggested_species_name ?? ''}`.toLowerCase().includes(String(query.q).trim().toLowerCase())));
}
export function reportList(rows, query = {}) {
  return paginate(filterReports(rows, query)
    .sort(query.sort === 'oldest' ? (a,b)=>-newest(a,b) : newest).map(r => ({id: r.id, report_code: reportLabel(r), cluster_id: r.cluster_id,
      guardian_name: r.guardian_name,
      cluster_name: r.cluster_name, barangay_name: r.barangay_name, sitio_name: r.sitio_name,
      latitude: r.latitude, longitude: r.longitude, status: r.status, display_health: displayHealth(r),
      health: displayHealth(r), final_health: r.final_health, suggested_health: r.suggested_health,
      submitted_at: r.submitted_at, needs_attention: verifiedNeedsAttention(r) ? 1 : 0, needs_follow_up:!!r.needs_follow_up, active_child_id:r.active_child_id??null,
      can_follow_up:r.status==='verified'&&!!r.needs_follow_up&&!r.active_child_id&&!!r.cluster_id, species_local_name:r.species_local_name??null, species_common_name:r.species_common_name??null, species_name: r.final_species_name ?? r.suggested_species_name})), query.page);
}
export function dashboardStats(rows, clusters) {
  return {total_reports: rows.filter(r=>r.status==='verified').length, verified_reports: rows.filter(r => r.status === 'verified').length,
    pending_reports: rows.filter(r => r.status === 'pending').length, rejected_reports: rows.filter(r => r.status === 'rejected').length,
    needs_attention: rows.filter(verifiedNeedsAttention).length, map_clusters: clusters.length,
    species: new Set(rows.filter(r => r.status === 'verified' && r.final_species_id).map(r => r.final_species_id)).size};
}
export {analyticsForUser} from './monitoring-analytics.js';
export function badgeMetrics(rows) {
  const verified = rows.filter(r => r.status === 'verified');
  const first = verified.map(r => manilaDate(r.verified_at ?? r.submitted_at)).sort()[0];
  return {verified_reports: verified.length, verified_followups: verified.filter(r => r.parent_report_id).length,
    distinct_species: new Set(verified.map(r => r.final_species_id).filter(Boolean)).size,
    uncorrected_reports: verified.filter(r => !r.corrected).length,
    steward_days: first ? Math.max(0, Math.floor((Date.parse(manilaDate()) - Date.parse(first)) / 86400000) + 1) : 0};
}
