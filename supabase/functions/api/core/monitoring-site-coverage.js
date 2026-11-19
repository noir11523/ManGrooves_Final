// Backend-only coverage for NEW monitoring-site selection and placement.
// SQL Editor can update the existing meta/monitoring_site_coverage document.
// If it has not been configured, keep the thesis scope at Cebu City only.
export const monitoringSiteCoverageId = 'monitoring_site_coverage';

const normalized = value => String(value ?? '').normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '').trim().toLowerCase().replace(/\s+/g, ' ');

export function isMonitoringSiteAllowed(barangay, coverage = null) {
  if (normalized(barangay?.province) !== 'cebu') return false;
  if (coverage?.mode === 'province') return true;
  const cities = coverage?.mode === 'cities' && Array.isArray(coverage.cities)
    ? coverage.cities : ['Cebu City'];
  return cities.some(city => normalized(city) === normalized(barangay?.city_municipality));
}
