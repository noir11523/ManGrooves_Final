import 'verification_screen.dart';
import '../shared/species_names.dart';
import 'follow_up_screen.dart';

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
    this.showSubmitter = false,
  });
  final String initialStatus;
  final bool needsAttention;
  final int? clusterId;
  final ApiClient api;
  final bool active;
  final bool showSubmitter;

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
  String _dateFrom = '', _dateTo = '';

  Future<void> _openReport(int id) async {
    final item = _reports?.where((r) => r['id'] == id).firstOrNull;
    List<Map<String, dynamic>> species = [];
    if (item?['can_review'] == true) {
      try {
        final catalog = await widget.api.cloudRequest('species.php');
        species = (catalog['species'] as List? ?? [])
            .map((s) => Map<String, dynamic>.from(s as Map))
            .toList();
      } catch (error) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(
                error is ApiException
                    ? error.message
                    : 'Could not load review choices. Try again.',
              ),
            ),
          );
        }
        return;
      }
    }
    if (!mounted) return;
    await Navigator.push(
      context,
      MaterialPageRoute<void>(
        builder: (_) => item?['can_review'] == true
            ? ReviewReportScreen(
                api: widget.api,
                reportId: id,
                species: species,
              )
            : ReportDetailScreen(
                api: widget.api,
                reportId: id,
                manageFollowUp: item?['can_manage_follow_up'] == true,
              ),
      ),
    );
    if (mounted) await _load();
  }

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
              _health.isEmpty &&
              _dateFrom.isEmpty &&
              _dateTo.isEmpty
          ? await widget.api.reports(page: requestPage)
          : await widget.api.filteredReports(
              page: requestPage,
              status: _status,
              needsAttention: _attention,
              clusterId: widget.clusterId,
              query: _query,
              health: _health,
              dateFrom: _dateFrom,
              dateTo: _dateTo,
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
                    selectedColor: const Color(0xFF245B2B),
                    backgroundColor: Colors.white,
                    checkmarkColor: Colors.white,
                    labelStyle: TextStyle(
                      color: entry.key == (_attention ? 'attention' : _status)
                          ? Colors.white
                          : const Color(0xFF26372B),
                      fontWeight: FontWeight.w700,
                    ),
                    side: const BorderSide(color: Color(0xFF758871)),
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
                    dates: true,
                    onDatesChanged: (from, to) {
                      _dateFrom = from;
                      _dateTo = to;
                    },
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
                    onTap: () => _openReport(report['id'] as int),
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
                        if (report['status'] == 'verified' &&
                            (report['needs_attention'] == true ||
                                report['needs_attention'] == 1))
                          const _ReportTag(
                            'Needs attention',
                            foreground: Color(0xFF8A321C),
                            background: Color(0xFFFFE8DC),
                          ),
                        if (report['needs_follow_up'] == true)
                          _ReportTag(
                            report['active_child_id'] != null
                                ? 'Follow-up submitted'
                                : 'Follow-up needed',
                            foreground: const Color(0xFF1D4E77),
                            background: const Color(0xFFE7F1FA),
                          ),
                      ],
                    ),
                    subtitle: Padding(
                      padding: const EdgeInsets.only(top: 8),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          if (widget.showSubmitter)
                            Text(
                              'Submitted by: ${report['guardian_name'] ?? 'Community member'}',
                            ),
                          Text(
                            report['cluster_name']?.toString() ??
                                report['sitio_name']?.toString() ??
                                'New site',
                          ),
                          Text(
                            '${report['display_health'] ?? 'Unknown'} · ${_formatDate(report['submitted_at'])}',
                          ),
                          SpeciesNames(report),
                          if (!widget.showSubmitter &&
                              report['can_follow_up'] == true)
                            Wrap(
                              spacing: 8,
                              children: [
                                TextButton(
                                  onPressed: () =>
                                      _openReport(report['id'] as int),
                                  child: Text(
                                    report['can_review'] == true
                                        ? 'Review'
                                        : 'View',
                                  ),
                                ),
                                OutlinedButton(
                                  onPressed: () async {
                                    await startFollowUp(
                                      context,
                                      widget.api,
                                      report,
                                    );
                                    if (mounted) _load();
                                  },
                                  child: const Text('Submit follow-up'),
                                ),
                              ],
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
    final (foreground, background) = switch (report['status']) {
      'verified' => (const Color(0xFF245B2B), const Color(0xFFE2F0DF)),
      'rejected' => (const Color(0xFF8F2424), const Color(0xFFFCE5E5)),
      _ => (const Color(0xFF6B4700), const Color(0xFFFFF1C2)),
    };
    return _ReportTag(
      reportStatusLabel(report),
      foreground: foreground,
      background: background,
    );
  }
}

class _ReportTag extends StatelessWidget {
  const _ReportTag(
    this.label, {
    required this.foreground,
    required this.background,
  });
  final String label;
  final Color foreground, background;
  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 4),
      decoration: BoxDecoration(
        color: background,
        border: Border.all(color: foreground.withValues(alpha: .25)),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Text(
        label,
        style: TextStyle(
          color: foreground,
          fontSize: 13,
          fontWeight: FontWeight.w700,
        ),
      ),
    );
  }
}
