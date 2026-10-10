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

String reportStatusLabel(Map report) => statusLabel(report['status']);

String speciesNames(Map? species) => [
  species?['local_name'] ?? species?['species_local_name'],
  species?['common_name'] ?? species?['species_common_name'],
  species?['scientific_name'] ??
      species?['species_name'] ??
      species?['final_species_name'] ??
      species?['suggested_species_name'],
].where((v) => v != null && '$v'.isNotEmpty).join(' · ');

String reviewActionLabel(dynamic value) => switch (value?.toString()) {
  'confirm' => 'Confirmed',
  'correct' => 'Corrected',
  'reject' => 'Rejected',
  'auto_verify' => 'Verified automatically',
  _ => statusLabel(value),
};
