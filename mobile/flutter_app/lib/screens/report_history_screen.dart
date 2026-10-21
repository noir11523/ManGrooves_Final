import 'package:flutter/material.dart';

import '../core/api_client.dart';
import 'reports_screen.dart';
import 'validation_history_screen.dart';

/// A single destination for report records and the decisions attached to them.
class ReportHistoryScreen extends StatefulWidget {
  const ReportHistoryScreen({super.key, required this.api, this.active = true});
  final ApiClient api;
  final bool active;
  @override
  State<ReportHistoryScreen> createState() => _ReportHistoryScreenState();
}

class _ReportHistoryScreenState extends State<ReportHistoryScreen> {
  int _tab = 0;
  @override
  Widget build(BuildContext context) => Column(
    children: [
      Padding(
        padding: const EdgeInsets.all(12),
        child: SegmentedButton<int>(
          segments: const [
            ButtonSegment(value: 0, label: Text('Reports')),
            ButtonSegment(value: 1, label: Text('Review activity')),
          ],
          selected: {_tab},
          onSelectionChanged: (v) => setState(() => _tab = v.first),
        ),
      ),
      Expanded(
        child: _tab == 0
            ? ReportsScreen(
                api: widget.api,
                showSubmitter: true,
                active: widget.active,
              )
            : ValidationHistoryScreen(
                api: widget.api,
                embedded: true,
                active: widget.active,
              ),
      ),
    ],
  );
}
