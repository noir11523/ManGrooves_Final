import { AppError, paginate, manilaDate } from './domain.js';

export const newest = (a, b) => String(b.submitted_at ?? b.created_at).localeCompare(String(a.submitted_at ?? a.created_at)) || b.id - a.id;
export const displayHealth = r => r.final_health ?? r.suggested_health ?? 'Unknown';
export function reportList(rows, query = {}) {
  return paginate(rows.filter(r => (!query.status || r.status === query.status)
    && (!query.health || displayHealth(r) === query.health)
    && (!query.cluster_id || r.cluster_id === Number(query.cluster_id))
    && (query.needs_attention !== '1' || r.needs_attention === 1)
    && (!query.q || `${r.report_code} ${r.cluster_name ?? ''} ${r.sitio_name} ${r.barangay_name}`.toLowerCase().includes(String(query.q).toLowerCase())))
    .sort(newest).map(r => ({id: r.id, report_code: r.report_code, cluster_id: r.cluster_id,
      cluster_name: r.cluster_name, barangay_name: r.barangay_name, sitio_name: r.sitio_name,
      latitude: r.latitude, longitude: r.longitude, status: r.status, display_health: displayHealth(r),
      health: displayHealth(r), final_health: r.final_health, suggested_health: r.suggested_health,
      submitted_at: r.submitted_at, needs_attention: r.needs_attention, species_name: r.final_species_name ?? r.suggested_species_name})), query.page);
}
export function dashboardStats(rows, clusters) {
  return {total_reports: rows.length, verified_reports: rows.filter(r => r.status === 'verified').length,
    pending_reports: rows.filter(r => r.status === 'pending').length, rejected_reports: rows.filter(r => r.status === 'rejected').length,
    needs_attention: rows.filter(r => r.needs_attention === 1).length, map_clusters: clusters.length,
    species: new Set(rows.filter(r => r.status === 'verified' && r.final_species_id).map(r => r.final_species_id)).size};
}
export function analyticsForUser(user, rows, clusters, query = {}) {
  const today = manilaDate();
  const previous = new Date(`${today}T00:00:00Z`); previous.setUTCDate(1); previous.setUTCMonth(previous.getUTCMonth() - 11);
  let from = query.date_from || previous.toISOString().slice(0, 10), to = query.date_to || today;
  const validDate = s => /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(`${s}T00:00:00Z`)) && new Date(`${s}T00:00:00Z`).toISOString().slice(0, 10) === s;
  if (!validDate(from) || !validDate(to)) throw new AppError('Choose valid dates.');
  if (from > to) [from, to] = [to, from];
  const filtered = rows.filter(r => manilaDate(r.submitted_at) >= from && manilaDate(r.submitted_at) <= to
    && (!query.barangay_id || r.barangay_id === Number(query.barangay_id))
    && (!query.species_id || r.final_species_id === Number(query.species_id)));
  const verified = filtered.filter(r => r.status === 'verified').sort(newest);
  const health = {Healthy: 0, Stressed: 0, 'At Risk': 0};
  for (const r of verified) if (Object.hasOwn(health, r.final_health)) health[r.final_health]++;
  const latest = new Map();
  for (const r of verified) if (r.cluster_id && !latest.has(r.cluster_id)) latest.set(r.cluster_id, r);
  const canSurvive = user.role === 'system_admin';
  let alive = 0, initial = 0;
  const visibleClusters = clusters.filter(c => latest.has(c.id)).map(c => {
    const r = latest.get(c.id), eligible = c.initial_seedlings > 0 && r.observed_alive_count != null;
    if (eligible) { initial += c.initial_seedlings; alive += Math.min(c.initial_seedlings, r.observed_alive_count); }
    return {id: c.id, name: c.name, latitude: c.center_lat, longitude: c.center_lng, barangay_name: c.barangay_name,
      latest_health: r.final_health, ...(canSurvive ? {initial_seedlings: c.initial_seedlings, observed_alive_count: r.observed_alive_count,
        survival_rate: eligible ? Math.round(Math.min(100, r.observed_alive_count / c.initial_seedlings * 100) * 10) / 10 : null} : {})};
  });
  const months = new Map();
  for (const r of verified) {
    const key = manilaDate(r.submitted_at).slice(0, 7);
    if (!months.has(key)) months.set(key, {month: key, month_label: new Date(`${key}-01T00:00:00Z`).toLocaleDateString('en', {month: 'short', year: 'numeric', timeZone: 'UTC'}), verified_reports: 0, report_count: 0, reports: 0});
    const m = months.get(key); m.verified_reports++; m.report_count++; m.reports++;
  }
  if (canSurvive) for (const [key, month] of months) {
    const selected = new Map();
    for (const r of verified.filter(r => manilaDate(r.submitted_at).slice(0, 7) <= key)) if (r.cluster_id && !selected.has(r.cluster_id)) selected.set(r.cluster_id, r);
    let denominator = 0, numerator = 0;
    for (const c of clusters) {
      const r = selected.get(c.id);
      if (r && c.initial_seedlings > 0 && r.observed_alive_count != null) { denominator += c.initial_seedlings; numerator += Math.min(c.initial_seedlings, r.observed_alive_count); }
    }
    month.survival_rate = denominator ? Math.round(numerator / denominator * 1000) / 10 : null;
  }
  const high_risk = verified.filter(r => r.final_health === 'At Risk' || r.needs_attention === 1).map(r => ({id: r.id, report_code: r.report_code,
    cluster_name: r.cluster_name, final_health: r.final_health, barangay_name: r.barangay_name}));
  return {scope: user.role === 'guardian' ? 'personal' : 'all_users', capabilities: {can_view_survival: canSurvive, can_export_pdf: canSurvive},
    filters: {date_from: from, date_to: to, barangay_id: query.barangay_id ?? null, species_id: query.species_id ?? null},
    verification: {total: filtered.length, pending: filtered.filter(r => r.status === 'pending').length,
      verified: verified.length, rejected: filtered.filter(r => r.status === 'rejected').length,
      corrected: verified.filter(r => r.corrected).length}, health, clusters: visibleClusters,
    map: visibleClusters, growth: [...months.values()].sort((a, b) => a.month.localeCompare(b.month)), high_risk, high_risk_total: high_risk.length,
    ...(canSurvive ? {overall_survival: initial ? Math.round(alive / initial * 1000) / 10 : null,
      survival_eligible_clusters: visibleClusters.filter(c => c.survival_rate !== null).length} : {})};
}
export function badgeMetrics(rows) {
  const verified = rows.filter(r => r.status === 'verified');
  const first = verified.map(r => manilaDate(r.verified_at ?? r.submitted_at)).sort()[0];
  return {verified_reports: verified.length, verified_followups: verified.filter(r => r.parent_report_id).length,
    distinct_species: new Set(verified.map(r => r.final_species_id).filter(Boolean)).size,
    uncorrected_reports: verified.filter(r => !r.corrected).length,
    steward_days: first ? Math.max(0, Math.floor((Date.parse(manilaDate()) - Date.parse(first)) / 86400000) + 1) : 0};
}
