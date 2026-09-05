import 'package:flutter/material.dart';

import '../core/api_client.dart';
import 'report_detail_screen.dart';

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key, required this.api, this.onStartFollowUp});

  final ApiClient api;
  final ValueChanged<Map<String, dynamic>>? onStartFollowUp;

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  Map<String, dynamic>? _data;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _error = null);
    try {
      _data = await widget.api.dashboard();
    } catch (error) {
      _error = error is ApiException
          ? error.message
          : 'Unable to load the dashboard.';
    }
    if (mounted) setState(() {});
  }

  @override
  Widget build(BuildContext context) {
    if (_data == null && _error == null) {
      return const Center(child: CircularProgressIndicator());
    }
    if (_data == null) {
      return _Retry(message: _error!, onRetry: _load);
    }
    final user = Map<String, dynamic>.from(_data!['user'] as Map);
    final stats = Map<String, dynamic>.from(_data!['stats'] as Map);
    final latest = (_data!['latest_reports'] as List? ?? const [])
        .map((item) => Map<String, dynamic>.from(item as Map))
        .toList();
    final reminders = (_data!['reminders'] as List? ?? const [])
        .map((item) => Map<String, dynamic>.from(item as Map))
        .toList();

    return RefreshIndicator(
      onRefresh: _load,
      child: ListView(
        padding: const EdgeInsets.fromLTRB(20, 8, 20, 28),
        children: [
          Text(
            'Hello, ${user['full_name']?.toString().split(' ').first ?? 'Guardian'}',
            style: Theme.of(context).textTheme.headlineSmall
                ?.copyWith(fontWeight: FontWeight.w800),
          ),
          const Text('Here is the latest from your mangrove monitoring work.'),
          const SizedBox(height: 20),
          GridView.count(
            crossAxisCount: 2,
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            crossAxisSpacing: 12,
            mainAxisSpacing: 12,
            childAspectRatio: 1.45,
            children: [
              _StatCard(
                'Total reports',
                stats['total_reports'],
                Icons.assignment_outlined,
              ),
              _StatCard(
                'Verified',
                stats['verified_reports'],
                Icons.verified_outlined,
              ),
              _StatCard(
                'Pending',
                stats['pending_reports'],
                Icons.hourglass_top,
              ),
              _StatCard(
                'Clusters',
                stats['clusters_covered'],
                Icons.hub_outlined,
              ),
              _StatCard(
                'Species',
                stats['species_identified'],
                Icons.eco_outlined,
              ),
              _StatCard(
                'Needs attention',
                stats['needs_attention'],
                Icons.warning_amber_outlined,
              ),
            ],
          ),
          if (reminders.isNotEmpty) ...[
            const SizedBox(height: 24),
            Text(
              'Follow-up reminders',
              style: Theme.of(context).textTheme.titleLarge
                  ?.copyWith(fontWeight: FontWeight.w700),
            ),
            const SizedBox(height: 10),
            ...reminders.map(
              (item) => Padding(
                padding: const EdgeInsets.only(bottom: 8),
                child: Card(
                  child: ListTile(
                    leading: Icon(
                      item['due_state'] == 'overdue'
                          ? Icons.warning_amber
                          : Icons.event_outlined,
                      color: item['due_state'] == 'overdue'
                          ? Colors.red
                          : Colors.orange.shade800,
                    ),
                    title: Text(
                      item['cluster_name']?.toString() ??
                          item['report_code'].toString(),
                    ),
                    subtitle: Text('Due ${item['next_followup_date']}'),
                    trailing: widget.onStartFollowUp == null
                        ? null
                        : FilledButton.tonal(
                            onPressed: () => widget.onStartFollowUp!(item),
                            child: const Text('Follow up'),
                          ),
                  ),
                ),
              ),
            ),
          ],
          const SizedBox(height: 24),
          Text(
            'Latest reports',
            style: Theme.of(context).textTheme.titleLarge
                ?.copyWith(fontWeight: FontWeight.w700),
          ),
          const SizedBox(height: 10),
          if (latest.isEmpty)
            const Card(
              child: Padding(
                padding: EdgeInsets.all(20),
                child: Text('No reports yet. Start with a field observation.'),
              ),
            )
          else
            ...latest.map(
              (report) => Padding(
                padding: const EdgeInsets.only(bottom: 10),
                child: Card(
                  child: ListTile(
                    onTap: () => Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (_) => ReportDetailScreen(
                          api: widget.api,
                          reportId: report['id'] as int,
                        ),
                      ),
                    ),
                    leading: _HealthDot(
                      report['display_health']?.toString() ?? '',
                    ),
                    title: Text(report['report_code']?.toString() ?? ''),
                    subtitle: Text(
                      report['cluster_name']?.toString() ??
                          'New observation site',
                    ),
                    trailing: const Icon(Icons.chevron_right),
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }
}

class _StatCard extends StatelessWidget {
  const _StatCard(this.label, this.value, this.icon);
  final String label;
  final dynamic value;
  final IconData icon;

  @override
  Widget build(BuildContext context) => Card(
    child: Padding(
      padding: const EdgeInsets.all(14),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Icon(icon, color: Theme.of(context).colorScheme.primary),
          Text(
            '${value ?? 0}',
            style: Theme.of(context).textTheme.headlineSmall
                ?.copyWith(fontWeight: FontWeight.w800),
          ),
          Text(label, maxLines: 1, overflow: TextOverflow.ellipsis),
        ],
      ),
    ),
  );
}

class _HealthDot extends StatelessWidget {
  const _HealthDot(this.health);
  final String health;

  @override
  Widget build(BuildContext context) {
    final color = switch (health) {
      'Healthy' => Colors.green,
      'Stressed' => Colors.orange,
      'At Risk' => Colors.red,
      _ => Colors.grey,
    };
    return CircleAvatar(
      backgroundColor: color.withValues(alpha: .14),
      child: Icon(Icons.eco, color: color),
    );
  }
}

class _Retry extends StatelessWidget {
  const _Retry({required this.message, required this.onRetry});
  final String message;
  final Future<void> Function() onRetry;

  @override
  Widget build(BuildContext context) => Center(
    child: Padding(
      padding: const EdgeInsets.all(24),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Icon(Icons.cloud_off_outlined, size: 48),
          const SizedBox(height: 12),
          Text(message, textAlign: TextAlign.center),
          const SizedBox(height: 12),
          FilledButton.tonal(
            onPressed: onRetry,
            child: const Text('Try again'),
          ),
        ],
      ),
    ),
  );
}
