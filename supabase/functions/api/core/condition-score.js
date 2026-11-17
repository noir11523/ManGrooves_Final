// Only these three checks contribute to the six-point condition score.
export const HEALTH_CODES = ['leaf_color', 'pests', 'roots'];
const names = {leaf_color: 'Leaf color', pests: 'Pests', roots: 'Roots'};

export function conditionSummary(snapshots = []) {
  const checks = HEALTH_CODES.map(code => {
    const rows = snapshots.filter(row => row.criteria_code === code);
    const row = rows.length === 1 ? rows[0] : null;
    const scored = row && row.option_code !== 'unknown' &&
      Number.isInteger(row.points) && row.points >= 0 && row.points <= 2;
    return {code, name: row?.criteria_name || names[code], points: scored ? row.points : null, max_points: 2};
  });
  const answered = checks.filter(check => check.points !== null).length;
  const score = answered === 3 ? checks.reduce((sum, check) => sum + check.points, 0) : null;
  return {score, max_score: 6, answered, total_checks: 3, checks,
    condition: score === null ? 'Unknown' : score === 6 ? 'Healthy' : score >= 3 ? 'Stressed' : 'At Risk'};
}

export function canConfirmSuggestions(report, species) {
  return ['Healthy', 'Stressed', 'At Risk'].includes(report.suggested_health) &&
    Number.isSafeInteger(report.suggested_species_id) && report.suggested_species_id > 0 &&
    species.some(item => item.id === report.suggested_species_id && item.active !== 0 && !item.deleted_at &&
      String(item.scientific_name ?? '').trim() && !/^(unknown|unassigned)$/i.test(String(item.scientific_name).trim()));
}
