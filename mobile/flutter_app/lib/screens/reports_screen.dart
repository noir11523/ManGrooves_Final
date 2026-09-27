import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../core/api_client.dart';
import 'report_detail_screen.dart';
import 'report_map_screen.dart';

class ReportsScreen extends StatefulWidget {
  const ReportsScreen({
    super.key,
    required this.api,
    this.initialStatus = '',
    this.needsAttention = false,
    this.clusterId,
    this.active = true,
  });
  final String initialStatus;
  final bool needsAttention;
  final int? clusterId;
  final ApiClient api;
  final bool active;

  @override
  State<ReportsScreen> createState() => _ReportsScreenState();
}

class _ReportsScreenState extends State<ReportsScreen> {
  List<Map<String, dynamic>>? _reports;
  String? _error;
  late String _status;
  late bool _attention;
  int _page = 1;
  int _pages = 1;
  bool _loading = false;

  @override
  void didUpdateWidget(covariant ReportsScreen oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.active && !oldWidget.active) _load();
  }

  @override
  void initState() {
    super.initState();
    _status = widget.initialStatus;
    _attention = widget.needsAttention;
    _load();
  }

  Future<void> _load({int? page}) async {
    final requestPage = page ?? _page;
    if (_loading) return;
    setState(() => _loading = true);
    try {
      final result = _status.isEmpty && !_attention && widget.clusterId == null
          ? await widget.api.reports(page: requestPage)
          : await widget.api.filteredReports(
              page: requestPage,
              status: _status,
              needsAttention: _attention,
              clusterId: widget.clusterId,
            );
      _pages = (result['pages'] as num?)?.toInt() ?? 1;
      _page = (result['page'] as num?)?.toInt() ?? requestPage;
      _reports = (result['items'] as List? ?? const [])
          .map((item) => Map<String, dynamic>.from(item as Map))
          .toList();
      _error = null;
    } catch (error) {
      _error = error is ApiException
          ? error.message
          : 'Unable to load reports.';
    }
    if (mounted) setState(() => _loading = false);
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
    return Column(
      children: [
        Align(
          alignment: Alignment.centerRight,
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
        SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          padding: const EdgeInsets.symmetric(horizontal: 16),
          child: Row(
            children: [
              for (final entry in {
                '': 'All',
                'verified': 'Verified',
                'pending': 'Pending',
                'rejected': 'Rejected',
                'attention': 'Needs attention',
              }.entries)
                Padding(
                  padding: const EdgeInsets.only(right: 6),
                  child: ChoiceChip(
                    label: Text(entry.value),
                    selected: entry.key == (_attention ? 'attention' : _status),
                    onSelected: _loading
                        ? null
                        : (_) {
                            setState(() {
                              _attention = entry.key == 'attention';
                              _status = _attention ? '' : entry.key;
                              _page = 1;
                              _reports = null;
                            });
                            _load();
                          },
                  ),
                ),
            ],
          ),
        ),
        if (_loading) const LinearProgressIndicator(),
        if (_error != null)
          Padding(padding: const EdgeInsets.all(8), child: Text(_error!)),
        Expanded(
          child: RefreshIndicator(
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
                                  style: const TextStyle(
                                    fontWeight: FontWeight.w700,
                                  ),
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
                                  '${report['display_health'] ?? 'Unknown'} Â· ${_formatDate(report['submitted_at'])}',
                                ),
                              ],
                            ),
                          ),
                          trailing: const Icon(Icons.chevron_right),
                        ),
                      );
                    },
                  ),
          ),
        ),
        if (_pages > 1)
          SafeArea(
            top: false,
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                IconButton(
                  tooltip: 'Previous page',
                  onPressed: _page > 1 && !_loading
                      ? () {
                          _load(page: _page - 1);
                        }
                      : null,
                  icon: const Icon(Icons.chevron_left),
                ),
                Text('Page $_page of $_pages'),
                IconButton(
                  tooltip: 'Next page',
                  onPressed: _page < _pages && !_loading
                      ? () {
                          _load(page: _page + 1);
                        }
                      : null,
                  icon: const Icon(Icons.chevron_right),
                ),
              ],
            ),
          ),
      ],
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
