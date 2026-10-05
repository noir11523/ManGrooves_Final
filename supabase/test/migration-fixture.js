export function snapshot() {
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
