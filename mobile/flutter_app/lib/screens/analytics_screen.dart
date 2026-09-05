import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';

import '../core/api_client.dart';

class AnalyticsScreen extends StatefulWidget {
  const AnalyticsScreen({super.key, required this.api});

  final ApiClient api;

  @override
  State<AnalyticsScreen> createState() => _AnalyticsScreenState();
}

class _AnalyticsScreenState extends State<AnalyticsScreen> {
  Map<String, dynamic>? _analytics;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _error = null);
    try {
      final response = await widget.api.analytics();
      _analytics = Map<String, dynamic>.from(response['analytics'] as Map);
    } catch (error) {
      _error = error is ApiException
          ? error.message
          : 'Unable to load analytics.';
    }
    if (mounted) setState(() {});
  }

  double? _number(dynamic value) {
    if (value == null) return null;
    if (value is num) return value.toDouble();
    return double.tryParse(value.toString());
  }

  @override
  Widget build(BuildContext context) {
    if (_analytics == null && _error == null) {
      return const Center(child: CircularProgressIndicator());
    }
    if (_analytics == null) {
      return Center(
        child: FilledButton.tonal(onPressed: _load, child: Text(_error!)),
      );
    }
    final verification = Map<String, dynamic>.from(
      _analytics!['verification'] as Map,
    );
    final capabilities = Map<String, dynamic>.from(
      _analytics!['capabilities'] as Map? ?? const {},
    );
    final canViewSurvival = capabilities['can_view_survival'] == true;
    final health = Map<String, dynamic>.from(_analytics!['health'] as Map);
    final growth = (_analytics!['growth'] as List? ?? const [])
        .map((item) => Map<String, dynamic>.from(item as Map))
        .toList();
    final highRisk = (_analytics!['high_risk'] as List? ?? const [])
        .map((item) => Map<String, dynamic>.from(item as Map))
        .toList();
    final healthValues = <String, double>{
      for (final entry in health.entries) entry.key: _number(entry.value) ?? 0,
    };
    final colors = <String, Color>{
      'Healthy': Colors.green,
      'Stressed': Colors.orange,
      'At Risk': Colors.red,
    };
    final spots = <FlSpot>[];
    for (var index = 0; index < growth.length; index++) {
      final value = _number(growth[index]['survival_rate']);
      if (value != null) spots.add(FlSpot(index.toDouble(), value));
    }

    return RefreshIndicator(
      onRefresh: _load,
      child: ListView(
        padding: const EdgeInsets.fromLTRB(20, 8, 20, 32),
        children: [
          Text(
            'Conservation analytics',
            style: Theme.of(context).textTheme.headlineSmall
                ?.copyWith(fontWeight: FontWeight.w800),
          ),
          const Text(
            'Verified evidence, monitoring summaries, and high-risk sites.',
          ),
          const SizedBox(height: 18),
          GridView.count(
            crossAxisCount: 2,
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            crossAxisSpacing: 10,
            mainAxisSpacing: 10,
            childAspectRatio: 1.45,
            children: [
              if (canViewSurvival)
                _AnalyticsStat(
                  'Overall survival',
                  _analytics!['overall_survival'] == null
                      ? 'N/A'
                      : '${_analytics!['overall_survival']}%',
                ),
              _AnalyticsStat(
                'Pending review',
                '${verification['pending'] ?? 0}',
              ),
              _AnalyticsStat('Verified', '${verification['verified'] ?? 0}'),
              _AnalyticsStat(
                'High risk',
                '${_analytics!['high_risk_total'] ?? 0}',
              ),
            ],
          ),
          const SizedBox(height: 20),
          _ChartCard(
            title: 'Verified health distribution',
            child: healthValues.values.every((value) => value == 0)
                ? const Center(
                    child: Text('No verified health data in this period.'),
                  )
                : Column(
                    children: [
                      SizedBox(
                        height: 220,
                        child: PieChart(
                          PieChartData(
                            centerSpaceRadius: 40,
                            sectionsSpace: 3,
                            sections: healthValues.entries
                                .where((entry) => entry.value > 0)
                                .map(
                                  (entry) => PieChartSectionData(
                                    value: entry.value,
                                    color: colors[entry.key],
                                    title: '${entry.value.toInt()}',
                                    radius: 68,
                                    titleStyle: const TextStyle(
                                      color: Colors.white,
                                      fontWeight: FontWeight.w800,
                                    ),
                                  ),
                                )
                                .toList(),
                          ),
                        ),
                      ),
                      Wrap(
                        spacing: 14,
                        children: healthValues.keys
                            .map((label) => _Legend(label, colors[label]!))
                            .toList(),
                      ),
                    ],
                  ),
          ),
          if (canViewSurvival) ...[
            const SizedBox(height: 14),
            _ChartCard(
              title: 'Monthly survival trend',
              child: spots.isEmpty
                  ? const Center(
                      child: Text('No monthly survival data in this period.'),
                    )
                  : SizedBox(
                      height: 240,
                      child: LineChart(
                        LineChartData(
                          minY: 0,
                          maxY: 100,
                          gridData: const FlGridData(show: true),
                          borderData: FlBorderData(show: true),
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
                                interval: 1,
                                reservedSize: 34,
                                getTitlesWidget: (value, meta) {
                                  final index = value.round();
                                  if (index < 0 || index >= growth.length) {
                                    return const SizedBox.shrink();
                                  }
                                  final label =
                                      growth[index]['month_label']
                                          ?.toString() ??
                                      '';
                                  return SideTitleWidget(
                                    meta: meta,
                                    child: Text(
                                      label.split(' ').first,
                                      style: const TextStyle(fontSize: 10),
                                    ),
                                  );
                                },
                              ),
                            ),
                            leftTitles: const AxisTitles(
                              sideTitles: SideTitles(
                                showTitles: true,
                                reservedSize: 36,
                                interval: 25,
                              ),
                            ),
                          ),
                          lineBarsData: [
                            LineChartBarData(
                              spots: spots,
                              isCurved: true,
                              color: Theme.of(context).colorScheme.primary,
                              barWidth: 3,
                              dotData: const FlDotData(show: true),
                              belowBarData: BarAreaData(
                                show: true,
                                color: Theme.of(context).colorScheme.primary
                                    .withValues(alpha: .12),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
            ),
          ],
          const SizedBox(height: 20),
          Text(
            'Sites needing attention',
            style: Theme.of(context).textTheme.titleLarge
                ?.copyWith(fontWeight: FontWeight.w800),
          ),
          const SizedBox(height: 8),
          if (highRisk.isEmpty)
            const Card(
              child: Padding(
                padding: EdgeInsets.all(18),
                child: Text('No verified high-risk sites in this period.'),
              ),
            )
          else
            ...highRisk.map(
              (item) => Card(
                child: ListTile(
                  leading: const Icon(Icons.warning_amber, color: Colors.red),
                  title: Text(
                    item['cluster_name']?.toString() ??
                        item['report_code'].toString(),
                  ),
                  subtitle: Text(
                    '${item['final_health']} · ${item['barangay_name']}',
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }
}

class _AnalyticsStat extends StatelessWidget {
  const _AnalyticsStat(this.label, this.value);
  final String label;
  final String value;

  @override
  Widget build(BuildContext context) => Card(
    child: Padding(
      padding: const EdgeInsets.all(14),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          const Icon(Icons.insights_outlined),
          Text(
            value,
            style: Theme.of(context).textTheme.headlineSmall
                ?.copyWith(fontWeight: FontWeight.w800),
          ),
          Text(label, maxLines: 1, overflow: TextOverflow.ellipsis),
        ],
      ),
    ),
  );
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

class _Legend extends StatelessWidget {
  const _Legend(this.label, this.color);
  final String label;
  final Color color;

  @override
  Widget build(BuildContext context) => Row(
    mainAxisSize: MainAxisSize.min,
    children: [
      Container(
        width: 10,
        height: 10,
        decoration: BoxDecoration(color: color, shape: BoxShape.circle),
      ),
      const SizedBox(width: 5),
      Text(label),
    ],
  );
}
