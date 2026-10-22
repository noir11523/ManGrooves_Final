import 'dart:math' as math;

import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';
import 'package:printing/printing.dart';

import '../core/api_client.dart';
import 'cluster_health_map.dart';
import 'cluster_timeline_screen.dart';
import 'report_detail_screen.dart';
import 'reports_screen.dart';

class AnalyticsScreen extends StatefulWidget {
  const AnalyticsScreen({super.key, required this.api, this.active = true});
  final ApiClient api;
  final bool active;
  @override
  State<AnalyticsScreen> createState() => _AnalyticsScreenState();
}

class _AnalyticsScreenState extends State<AnalyticsScreen> {
  Map<String, dynamic>? _analytics;
  String? _error;
  bool _loading = false, _exporting = false;
  Map<String, String> _filters = {};
  final _form = GlobalKey<FormState>();
  final _from = TextEditingController(), _to = TextEditingController();
  String _site = '', _species = '', _health = '';
  static const colors = {
    'Healthy': Color(0xFF3F7F43),
    'Stressed': Color(0xFFCF961D),
    'At Risk': Color(0xFFC6513C),
    'Unknown': Color(0xFF788778),
  };
  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _from.dispose();
    _to.dispose();
    super.dispose();
  }

  @override
  void didUpdateWidget(covariant AnalyticsScreen old) {
    super.didUpdateWidget(old);
    if (widget.active && !old.active) _load();
  }

  Future<void> _load() async {
    if (_loading) return;
    setState(() => _loading = true);
    try {
      final result = _filters.isEmpty
          ? await widget.api.analytics()
          : await widget.api.filteredAnalytics(_filters);
      if (!mounted) return;
      setState(() {
        _analytics = Map<String, dynamic>.from(result['analytics'] as Map);
        _error = null;
        final f = _analytics!['filters'] as Map? ?? {};
        _from.text = '${f['date_from'] ?? ''}';
        _to.text = '${f['date_to'] ?? ''}';
        _site = '${f['cluster_id'] ?? ''}';
        _species = '${f['species_id'] ?? ''}';
        _health = '${f['health'] ?? ''}';
      });
    } catch (e) {
      if (mounted) {
        setState(
          () => _error = e is ApiException
              ? e.message
              : 'Could not load analytics. Try again.',
        );
      }
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _exportPdf() async {
    if (_exporting) return;
    setState(() => _exporting = true);
    try {
      final f = Map<String, dynamic>.from(_analytics?['filters'] as Map? ?? {});
      final bytes = await widget.api.analyticsPdf(
        filters: {
          for (final e in f.entries)
            if (e.value != null && '${e.value}'.isNotEmpty) e.key: '${e.value}',
        },
      );
      if (mounted) {
        await Printing.sharePdf(
          bytes: bytes,
          filename: 'ManGROOVES-monitoring-report.pdf',
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              e is ApiException
                  ? e.message
                  : 'Could not export the PDF. Try again.',
            ),
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _exporting = false);
    }
  }

  void _timeline(int id, [int tab = 0]) => Navigator.push(
    context,
    MaterialPageRoute<void>(
      builder: (_) => ClusterTimelineScreen(
        api: widget.api,
        clusterId: id,
        initialTab: tab,
      ),
    ),
  );
  Widget _date(TextEditingController control, String label) => TextFormField(
    controller: control,
    readOnly: true,
    decoration: InputDecoration(
      labelText: label,
      suffixIcon: const Icon(Icons.calendar_today),
    ),
    validator: (v) => v == null || v.isEmpty ? 'Choose a date.' : null,
    onTap: () async {
      final now = DateTime.now();
      final date = await showDatePicker(
        context: context,
        initialDate: DateTime.tryParse(control.text) ?? now,
        firstDate: DateTime(2000),
        lastDate: DateTime(now.year + 1),
      );
      if (date != null && mounted) {
        setState(() => control.text = date.toIso8601String().substring(0, 10));
      }
    },
  );
  Widget _choice(
    String label,
    String value,
    List<Map<String, dynamic>> options,
    ValueChanged<String> change,
  ) => DropdownButtonFormField<String>(
    key: ValueKey('$label-$value'),
    initialValue: options.any((o) => '${o['id']}' == value) ? value : '',
    isExpanded: true,
    decoration: InputDecoration(labelText: label),
    items: [
      const DropdownMenuItem(value: '', child: Text('All')),
      for (final o in options)
        DropdownMenuItem(
          value: '${o['id']}',
          child: Text(
            '${o['name']}',
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
          ),
        ),
    ],
    onChanged: _loading ? null : (v) => setState(() => change(v ?? '')),
  );
  List<Map<String, dynamic>> rows(dynamic value) => (value as List? ?? [])
      .map((v) => Map<String, dynamic>.from(v as Map))
      .toList();
  @override
  Widget build(BuildContext context) {
    if (_analytics == null) {
      return Center(
        child: _loading
            ? const CircularProgressIndicator()
            : FilledButton.tonal(
                onPressed: _load,
                child: Text(_error ?? 'Try again'),
              ),
      );
    }
    final a = _analytics!,
        verification = a['verification'] as Map? ?? {},
        progress = a['progress'] as Map? ?? {},
        options = a['options'] as Map? ?? {};
    final health = Map<String, dynamic>.from(
          a['latest_health'] as Map? ?? a['health'] as Map? ?? {},
        ),
        total = health.values.fold<int>(
          0,
          (sum, n) => sum + (n as num).toInt(),
        );
    final months = rows(a['growth']),
        priority = rows(a['priority_areas']),
        sites = rows(a['map']);
    final maxVisits = months.fold<int>(
      0,
      (sum, m) => math.max(sum, (m['verified_reports'] as num? ?? 0).toInt()),
    );
    final personal = a['scope'] == 'personal';
    Widget metric(String label, String value) => Card(
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(value, style: Theme.of(context).textTheme.titleLarge),
            const SizedBox(height: 6),
            Text(label),
          ],
        ),
      ),
    );
    return RefreshIndicator(
      onRefresh: _load,
      child: ListView(
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 32),
        children: [
          Text(
            personal
                ? 'My monitoring analytics'
                : 'Analytics & Decision Support',
            style: Theme.of(context).textTheme.headlineSmall,
          ),
          Text(
            personal
                ? 'Your reports only.'
                : 'Verified monitoring records from authorized sites.',
          ),
          if (_loading) const LinearProgressIndicator(),
          if (_error != null)
            Text(
              _error!,
              style: TextStyle(color: Theme.of(context).colorScheme.error),
            ),
          Card(
            child: ExpansionTile(
              title: const Text('Monitoring filters'),
              subtitle: Text('${_from.text} to ${_to.text}'),
              childrenPadding: const EdgeInsets.all(16),
              children: [
                Form(
                  key: _form,
                  child: Column(
                    children: [
                      _date(_from, 'Start date'),
                      const SizedBox(height: 12),
                      _date(_to, 'End date'),
                      const SizedBox(height: 12),
                      _choice(
                        'Monitoring site',
                        _site,
                        rows(options['clusters']),
                        (v) => _site = v,
                      ),
                      const SizedBox(height: 12),
                      _choice(
                        'Species',
                        _species,
                        rows(options['species']),
                        (v) => _species = v,
                      ),
                      const SizedBox(height: 12),
                      _choice('Latest site condition', _health, [
                        for (final h in colors.keys) {'id': h, 'name': h},
                      ], (v) => _health = v),
                      const SizedBox(height: 16),
                      Wrap(
                        spacing: 12,
                        children: [
                          FilledButton(
                            onPressed: _loading
                                ? null
                                : () {
                                    if (!_form.currentState!.validate()) return;
                                    if (_from.text.compareTo(_to.text) > 0) {
                                      setState(
                                        () => _error = 'Start date must be on or before end date.',
                                      );
                                      return;
                                    }
                                    _filters = {
                                      'date_from': _from.text,
                                      'date_to': _to.text,
                                      if (_site.isNotEmpty) 'cluster_id': _site,
                                      if (_species.isNotEmpty)
                                        'species_id': _species,
                                      if (_health.isNotEmpty) 'health': _health,
                                    };
                                    _load();
                                  },
                            child: const Text('Apply filters'),
                          ),
                          TextButton(
                            onPressed: _loading
                                ? null
                                : () {
                                    _filters = {};
                                    _load();
                                  },
                            child: const Text('Reset'),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          const Text(
            'Visit dates use submission time. Only reviews completed by the end date are included.',
          ),
          const SizedBox(height: 12),
          LayoutBuilder(
            builder: (context, size) => Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                for (final entry in {
                  'Verified reports':
                      '${verification['verified'] ?? verification['total'] ?? 0}',
                  'Monitored clusters':
                      '${a['monitored_clusters'] ?? sites.length}',
                  'Clusters needing attention':
                      '${a['clusters_needing_attention'] ?? 0}',
                  'Survival rate': 'Insufficient data',
                }.entries)
                  SizedBox(
                    width: MediaQuery.textScalerOf(context).scale(16) > 22
                        ? size.maxWidth
                        : (size.maxWidth - 8) / 2,
                    child: metric(entry.key, entry.value),
                  ),
              ],
            ),
          ),
          if ((a['capabilities'] as Map?)?['can_export_pdf'] == true)
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 12),
              child: OutlinedButton.icon(
                onPressed: _exporting ? null : _exportPdf,
                icon: const Icon(Icons.picture_as_pdf),
                label: Text(
                  _exporting ? 'Generating PDF...' : 'Generate PDF report',
                ),
              ),
            ),
          _ChartCard(
            title: 'Latest verified cluster conditions',
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                const Text('One latest eligible visit per site.'),
                if (total == 0)
                  const Padding(
                    padding: EdgeInsets.all(16),
                    child: Text('No verified sites match these filters.'),
                  )
                else
                  SizedBox(
                    height: 220,
                    child: PieChart(
                      PieChartData(
                        centerSpaceRadius: 36,
                        sectionsSpace: 2,
                        sections: [
                          for (final e in health.entries)
                            if ((e.value as num) > 0)
                              PieChartSectionData(
                                value: (e.value as num).toDouble(),
                                color: colors[e.key] ?? Colors.grey,
                                title: '${e.value}',
                                radius: 48,
                                titleStyle: const TextStyle(
                                  color: Colors.white,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                        ],
                      ),
                    ),
                  ),
                for (final e in health.entries)
                  Padding(
                    padding: const EdgeInsets.symmetric(vertical: 4),
                    child: Wrap(
                      spacing: 8,
                      crossAxisAlignment: WrapCrossAlignment.center,
                      children: [
                        Icon(Icons.circle, size: 10, color: colors[e.key]),
                        Text(
                          '${e.key}: ${e.value} (${total > 0 ? ((e.value as num) / total * 100).toStringAsFixed(1) : '0'}%)',
                        ),
                      ],
                    ),
                  ),
                Text('$total monitored clusters'),
              ],
            ),
          ),
          const SizedBox(height: 12),
          _ChartCard(
            title: 'Mangrove health trends',
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                const Text(
                  'Verified visits by month. Gaps mean no observations, not zero living mangroves.',
                ),
                if (maxVisits == 0)
                  const Padding(
                    padding: EdgeInsets.all(16),
                    child: Text('No verified visits in this period.'),
                  )
                else ...[
                  for (final m in months)
                    Padding(
                      padding: const EdgeInsets.symmetric(vertical: 8),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            '${m['month_label']}: ${m['verified_reports']} visits',
                          ),
                          const SizedBox(height: 4),
                          if (m['health'] is Map)
                            LayoutBuilder(
                              builder: (context, size) => Row(
                                children: [
                                  for (final h in colors.keys)
                                    if ((m['health'][h] as num? ?? 0) > 0)
                                      Tooltip(
                                        message: '$h: ${m['health'][h]} visits',
                                        child: Container(
                                          height: 20,
                                          width:
                                              size.maxWidth *
                                              (m['health'][h] as num) /
                                              maxVisits,
                                          color: colors[h],
                                        ),
                                      ),
                                ],
                              ),
                            )
                          else
                            const Text('No observations'),
                        ],
                      ),
                    ),
                  ExpansionTile(
                    title: const Text('View exact monthly counts'),
                    children: [
                      for (final m in months)
                        ListTile(
                          title: Text('${m['month_label']}'),
                          subtitle: Text(
                            m['health'] is Map
                                ? colors.keys
                                      .map((h) => '$h: ${m['health'][h] ?? 0}')
                                      .join(' | ')
                                : 'No observations',
                          ),
                        ),
                    ],
                  ),
                ],
              ],
            ),
          ),
          const SizedBox(height: 12),
          _ChartCard(
            title: 'Monitoring progress',
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Text(
                  '${progress['followup_reports'] ?? 0} verified follow-up reports at ${progress['clusters_with_followups'] ?? 0} sites.',
                ),
                Text(
                  '${progress['awaiting_followup'] ?? 0} sites awaiting an observation.',
                ),
                Text(
                  'Latest linked visits: ${progress['improved'] ?? 0} improved, ${progress['unchanged'] ?? 0} unchanged, ${progress['declined'] ?? 0} declined.',
                ),
                const Text(
                  'Comparisons use a verified parent visit at the same site. Condition changes do not measure tree growth.',
                ),
                TextButton(
                  onPressed: () => Navigator.push(
                    context,
                    MaterialPageRoute<void>(
                      builder: (_) => ClustersScreen(api: widget.api),
                    ),
                  ),
                  child: const Text('Open Mangrove timeline'),
                ),
                const Text('Survival trend unavailable'),
                Text(
                  '${a['survival_reason'] ?? 'Verified baseline and comparable follow-up measurements are needed.'}',
                ),
              ],
            ),
          ),
          const SizedBox(height: 12),
          if (sites.isNotEmpty)
            ClusterHealthMap(
              clusters: sites,
              title: 'Monitoring map',
              onOpenReports: (id) => Navigator.push(
                context,
                MaterialPageRoute<void>(
                  builder: (_) => Scaffold(
                    appBar: AppBar(title: const Text('Site reports')),
                    body: ReportsScreen(
                      api: widget.api,
                      clusterId: id,
                      initialStatus: 'verified',
                    ),
                  ),
                ),
              ),
              onOpenTimeline: _timeline,
            ),
          const SizedBox(height: 12),
          Text(
            'Priority monitoring areas',
            style: Theme.of(context).textTheme.titleLarge,
          ),
          const Text(
            'Operational guidance; field assessment is needed before restoration decisions.',
          ),
          if (priority.isEmpty)
            const Padding(
              padding: EdgeInsets.all(16),
              child: Text(
                'No sites need additional attention under these filters.',
              ),
            ),
          for (final c in priority)
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Text(
                      '${c['name']}',
                      style: Theme.of(context).textTheme.titleMedium,
                    ),
                    Text('${c['priority']} priority | ${c['latest_health']}'),
                    Text('Trend: ${c['trend']}'),
                    Text('${c['reason']}'),
                    Text('Visit: ${c['last_monitoring_date']}'),
                    Text(
                      c['latest_health'] == 'Unknown'
                          ? 'Ask an expert to clarify the condition.'
                          : c['priority'] == 'High'
                          ? 'Prioritize a field assessment.'
                          : 'Arrange another observation.',
                    ),
                    Wrap(
                      spacing: 12,
                      children: [
                        TextButton(
                          onPressed: () => _timeline(c['id'] as int),
                          child: const Text('View timeline'),
                        ),
                        TextButton(
                          onPressed: () => Navigator.push(
                            context,
                            MaterialPageRoute<void>(
                              builder: (_) => ReportDetailScreen(
                                api: widget.api,
                                reportId: c['report_id'] as int,
                              ),
                            ),
                          ),
                          child: Text('${c['report_code']}'),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
          Card(
            child: ExpansionTile(
              title: const Text('Methods and data limitations'),
              childrenPadding: const EdgeInsets.all(16),
              children: [
                for (final value in (a['methodology'] as Map? ?? {}).values)
                  Padding(
                    padding: const EdgeInsets.only(bottom: 12),
                    child: Text('$value'),
                  ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _ChartCard extends StatelessWidget {
  const _ChartCard({required this.title, required this.child});
  final String title;
  final Widget child;

  @override
  Widget build(BuildContext context) => Card(
    child: Padding(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(
            title,
            style: Theme.of(context).textTheme.titleMedium
                ?.copyWith(fontWeight: FontWeight.w800),
          ),
          const SizedBox(height: 14),
          child,
        ],
      ),
    ),
  );
}
