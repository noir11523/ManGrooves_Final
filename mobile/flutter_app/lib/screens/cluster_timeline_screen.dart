import 'package:flutter/material.dart';
import 'package:fl_chart/fl_chart.dart';

import '../core/api_client.dart';
import '../shared/list_filters.dart';
import 'cluster_health_map.dart';
import 'report_detail_screen.dart';

class ClusterTimelineScreen extends StatefulWidget {
  const ClusterTimelineScreen({
    super.key,
    required this.api,
    required this.clusterId,
    this.initialTab = 0,
  });
  final ApiClient api;
  final int clusterId, initialTab;
  @override
  State<ClusterTimelineScreen> createState() => _ClusterTimelineScreenState();
}

class _ClusterTimelineScreenState extends State<ClusterTimelineScreen> {
  Map<String, dynamic>? _data;
  String? _error;
  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final data = await widget.api.cluster(widget.clusterId);
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
              : 'Could not load timeline.',
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final growth = widget.initialTab == 1,
        cluster = _data?['cluster'] as Map? ?? {};
    final entries =
        (_data?['timeline'] as List? ?? [])
            .map((e) => Map<String, dynamic>.from(e as Map))
            .toList()
          ..sort(
            (a, b) => '${a['submitted_at']}'.compareTo('${b['submitted_at']}'),
          );
    final counts = entries
        .where((e) => e['observed_alive_count'] != null)
        .toList();
    final shown = growth ? counts : entries.reversed.toList();
    final maximum = counts.fold<double>(
      1,
      (v, e) => (e['observed_alive_count'] as num).toDouble() > v
          ? (e['observed_alive_count'] as num).toDouble()
          : v,
    );
    return Scaffold(
      appBar: AppBar(
        title: Text(growth ? 'Growth timeline' : 'Health history'),
      ),
      body: _data == null
          ? Center(
              child: _error == null
                  ? const CircularProgressIndicator()
                  : TextButton(onPressed: _load, child: Text('$_error Retry')),
            )
          : RefreshIndicator(
              onRefresh: _load,
              child: ListView(
                padding: const EdgeInsets.all(20),
                children: [
                  Text(
                    '${cluster['name'] ?? 'Mangrove site'}',
                    style: Theme.of(context).textTheme.headlineSmall,
                  ),
                  const SizedBox(height: 8),
                  Text(
                    growth
                        ? 'Living mangroves counted each visit. Changes may reflect a different area, not tree height.'
                        : 'Verified health results at this site, newest first.',
                  ),
                  const SizedBox(height: 20),
                  if (shown.isEmpty)
                    const Text('No verified visits yet.')
                  else
                    VisitChart(
                      entries: growth ? counts : entries,
                      growth: growth,
                    ),
                  const SizedBox(height: 20),
                  for (int i = 0; i < shown.length; i++)
                    if (growth)
                      _GrowthVisit(
                        entry: shown[i],
                        previous: i == 0 ? null : shown[i - 1],
                        maximum: maximum,
                      )
                    else
                      Card(
                        child: Padding(
                          padding: const EdgeInsets.all(16),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                '${shown[i]['submitted_at']}'.split(' ').first,
                              ),
                              const SizedBox(height: 8),
                              Text(
                                '${shown[i]['health']}',
                                style: TextStyle(
                                  fontSize: 20,
                                  fontWeight: FontWeight.bold,
                                  color: ClusterHealthMap.healthColor(
                                    '${shown[i]['health']}',
                                  ),
                                ),
                              ),
                              Text(
                                '${shown[i]['species_name'] ?? 'Species not confirmed'}',
                              ),
                              if (shown[i]['expert_feedback'] != null)
                                Text('${shown[i]['expert_feedback']}'),
                              if (shown[i]['can_view_details'] == true)
                                TextButton(
                                  onPressed: () => Navigator.push(
                                    context,
                                    MaterialPageRoute<void>(
                                      builder: (_) => ReportDetailScreen(
                                        api: widget.api,
                                        reportId: int.parse(
                                          '${shown[i]['id']}',
                                        ),
                                      ),
                                    ),
                                  ),
                                  child: Text('View Report #${shown[i]['id']}'),
                                )
                              else
                                const Text('Community observation'),
                            ],
                          ),
                        ),
                      ),
                ],
              ),
            ),
    );
  }
}

class VisitChart extends StatelessWidget {
  const VisitChart({super.key, required this.entries, required this.growth});
  final List<Map<String, dynamic>> entries;
  final bool growth;
  @override
  Widget build(BuildContext context) {
    const levels = {'At Risk': 0.0, 'Stressed': 1.0, 'Healthy': 2.0};
    final spots = <FlSpot>[
      for (int i = 0; i < entries.length; i++)
        growth
            ? FlSpot(
                i.toDouble(),
                (entries[i]['observed_alive_count'] as num).toDouble(),
              )
            : levels.containsKey(entries[i]['health'])
            ? FlSpot(i.toDouble(), levels[entries[i]['health']]!)
            : FlSpot.nullSpot,
    ];
    return Semantics(
      label: growth
          ? 'Living mangroves by visit. Values are listed below.'
          : 'Health by visit. Results are listed below.',
      child: SizedBox(
        height: 245,
        child: LineChart(
          LineChartData(
            minY: 0,
            maxY: growth ? null : 2,
            minX: 0,
            maxX: entries.length == 1 ? 1 : (entries.length - 1).toDouble(),
            titlesData: FlTitlesData(
              topTitles: const AxisTitles(
                sideTitles: SideTitles(showTitles: false),
              ),
              rightTitles: const AxisTitles(
                sideTitles: SideTitles(showTitles: false),
              ),
              bottomTitles: AxisTitles(
                sideTitles: SideTitles(
                  showTitles: true,
                  interval: entries.length > 5
                      ? (entries.length / 4).ceilToDouble()
                      : 1,
                  reservedSize: 32,
                  getTitlesWidget: (value, meta) {
                    final i = value.round();
                    if (i < 0 || i >= entries.length) {
                      return const SizedBox.shrink();
                    }
                    return SideTitleWidget(
                      meta: meta,
                      child: Text(
                        '${entries[i]['submitted_at']}'
                            .split(' ')
                            .first
                            .substring(5),
                        style: const TextStyle(fontSize: 10),
                      ),
                    );
                  },
                ),
              ),
              leftTitles: AxisTitles(
                sideTitles: SideTitles(
                  showTitles: true,
                  reservedSize: growth ? 42 : 65,
                  interval: growth ? null : 1,
                  getTitlesWidget: (value, meta) => Text(
                    growth
                        ? value.toInt().toString()
                        : {0: 'At Risk', 1: 'Stressed', 2: 'Healthy'}[value
                                  .toInt()] ??
                              '',
                    style: const TextStyle(fontSize: 11),
                  ),
                ),
              ),
            ),
            lineTouchData: LineTouchData(
              touchTooltipData: LineTouchTooltipData(
                getTooltipItems: (points) => points
                    .map(
                      (p) => LineTooltipItem(
                        growth
                            ? '${p.y.toInt()} living mangroves'
                            : {0: 'At Risk', 1: 'Stressed', 2: 'Healthy'}[p.y
                                      .toInt()] ??
                                  'Not sure',
                        const TextStyle(color: Colors.white),
                      ),
                    )
                    .toList(),
              ),
            ),
            lineBarsData: [
              LineChartBarData(
                spots: spots,
                isCurved: false,
                isStepLineChart: !growth,
                color: Theme.of(context).colorScheme.primary,
                barWidth: 3,
                dotData: const FlDotData(show: true),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _GrowthVisit extends StatelessWidget {
  const _GrowthVisit({
    required this.entry,
    required this.previous,
    required this.maximum,
  });
  final Map<String, dynamic> entry;
  final Map<String, dynamic>? previous;
  final double maximum;
  @override
  Widget build(BuildContext context) {
    final count = int.parse('${entry['observed_alive_count']}');
    final delta = previous == null
        ? null
        : count - int.parse('${previous!['observed_alive_count']}');
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('${entry['submitted_at']}'.split(' ').first),
            Text(
              '$count living mangroves',
              style: Theme.of(context).textTheme.titleMedium,
            ),
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 10),
              child: LinearProgressIndicator(
                value: count / maximum,
                minHeight: 10,
                borderRadius: BorderRadius.circular(6),
              ),
            ),
            Text(
              delta == null
                  ? 'First count'
                  : '${delta > 0 ? '+' : ''}$delta since last visit',
            ),
            Text('${entry['health']}'),
          ],
        ),
      ),
    );
  }
}

class ClustersScreen extends StatefulWidget {
  const ClustersScreen({super.key, required this.api, this.initialTab = 0});
  final ApiClient api;
  final int initialTab;
  @override
  State<ClustersScreen> createState() => _ClustersScreenState();
}

class _ClustersScreenState extends State<ClustersScreen> {
  List<Map<String, dynamic>>? _items;
  String? _error;
  String _query = '', _health = '';
  int _generation = 0;
  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final generation = ++_generation;
    try {
      final result = await widget.api.clusters(query: _query, health: _health);
      if (mounted && generation == _generation) {
        setState(() {
          _items = (result['clusters'] as List)
              .map((item) => Map<String, dynamic>.from(item as Map))
              .toList();
          _error = null;
        });
      }
    } catch (error) {
      if (mounted && generation == _generation) {
        setState(
          () => _error = error is ApiException
              ? error.message
              : 'Could not load clusters.',
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(
      title: Text(
        widget.initialTab == 1 ? 'Growth timeline' : 'Health history',
      ),
    ),
    body: RefreshIndicator(
      onRefresh: _load,
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          ListFilters(
            hint: 'Cluster name, code, or barangay',
            filterLabel: 'Health',
            options: const {
              '': 'All health',
              'Healthy': 'Healthy',
              'Stressed': 'Stressed',
              'At Risk': 'At Risk',
              'Unknown': 'Unknown',
            },
            onApply: (query, health) {
              _query = query;
              _health = health;
              _load();
            },
          ),
          if (_items != null) Text('${_items!.length} results'),
          const SizedBox(height: 12),
          if (_error != null)
            TextButton(onPressed: _load, child: Text('$_error Retry')),
          if (_items == null && _error == null)
            const Center(child: CircularProgressIndicator()),
          if (_items?.isEmpty == true) const Text('No clusters found.'),
          for (final item in _items ?? <Map<String, dynamic>>[])
            Card(
              child: ListTile(
                title: Text('${item['name']}'),
                subtitle: Text(
                  '${item['latest_health']} · ${item['verified_count']} visits',
                ),
                leading: Icon(
                  Icons.eco,
                  color: ClusterHealthMap.healthColor(
                    '${item['latest_health']}',
                  ),
                ),
                trailing: const Icon(Icons.chevron_right),
                onTap: () => Navigator.push(
                  context,
                  MaterialPageRoute<void>(
                    builder: (_) => ClusterTimelineScreen(
                      api: widget.api,
                      clusterId: int.parse('${item['id']}'),
                      initialTab: widget.initialTab,
                    ),
                  ),
                ),
              ),
            ),
        ],
      ),
    ),
  );
}
