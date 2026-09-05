import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../core/api_client.dart';
import 'report_detail_screen.dart';

class ReportsScreen extends StatefulWidget {
  const ReportsScreen({super.key, required this.api});
  final ApiClient api;

  @override
  State<ReportsScreen> createState() => _ReportsScreenState();
}

class _ReportsScreenState extends State<ReportsScreen> {
  List<Map<String, dynamic>>? _reports;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final result = await widget.api.reports();
      _reports = (result['items'] as List? ?? const [])
          .map((item) => Map<String, dynamic>.from(item as Map))
          .toList();
      _error = null;
    } catch (error) {
      _error = error is ApiException
          ? error.message
          : 'Unable to load reports.';
    }
    if (mounted) setState(() {});
  }

  @override
  Widget build(BuildContext context) {
    if (_reports == null && _error == null) {
      return const Center(child: CircularProgressIndicator());
    }
    if (_reports == null) {
      return Center(
        child: FilledButton.tonal(onPressed: _load, child: Text(_error!)),
      );
    }
    return RefreshIndicator(
      onRefresh: _load,
      child: _reports!.isEmpty
          ? ListView(
              children: const [
                SizedBox(height: 120),
                Icon(Icons.assignment_outlined, size: 54),
                SizedBox(height: 12),
                Center(child: Text('No reports found.')),
              ],
            )
          : ListView.separated(
              padding: const EdgeInsets.fromLTRB(20, 8, 20, 28),
              itemCount: _reports!.length,
              separatorBuilder: (_, _) => const SizedBox(height: 10),
              itemBuilder: (context, index) {
                final report = _reports![index];
                return Card(
                  child: ListTile(
                    contentPadding: const EdgeInsets.symmetric(
                      horizontal: 16,
                      vertical: 8,
                    ),
                    onTap: () => Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (_) => ReportDetailScreen(
                          api: widget.api,
                          reportId: report['id'] as int,
                        ),
                      ),
                    ),
                    title: Row(
                      children: [
                        Expanded(
                          child: Text(
                            report['report_code']?.toString() ?? '',
                            style: const TextStyle(fontWeight: FontWeight.w700),
                          ),
                        ),
                        _StatusChip(report['status']?.toString() ?? ''),
                      ],
                    ),
                    subtitle: Padding(
                      padding: const EdgeInsets.only(top: 8),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            report['cluster_name']?.toString() ??
                                report['sitio_name']?.toString() ??
                                'New observation site',
                          ),
                          Text(
                            '${report['display_health'] ?? 'Unknown'} · ${_formatDate(report['submitted_at'])}',
                          ),
                        ],
                      ),
                    ),
                    trailing: const Icon(Icons.chevron_right),
                  ),
                );
              },
            ),
    );
  }

  String _formatDate(dynamic value) {
    final parsed = DateTime.tryParse(value?.toString() ?? '');
    return parsed == null ? '' : DateFormat('MMM d, y').format(parsed);
  }
}

class _StatusChip extends StatelessWidget {
  const _StatusChip(this.status);
  final String status;

  @override
  Widget build(BuildContext context) {
    final color = switch (status) {
      'verified' => Colors.green,
      'rejected' => Colors.red,
      _ => Colors.orange,
    };
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 4),
      decoration: BoxDecoration(
        color: color.withValues(alpha: .12),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Text(
        status,
        style: TextStyle(
          color: color.shade700,
          fontSize: 12,
          fontWeight: FontWeight.w700,
        ),
      ),
    );
  }
}
