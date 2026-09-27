import 'package:flutter/material.dart';

import '../core/api_client.dart';
import 'report_detail_screen.dart';

class ValidationHistoryScreen extends StatefulWidget {
  const ValidationHistoryScreen({super.key, required this.api});
  final ApiClient api;
  @override
  State<ValidationHistoryScreen> createState() =>
      _ValidationHistoryScreenState();
}

class _ValidationHistoryScreenState extends State<ValidationHistoryScreen> {
  Map<String, dynamic>? _data;
  String? _error;
  bool _loading = false;
  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load({int page = 1}) async {
    if (_loading) return;
    setState(() => _loading = true);
    try {
      final data = await widget.api.validationHistory(page: page);
      if (mounted) {
        setState(() {
          _data = data;
          _error = null;
        });
      }
    } catch (error) {
      if (mounted) {
        setState(
          () => _error = error is ApiException
              ? error.message
              : 'Could not load history.',
        );
      }
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final items = (_data?['items'] as List? ?? []).cast<Map>();
    final page = (_data?['page'] as num?)?.toInt() ?? 1,
        pages = (_data?['pages'] as num?)?.toInt() ?? 1;
    return Scaffold(
      appBar: AppBar(title: const Text('Validation history')),
      body: RefreshIndicator(
        onRefresh: _load,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            if (_loading) const LinearProgressIndicator(),
            if (_error != null)
              TextButton(
                onPressed: () => _load(page: page),
                child: Text('$_error Retry'),
              ),
            if (!_loading && _error == null && items.isEmpty)
              const Text('No decisions yet.'),
            for (final item in items)
              Card(
                child: ListTile(
                  title: Text('${item['report_code']} · ${item['action']}'),
                  subtitle: Text(
                    '${item['reviewer']} · ${item['created_at']}\n${item['status']} · ${item['health'] ?? 'No confirmed health'}',
                  ),
                  trailing: const Icon(Icons.chevron_right),
                  isThreeLine: true,
                  onTap: () => Navigator.push(
                    context,
                    MaterialPageRoute<void>(
                      builder: (_) => ReportDetailScreen(
                        api: widget.api,
                        reportId: int.parse('${item['report_id']}'),
                      ),
                    ),
                  ),
                ),
              ),
            if (pages > 1)
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  IconButton(
                    tooltip: 'Previous page',
                    onPressed: page > 1 && !_loading
                        ? () => _load(page: page - 1)
                        : null,
                    icon: const Icon(Icons.chevron_left),
                  ),
                  Text('$page / $pages'),
                  IconButton(
                    tooltip: 'Next page',
                    onPressed: page < pages && !_loading
                        ? () => _load(page: page + 1)
                        : null,
                    icon: const Icon(Icons.chevron_right),
                  ),
                ],
              ),
          ],
        ),
      ),
    );
  }
}

class ValidationHistoryCard extends StatelessWidget {
  const ValidationHistoryCard({super.key, required this.report});
  final Map<String, dynamic> report;
  @override
  Widget build(BuildContext context) {
    final history = (report['verification_history'] as List? ?? []).cast<Map>();
    return Card(
      child: ExpansionTile(
        title: const Text('Validation history'),
        initiallyExpanded: true,
        children: [
          if (history.isEmpty)
            ListTile(
              title: Text(
                report['status'] == 'verified' && report['expert_id'] == null
                    ? 'Automatically verified as Healthy'
                    : 'No review yet.',
              ),
              subtitle: report['verified_at'] == null
                  ? null
                  : Text('${report['verified_at']}'),
            ),
          for (final event in history)
            ListTile(
              title: Text('${event['action']} · ${event['verifier_name']}'),
              subtitle: Text(
                '${event['created_at']}\n${event['previous_status']} → ${event['new_status']}\nHealth: ${event['previous_health'] ?? 'Unknown'} → ${event['new_health'] ?? 'Not confirmed'}\nSpecies: ${event['previous_species_name'] ?? 'Unassigned'} → ${event['new_species_name'] ?? 'Unassigned'}${event['comment'] == null ? '' : '\n${event['comment']}'}',
              ),
            ),
        ],
      ),
    );
  }
}
