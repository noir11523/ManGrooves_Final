import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../core/api_client.dart';
import '../core/display_text.dart';
import '../shared/retry_view.dart';
import '../shared/list_filters.dart';
import 'report_detail_screen.dart';

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
  String _query = '', _health = '';

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
      final result =
          _status.isEmpty &&
              !_attention &&
              widget.clusterId == null &&
              _query.isEmpty &&
              _health.isEmpty
          ? await widget.api.reports(page: requestPage)
          : await widget.api.filteredReports(
              page: requestPage,
              status: _status,
              needsAttention: _attention,
              clusterId: widget.clusterId,
              query: _query,
              health: _health,
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
      return RetryView(message: _error!, onRetry: _load);
    }
    return Column(
      children: [
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
            child: ListView.separated(
              physics: const AlwaysScrollableScrollPhysics(),
              padding: const EdgeInsets.fromLTRB(20, 8, 20, 28),
              itemCount: _reports!.isEmpty ? 2 : _reports!.length + 1,
              separatorBuilder: (_, _) => const SizedBox(height: 10),
              itemBuilder: (context, index) {
                if (index == 0) {
                  return ListFilters(
                    hint: 'Site or report number',
                    filterLabel: 'Health',
                    options: const {
                      '': 'All health',
                      'Healthy': 'Healthy',
                      'Stressed': 'Stressed',
                      'At Risk': 'At Risk',
                      'Unknown': 'Unknown',
                    },
                    busy: _loading,
                    onApply: (query, health) {
                      _query = query;
                      _health = health;
                      _load(page: 1);
                    },
                  );
                }
                if (_reports!.isEmpty) {
                  return Column(
                    children: [
                      const SizedBox(height: 24),
                      const Icon(Icons.assignment_outlined, size: 54),
                      const SizedBox(height: 12),
                      Text(
                        _status.isNotEmpty ||
                                _attention ||
                                _query.isNotEmpty ||
                                _health.isNotEmpty
                            ? 'No reports match this filter.'
                            : 'No reports here yet.',
                        textAlign: TextAlign.center,
                      ),
                      if (_status.isNotEmpty || _attention)
                        TextButton(
                          onPressed: _loading
                              ? null
                              : () {
                                  setState(() {
                                    _status = '';
                                    _attention = false;
                                    _page = 1;
                                  });
                                  _load();
                                },
                          child: const Text('Clear status filter'),
                        ),
                    ],
                  );
                }
                final report = _reports![index - 1];
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
                    title: Wrap(
                      spacing: 8,
                      runSpacing: 6,
                      crossAxisAlignment: WrapCrossAlignment.center,
                      children: [
                        Text(
                          report['report_code']?.toString() ?? '',
                          style: const TextStyle(fontWeight: FontWeight.w700),
                        ),
                        _StatusChip(report),
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
                                'New site',
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
  const _StatusChip(this.report);
  final Map<String, dynamic> report;

  @override
  Widget build(BuildContext context) {
    final color = switch (report['status']) {
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
        reportStatusLabel(report),
        style: TextStyle(
          color: color.shade700,
          fontSize: 12,
          fontWeight: FontWeight.w700,
        ),
      ),
    );
  }
}
