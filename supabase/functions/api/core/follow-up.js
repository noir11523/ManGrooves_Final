import {displayHealth, newest, reportLabel} from './analytics.js';

export const followUpAvailable = report => report.status === 'verified' && !!report.needs_follow_up && !!report.cluster_id && !report.active_child_id;
export const followUpState = report => report.active_child_id ? 'Follow-up submitted' : followUpAvailable(report) ? 'Awaiting follow-up' : null;

// Relationships, never matching names or locations, define an observation history.
export function observationHistory(report, rows) {
  const owned = rows.filter(row => row.user_id === report.user_id);
  const byId = new Map(owned.map(row => [row.id, row]));
  let root = report;
  const visited = new Set([root.id]);
  while (root.parent_report_id && byId.has(root.parent_report_id) && !visited.has(root.parent_report_id)) {
    root = byId.get(root.parent_report_id); visited.add(root.id);
  }
  const connected = new Set([root.id]);
  const children = new Map();
  for (const row of owned) {
    if (!children.has(row.parent_report_id)) children.set(row.parent_report_id, []);
    children.get(row.parent_report_id).push(row);
  }
  const queue = [root];
  for (let i = 0; i < queue.length; i++) for (const child of children.get(queue[i].id) ?? []) {
    if (!connected.has(child.id)) { connected.add(child.id); queue.push(child); }
  }
  const ordered = [root, ...queue.filter(row => row.id !== root.id).sort((a,b) => -newest(a,b))];
  return ordered.map((row, index) => ({id:row.id, report_code:reportLabel(row), parent_report_id:row.parent_report_id,
    visit_label:index ? `Follow-up #${index}` : 'Original report', submitted_at:row.submitted_at,
    health:displayHealth(row), status:row.status, needs_follow_up:!!row.needs_follow_up, follow_up_state:followUpState(row)}));
}
