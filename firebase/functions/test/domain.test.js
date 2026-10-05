import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { classify, matchSpecies, updateCriterion, validateLocation, password, manilaDate, wireDates } from '../src/domain.js';
import { analyticsForUser, badgeMetrics } from '../src/analytics.js';
const reference = JSON.parse(readFileSync(new URL('../data/reference.json', import.meta.url)));
const criteria = reference.criteria;
const choose = (code, option) => criteria.find(c => c.code === code).options.find(o => o.code === option).id;
const healthy = () => ({leaf_color: [choose('leaf_color', 'green')], leaf_condition: [choose('leaf_condition', 'smooth_healthy')],
  pests: [choose('pests', 'none_visible')], roots: [choose('roots', 'firm_intact')], bark_trunk: [choose('bark_trunk', 'intact_smooth')], bio_indicators: [], negative_signs: []});
test('local dates keep reports in the correct Manila day and chart month', () => {
  const submitted_at = '2026-09-30T16:30:00.000Z';
  assert.equal(manilaDate(submitted_at), '2026-10-01');
  assert.equal(wireDates({submitted_at}).submitted_at, '2026-10-01 00:30:00');
  const result = analyticsForUser({role: 'guardian'}, [{status: 'verified', final_health: 'Healthy', submitted_at}], [], {date_from: '2026-10-01', date_to: '2026-10-01'});
  assert.equal(result.verification.total, 1); assert.equal(result.growth[0].month, '2026-10');
});
test('badge metrics exclude rejected and corrected reports where appropriate', () => {
  const submitted_at = new Date().toISOString();
  const metrics = badgeMetrics([{status: 'verified', final_species_id: 1, submitted_at},
    {status: 'verified', final_species_id: 2, submitted_at, corrected: true, parent_report_id: 1},
    {status: 'rejected', final_species_id: 3, submitted_at}]);
  assert.deepEqual(metrics, {verified_reports: 2, verified_followups: 1, distinct_species: 2, uncorrected_reports: 1, steward_days: 1});
});
test('all 27 ordinary health combinations keep the 6-point thresholds', () => {
  for (const leaf of criteria.find(c => c.code === 'leaf_color').options.filter(o => o.id <= 3)) {
    for (const pest of criteria.find(c => c.code === 'pests').options.filter(o => [8, 9, 10].includes(o.id))) {
      for (const root of criteria.find(c => c.code === 'roots').options.filter(o => [11, 12, 13].includes(o.id))) {
        const input = {...healthy(), leaf_color: [leaf.id], pests: [pest.id], roots: [root.id]};
        const result = classify(criteria, input), score = leaf.points + pest.points + root.points;
        assert.equal(result.health_score, score); assert.equal(result.status, score === 6 ? 'Healthy' : score >= 3 ? 'Stressed' : 'At Risk');
      }
    }
  }
});
test('all-of-the-above health uses minimum; context does not alter health', () => {
  assert.equal(classify(criteria, {...healthy(), leaf_color: [choose('leaf_color', 'all_of_the_above')]}).health_score, 4);
  assert.equal(classify(criteria, {...healthy(), bark_trunk: [choose('bark_trunk', 'all_of_the_above')]}).health_score, 6);
  assert.equal(classify(criteria, {...healthy(), bio_indicators: [choose('bio_indicators', 'all_of_the_above')]}).environmental_score, 5);
});
test('Not Sure in any group is unscored and requires review', () => {
  for (const c of criteria) {
    const result = classify(criteria, {...healthy(), [c.code]: [choose(c.code, 'unknown')]});
    assert.equal(result.status, 'Unknown'); assert.equal(result.health_score, null); assert.equal(result.needs_review, true);
  }
});
test('exclusive choices, forged IDs, and conflicting animal selections fail', () => {
  assert.throws(() => classify(criteria, {...healthy(), pests: [9999]}));
  assert.throws(() => classify(criteria, {...healthy(), bio_indicators: [19, choose('bio_indicators', 'none_of_the_above')]}));
  assert.throws(() => classify(criteria, {...healthy(), bio_indicators: [19], negative_signs: [26]}));
  assert.throws(() => classify(criteria, {...healthy(), leaf_color: []}));
});
test('approximate GPS is not saved as a precise pin; manual accuracy is cleared', () => {
  const b = reference.barangays[0], base = {latitude: b.center_lat, longitude: b.center_lng, location_source: 'gps', location_accuracy: 101};
  assert.throws(() => validateLocation(base, b));
  assert.equal(validateLocation({...base, location_accuracy: 20}, b).location_accuracy, 20);
  assert.equal(validateLocation({...base, location_source: 'manual'}, b).location_accuracy, null);
  assert.throws(() => validateLocation({...base, latitude: 0, location_source: 'manual'}, b));
  assert.throws(() => validateLocation({...base, longitude: '', location_source: 'manual'}, b));
});
test('species identification abstains on ties or missing traits', () => {
  const species = reference.species[0];
  assert.equal(matchSpecies(reference.species, species).best.id, species.id);
  assert.equal(matchSpecies([species, {...species, id: 999}], species).best, null);
  assert.equal(matchSpecies(reference.species, {...species, root_type: ''}).best, null);
});
test('admin changes preserve IDs, special meaning, archive snapshots, and conflict detection', () => {
  const current = structuredClone(criteria[0]);
  const input = {...current, name: 'Leaves', options: current.options.map(o => ({...o, ...(o.id === 2 ? {delete: true} : {})}))};
  input.options.push({id: -1, kind: 'standard', label: 'Custom leaves', points: 1});
  const changed = updateCriterion(current, input, () => 2000);
  assert.equal(changed.options.find(o => o.id === 2000).points, 1);
  assert.equal(changed.archived_options[0].id, 2);
  assert.notEqual(changed.version, current.version);
  assert.equal(current.options.length, criteria[0].options.length);
  assert.throws(() => updateCriterion(current, {...input, version: 'stale'}, () => 2000));
  assert.throws(() => updateCriterion(current, {...input, options: input.options.filter(o => o.id !== 1)}, () => 2000));
});
test('password policy allows ordinary 8–25 character passwords', () => {
  assert.equal(password('abcdefgh'), 'abcdefgh');
  assert.equal(password('a'.repeat(25)).length, 25);
  for (const value of ['short', 'x'.repeat(26), 'abc\0defgh']) assert.throws(() => password(value));
});
test('analytics uses verified counts and only admin receives survival statistics', () => {
  const rows = [{id: 1, status: 'verified', final_health: 'Healthy', cluster_id: 1, observed_alive_count: 8, submitted_at: '2026-10-01T00:00:00Z'},
    {id: 2, status: 'pending', suggested_health: 'Stressed', observed_alive_count: 1, cluster_id: 1, submitted_at: '2026-10-02T00:00:00Z'}];
  const clusters = [{id: 1, name: 'Site', initial_seedlings: 10}], query = {date_from: '2026-10-01', date_to: '2026-10-02'};
  const admin = analyticsForUser({role: 'system_admin'}, rows, clusters, query);
  assert.equal(admin.overall_survival, 80); assert.equal(admin.health.Healthy, 1); assert.equal(admin.verification.pending, 1);
  const expert = analyticsForUser({role: 'expert'}, rows, clusters, query);
  assert.equal(expert.overall_survival, undefined); assert.equal(expert.clusters[0].initial_seedlings, undefined);
});
