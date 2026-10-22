import 'package:flutter/material.dart';

class FollowUpCard extends StatelessWidget {
  const FollowUpCard({
    super.key,
    required this.report,
    required this.onView,
    this.onFollowUp,
  });
  final Map<String, dynamic> report;
  final VoidCallback onView;
  final VoidCallback? onFollowUp;

  @override
  Widget build(BuildContext context) {
    final note =
        '${report['expert_feedback'] ?? report['follow_up_note'] ?? ''}'.trim();
    return Card(
      color: const Color(0xFFFFF4D6),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: const BorderSide(color: Color(0xFFD8AF5A)),
      ),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Icon(
                  Icons.assignment_return_outlined,
                  color: Color(0xFF754900),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Text(
                    '${report['report_code'] ?? 'Report'} · Follow-up requested',
                    style: const TextStyle(
                      color: Color(0xFF754900),
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            Text(
              '${report['cluster_name'] ?? report['report_code'] ?? 'Mangrove site'}',
              maxLines: 3,
              overflow: TextOverflow.ellipsis,
              style: Theme.of(context).textTheme.titleMedium
                  ?.copyWith(color: const Color(0xFF203522)),
            ),
            const SizedBox(height: 8),
            Text(
              note.isEmpty
                  ? 'Please add a new observation on your next visit.'
                  : note,
              maxLines: 3,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(color: Color(0xFF394238)),
            ),
            const SizedBox(height: 14),
            Wrap(
              spacing: 10,
              runSpacing: 10,
              children: [
                if (onFollowUp != null)
                  FilledButton(
                    onPressed: onFollowUp,
                    child: const Text('Follow up'),
                  ),
                OutlinedButton(
                  onPressed: onView,
                  child: const Text('View report'),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
