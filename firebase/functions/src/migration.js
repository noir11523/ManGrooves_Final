import { createHash } from 'node:crypto';

// Pure conversion so migration can be reviewed/tested without cloud access.
export function convertSnapshot(snapshot) {
  if (snapshot.format !== 'mangrooves-mysql-v1' || !snapshot.tables) throw new Error('Unsupported migration snapshot.');
  if (!['Asia/Manila', 'UTC'].includes(snapshot.source_timezone)) throw new Error('Only Asia/Manila or UTC snapshots are supported. Convert timestamps explicitly first.');
  const t = snapshot.tables;
  const needed = ['users', 'barangays', 'mangrove_species', 'health_criteria', 'health_options', 'reports', 'report_observations', 'mangrove_clusters', 'verification_logs', 'badges', 'user_badges', 'notifications', 'audit_logs'];
  for (const key of needed) if (!Array.isArray(t[key])) throw new Error(`Missing table: ${key}`);
  const index = list => new Map(list.map(item => [item.id, item]));
  const users = index(t.users), barangays = index(t.barangays), species = index(t.mangrove_species), criteria = index(t.health_criteria), options = index(t.health_options), reports = index(t.reports), clusters = index(t.mangrove_clusters);
  const iso = value => {
    if (!value || !/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}$/.test(value)) return value ?? null;
    return new Date(value.replace(' ', 'T') + (snapshot.source_timezone === 'UTC' ? 'Z' : '+08:00')).toISOString();
  };
  const dates = row => Object.fromEntries(Object.entries(row).map(([key, value]) => [key, key.endsWith('_at') ? iso(value) : value]));
  const docs = {};
  docs.barangays = t.barangays.map(dates); docs.species = t.mangrove_species.map(dates);
  docs.users = t.users.map(source => {
    const {password_hash, session_version, ...user} = dates(source);
    return {...user, uid: `legacy-${source.id}`, barangay_name: barangays.get(user.barangay_id)?.name ?? null};
  });
  docs.criteria = t.health_criteria.map(c => ({...dates(c), version: `migration-${createHash('sha256').update(JSON.stringify([c, t.health_options.filter(o => o.criteria_id === c.id)])).digest('hex')}`,
    options: t.health_options.filter(o => o.criteria_id === c.id && o.active !== 0).map(dates),
    archived_options: t.health_options.filter(o => o.criteria_id === c.id && o.active === 0).map(dates)}));
  docs.clusters = t.mangrove_clusters.map(c => {
    const latest = t.reports.filter(r => r.cluster_id === c.id && r.status === 'verified').sort((a, b) => b.submitted_at.localeCompare(a.submitted_at) || b.id - a.id)[0];
    return {...dates(c), barangay_name: barangays.get(c.barangay_id)?.name ?? '', scientific_name: species.get(c.species_id)?.scientific_name ?? null,
      observed_alive_count: latest?.observed_alive_count ?? null, latest_report_id: latest?.id ?? null};
  });
  docs.reports = t.reports.map(r => {
    if (!users.has(r.user_id) || !barangays.has(r.barangay_id)) throw new Error(`Report ${r.id} has a missing user or barangay.`);
    const child = t.reports.find(other => other.parent_report_id === r.id && other.status !== 'rejected');
    const observations = t.report_observations.filter(o => o.report_id === r.id).map(o => {
      const c = criteria.get(o.criteria_id), option = options.get(o.option_id);
      if (!c || !option) throw new Error(`Report ${r.id} has an invalid observation reference.`);
      return {criteria_id: o.criteria_id, criteria_code: o.criteria_code_snapshot ?? c.code, criteria_name: o.criterion_name_snapshot ?? c.name,
        criteria_order: o.criteria_order_snapshot ?? c.display_order, selection_mode: o.selection_mode_snapshot ?? c.selection_mode,
        score_group: o.score_group_snapshot ?? c.score_group, option_id: o.option_id, option_code: o.option_code_snapshot ?? option.code,
        option_label: o.option_label_snapshot ?? option.label, option_order: o.option_order_snapshot ?? option.display_order, points: o.points_snapshot};
    }).sort((a, b) => a.criteria_order - b.criteria_order || a.option_order - b.option_order);
    return {...dates(r), uid: `legacy-${r.user_id}`, guardian_name: users.get(r.user_id).full_name, barangay_name: barangays.get(r.barangay_id).name,
      cluster_name: clusters.get(r.cluster_id)?.name ?? null, suggested_species_name: species.get(r.suggested_species_id)?.scientific_name ?? null,
      final_species_name: species.get(r.final_species_id)?.scientific_name ?? null, observation_snapshots: observations,
      active_child_id: child?.id ?? null, corrected: t.verification_logs.some(v => v.report_id === r.id && v.action === 'correct')};
  });
  docs.verification_logs = t.verification_logs.map(v => ({...dates(v), report_code: reports.get(v.report_id)?.report_code ?? '',
    reviewer: users.get(v.verifier_id)?.full_name ?? 'Former reviewer', verifier_name: users.get(v.verifier_id)?.full_name ?? 'Former reviewer',
    status: v.new_status, health: v.new_health, previous_species_name: species.get(v.previous_species_id)?.scientific_name ?? null,
    new_species_name: species.get(v.new_species_id)?.scientific_name ?? null}));
  for (const r of docs.reports.filter(r => r.status === 'verified' && r.expert_id == null && !docs.verification_logs.some(v => v.report_id === r.id))) {
    docs.verification_logs.push({id: `auto-${r.id}`, report_id: r.id, report_code: r.report_code, action: 'auto_verify', verifier_id: null,
      reviewer: 'Automatic verification', verifier_name: 'Automatic verification', previous_status: 'pending', new_status: 'verified', status: 'verified',
      previous_health: r.suggested_health, new_health: r.final_health, health: r.final_health, created_at: r.verified_at ?? r.submitted_at, comment: null});
  }
  docs.badges = t.badges.map(dates);
  docs.user_badges = t.user_badges.map(b => ({...dates(b), id: `${b.user_id}_${b.badge_id}`, certificate_code: `MG-LEGACY-${b.user_id}-${b.badge_id}`}));
  docs.notifications = t.notifications.map(n => ({...dates(n), report_id: Number(String(n.link ?? '').match(/[?&](?:id|parent)=(\d+)/)?.[1]) || null}));
  docs.audit_logs = t.audit_logs.map(a => ({...dates(a), actor_name: users.get(a.user_id)?.full_name ?? 'System'}));
  return {documents: docs, authUsers: t.users.map(u => {
    if (!/^\$2[aby]\$\d{2}\$/.test(u.password_hash)) throw new Error(`User ${u.id} has an unsupported password hash. Plan a password reset before importing.`);
    return {uid: `legacy-${u.id}`, email: u.email, displayName: u.full_name, disabled: u.status !== 'active',
      passwordHash: Buffer.from(u.password_hash.replace(/^\$2y\$/, '$2b$'))};
  }), nextId: Math.max(1000, ...Object.values(t).flatMap(rows => rows.map(row => typeof row.id === 'number' ? row.id + 1 : 0)))};
}
