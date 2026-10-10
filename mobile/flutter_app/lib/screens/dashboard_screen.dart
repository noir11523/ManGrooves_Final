import 'package:flutter/material.dart';

import '../core/api_client.dart';
import 'report_detail_screen.dart';
import 'reports_screen.dart';
import 'cluster_health_map.dart';
import 'cluster_timeline_screen.dart';
import 'report_map_screen.dart';

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({
    super.key,
    required this.api,
    this.onStartFollowUp,
    this.active = true,
  });

  final ApiClient api;
  final bool active;
  final ValueChanged<Map<String, dynamic>>? onStartFollowUp;

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  Map<String, dynamic>? _data;
  String? _error;
  final _mapKey = GlobalKey();

  @override
  void didUpdateWidget(covariant DashboardScreen oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.active && !oldWidget.active) _load();
  }

  void _openReports({
    String status = '',
    bool attention = false,
    int? clusterId,
  }) {
    Navigator.push(
      context,
      MaterialPageRoute<void>(
        builder: (_) => Scaffold(
          appBar: AppBar(title: const Text('Reports')),
          body: ReportsScreen(
            api: widget.api,
            initialStatus: status,
            needsAttention: attention,
            clusterId: clusterId,
          ),
        ),
      ),
    ).then((_) {
      if (mounted) _load();
    });
  }

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
    final clusters = (_data!['clusters'] as List? ?? const [])
        .map((item) => Map<String, dynamic>.from(item as Map))
        .toList();
    final reminders = (_data!['reminders'] as List? ?? const [])
        .map((item) => Map<String, dynamic>.from(item as Map))
        .toList();

    return RefreshIndicator(
      onRefresh: _load,
      child: SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.fromLTRB(20, 8, 20, 28),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(
              "Hi, ${user['first_name'] ?? user['full_name']?.toString().split(' ').first ?? 'there'}!",
              style: Theme.of(context).textTheme.headlineSmall
                  ?.copyWith(fontWeight: FontWeight.w800),
            ),
            const Text('Your latest mangrove updates.'),
            Align(
              alignment: Alignment.centerLeft,
              child: TextButton.icon(
                onPressed: () => Navigator.push(
                  context,
                  MaterialPageRoute<void>(
                    builder: (_) => ReportMapScreen(api: widget.api),
                  ),
                ),
                icon: const Icon(Icons.map_outlined),
                label: const Text('Report map'),
              ),
            ),
            const SizedBox(height: 20),
            GridView.count(
              crossAxisCount: 2,
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              crossAxisSpacing: 12,
              mainAxisSpacing: 12,
              mainAxisExtent: 155,
              children: [
                _StatCard(
                  'Verified reports',
                  stats['total_reports'],
                  Icons.assignment_outlined,
                  () => _openReports(status: 'verified'),
                ),
                _StatCard(
                  'Pending',
                  stats['pending_reports'],
                  Icons.hourglass_top,
                  () => _openReports(status: 'pending'),
                ),
                _StatCard(
                  'Rejected',
                  stats['rejected_reports'],
                  Icons.cancel_outlined,
                  () => _openReports(status: 'rejected'),
                ),
                _StatCard(
                  'Needs attention',
                  stats['needs_attention'],
                  Icons.warning_amber_outlined,
                  () => _openReports(attention: true),
                ),
                _StatCard(
                  'Clusters',
                  stats['map_clusters'] ?? clusters.length,
                  Icons.hub_outlined,
                  () {
                    final target = _mapKey.currentContext;
                    if (target != null) {
                      Scrollable.ensureVisible(
                        target,
                        duration: const Duration(milliseconds: 300),
                      );
                    }
                  },
                ),
              ],
            ),
            if (reminders.isNotEmpty) ...[
              const SizedBox(height: 24),
              Text(
                'Follow-up requests',
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
                        Icons.assignment_return_outlined,
                        color: Colors.orange.shade800,
                      ),
                      title: Text(
                        item['cluster_name']?.toString() ??
                            item['report_code'].toString(),
                      ),
                      subtitle: Text(
                        (item['follow_up_note']?.toString().trim().isNotEmpty ??
                                false)
                            ? item['follow_up_note'].toString()
                            : 'A follow-up visit was requested.',
                      ),
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
                  child: Text('No reports yet.'),
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
                        report['cluster_name']?.toString() ?? 'New site',
                      ),
                      trailing: const Icon(Icons.chevron_right),
                    ),
                  ),
                ),
              ),
            const SizedBox(height: 24),
            ClusterHealthMap(
              key: _mapKey,
              clusters: clusters,
              onOpenTimeline: (id, tab) => Navigator.push(
                context,
                MaterialPageRoute<void>(
                  builder: (_) => ClusterTimelineScreen(
                    api: widget.api,
                    clusterId: id,
                    initialTab: tab,
                  ),
                ),
              ),
              onOpenReports: (id) =>
                  _openReports(clusterId: id, status: 'verified'),
            ),
          ],
        ),
      ),
    );
  }
}

class _StatCard extends StatelessWidget {
  const _StatCard(this.label, this.value, this.icon, this.onTap);
  final VoidCallback onTap;
  final String label;
  final dynamic value;
  final IconData icon;

  @override
  Widget build(BuildContext context) => Card(
    color: switch (label) {
      'Verified' => const Color(0xFFE6F0DD),
      'Pending' => const Color(0xFFFFF3D2),
      'Rejected' || 'Needs attention' => const Color(0xFFF9E6DF),
      'Clusters' => const Color(0xFFDDEDE8),
      _ => const Color(0xFFE2ECF5),
    },
    clipBehavior: Clip.antiAlias,
    child: InkWell(
      onTap: onTap,
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            CircleAvatar(
              backgroundColor: Colors.white.withValues(alpha: .7),
              child: Icon(icon, color: Theme.of(context).colorScheme.primary),
            ),
            Text(
              '${value ?? 0}',
              style: Theme.of(context).textTheme.headlineSmall
                  ?.copyWith(fontWeight: FontWeight.w800),
            ),
            Text(label, maxLines: 2, overflow: TextOverflow.ellipsis),
          ],
        ),
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
