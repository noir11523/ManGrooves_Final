import 'package:flutter/material.dart';

bool canConfirmSuggestions(
  Map<String, dynamic> report,
  List<Map<String, dynamic>> species,
) {
  if (report['can_confirm_suggestions'] == false ||
      ![
        'Healthy',
        'Stressed',
        'At Risk',
      ].contains(report['suggested_health'])) {
    return false;
  }
  final id = report['suggested_species_id'];
  return id is int &&
      id > 0 &&
      species.any(
        (item) =>
            item['id'] == id &&
            item['active'] != 0 &&
            item['deleted_at'] == null &&
            (item['scientific_name'] ?? '').toString().trim().isNotEmpty &&
            ![
              'unknown',
              'unassigned',
            ].contains(item['scientific_name'].toString().trim().toLowerCase()),
      );
}

class ConditionScore extends StatelessWidget {
  const ConditionScore(this.report, {super.key});
  final Map<String, dynamic> report;

  @override
  Widget build(BuildContext context) {
    final summary = report['condition_score_summary'] as Map?;
    final score = summary == null ? report['health_score'] : summary['score'];
    final missing = (summary?['checks'] as List? ?? [])
        .where((check) => check['points'] == null)
        .map((check) => check['name'])
        .join(', ');
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Total condition score: ${score == null ? 'Incomplete' : '$score / 6'}',
            style: Theme.of(context).textTheme.titleMedium
                ?.copyWith(fontWeight: FontWeight.w700),
          ),
          const SizedBox(height: 6),
          Text(
            'Suggested condition: ${report['suggested_health'] ?? 'Unknown'}',
          ),
          if (report['final_health'] != null)
            Text('Final condition: ${report['final_health']}'),
          const Text('Leaf color + pests + roots · up to 2 points each'),
          const Text('6 Healthy · 3–5 Stressed · 0–2 At Risk'),
          if (score == null)
            Text(
              missing.isEmpty
                  ? 'No total was saved for this report.'
                  : 'Not scored: $missing.',
            ),
          if (score != null && report['suggested_health'] == 'Unknown')
            const Text('Recorded condition is Unknown. Choose Correction.'),
        ],
      ),
    );
  }
}
