import test from 'node:test';
import assert from 'node:assert/strict';
import { convertSnapshot } from '../src/migration.js';

function snapshot() {
  return {format: 'mangrooves-mysql-v1', source_timezone: 'Asia/Manila', tables: {
    users: [{id: 1, email: 'test@example.test', full_name: 'Test Guardian', role: 'guardian', status: 'active', barangay_id: 1, password_hash: '$2y$10$' + 'a'.repeat(53), session_version: 9}],
    barangays: [{id: 1, name: 'Inayawan'}], mangrove_species: [{id: 1, scientific_name: 'Avicennia marina'}],
    health_criteria: [{id: 1, code: 'leaf_color', name: 'New label', selection_mode: 'single', score_group: 'health', active: 1, display_order: 1}],
    health_options: [{id: 1, criteria_id: 1, label: 'Renamed', code: 'green', points: 2, active: 0, display_order: 1}, {id: 2, criteria_id: 1, label: 'Brown', code: 'brown', points: 0, active: 1}],
    mangrove_clusters: [{id: 1, name: 'Site', barangay_id: 1, species_id: 1}],
    reports: [{id: 5, report_code: 'MGR-5', user_id: 1, barangay_id: 1, cluster_id: 1, submitted_at: '2026-10-02 08:30:00', verified_at: '2026-10-02 08:30:00',
      status: 'verified', expert_id: null, suggested_health: 'Healthy', final_health: 'Healthy', final_species_id: 1, photo_path: 'storage/uploads/photo.jpg'},
    {id: 6, report_code: 'MGR-6', user_id: 1, barangay_id: 1, cluster_id: 1, parent_report_id: 5, status: 'pending', submitted_at: '2026-10-03 08:30:00'}],
    report_observations: [{report_id: 5, criteria_id: 1, option_id: 1, points_snapshot: 2, criterion_name_snapshot: 'Original leaves', option_label_snapshot: 'Original green'}],
    verification_logs: [], badges: [{id: 1}], user_badges: [{user_id: 1, badge_id: 1, earned_at: '2026-10-02 08:30:00'}], notifications: [{id: 1, user_id: 1, link: 'reports.php?id=5'}], audit_logs: []
  }};
}
test('migration preserves IDs, roles, hashes, dates, snapshots and follow-up relationships', () => {
  const {documents: d, authUsers} = convertSnapshot(snapshot());
  assert.equal(d.users[0].uid, 'legacy-1'); assert.equal(d.users[0].role, 'guardian'); assert.equal(d.users[0].password_hash, undefined);
  assert.equal(d.users[0].session_version, undefined); assert.ok(authUsers[0].passwordHash.toString().startsWith('$2b$10$'));
  assert.equal(d.reports[0].id, 5); assert.equal(d.reports[0].active_child_id, 6);
  assert.equal(d.reports[0].submitted_at, '2026-10-02T00:30:00.000Z');
  assert.equal(d.reports[0].observation_snapshots[0].criteria_name, 'Original leaves');
  assert.equal(d.reports[0].observation_snapshots[0].option_label, 'Original green');
  assert.equal(d.criteria[0].archived_options[0].id, 1); assert.equal(d.criteria[0].options[0].id, 2);
  assert.equal(d.verification_logs[0].action, 'auto_verify'); assert.equal(d.notifications[0].report_id, 5);
  assert.equal(d.user_badges[0].id, '1_1');
});
test('migration refuses unsupported hashes and broken relations before cloud writes', () => {
  const bad = snapshot(); bad.tables.users[0].password_hash = 'unsupported'; assert.throws(() => convertSnapshot(bad), /unsupported password hash/);
  const missing = snapshot(); missing.tables.users = []; assert.throws(() => convertSnapshot(missing), /missing user/);
  const timezone = snapshot(); timezone.source_timezone = 'unknown'; assert.throws(() => convertSnapshot(timezone), /timestamps/);
});
