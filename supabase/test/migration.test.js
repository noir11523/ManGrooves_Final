import test from 'node:test';
import assert from 'node:assert/strict';
import { convertSnapshot, legacyUid } from '../scripts/convert-mysql.js';

import {snapshot} from './migration-fixture.js';

test('migration preserves IDs, roles, hashes, dates, snapshots and follow-up relationships', () => {
  const {documents: d, authUsers} = convertSnapshot(snapshot());
  assert.equal(d.users[0].uid, legacyUid(1)); assert.equal(d.users[0].role, 'guardian'); assert.equal(d.users[0].password_hash, undefined);
  assert.match(authUsers[0].uid, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-a[0-9a-f]{3}-[0-9a-f]{12}$/);
  assert.equal(authUsers[0].uid, d.reports[0].uid);
  assert.notEqual(legacyUid(1), legacyUid(2));
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
