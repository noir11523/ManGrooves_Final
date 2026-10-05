String statusLabel(dynamic value) => switch (value?.toString()) {
  'pending' => 'Pending',
  'verified' => 'Verified',
  'rejected' => 'Rejected',
  'approved' => 'Approved',
  'declined' => 'Declined',
  'active' => 'Active',
  'inactive' => 'Inactive',
  _ => value?.toString() ?? 'Not available',
};

String reportStatusLabel(Map report) =>
    report['status'] == 'pending' &&
        (report['needs_attention'] == true ||
            '${report['needs_attention']}' == '1')
    ? 'Needs attention'
    : statusLabel(report['status']);

String reviewActionLabel(dynamic value) => switch (value?.toString()) {
  'confirm' => 'Confirmed',
  'correct' => 'Corrected',
  'reject' => 'Rejected',
  'auto_verify' => 'Verified automatically',
  _ => statusLabel(value),
};
