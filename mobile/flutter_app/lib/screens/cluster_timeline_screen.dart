import 'package:flutter/material.dart';

import '../core/api_client.dart';
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
    final cluster = _data?['cluster'] as Map? ?? {};
    final entries = (_data?['timeline'] as List? ?? [])
        .map((item) => Map<String, dynamic>.from(item as Map))
        .toList();
    final counts = entries
        .where((item) => item['observed_alive_count'] != null)
        .toList();
    final maxCount = counts.fold<double>(1, (current, item) {
      final value = double.tryParse('${item['observed_alive_count']}') ?? 0;
      return value > current ? value : current;
    });
    return DefaultTabController(
      length: 2,
      initialIndex: widget.initialTab,
      child: Scaffold(
        appBar: AppBar(
          title: Text('${cluster['name'] ?? 'Cluster timeline'}'),
          bottom: const TabBar(
            tabs: [
              Tab(text: 'Health history'),
              Tab(text: 'Growth timeline'),
            ],
          ),
        ),
        body: _data == null
            ? Center(
                child: _error == null
                    ? const CircularProgressIndicator()
                    : TextButton(
                        onPressed: _load,
                        child: Text('$_error Retry'),
                      ),
              )
            : TabBarView(
                children: [
                  RefreshIndicator(
                    onRefresh: _load,
                    child: ListView(
                      padding: const EdgeInsets.all(16),
                      physics: const AlwaysScrollableScrollPhysics(),
                      children: [
                        Text(
                          '${entries.length} verified visits',
                          style: Theme.of(context).textTheme.titleLarge,
                        ),
                        const Text(
                          'Newest visits first. Tap a report for details.',
                        ),
                        if (entries.isEmpty)
                          const Padding(
                            padding: EdgeInsets.all(24),
                            child: Text('No verified visits yet.'),
                          ),
                        for (final entry in entries.reversed)
                          Card(
                            child: Padding(
                              padding: const EdgeInsets.all(14),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.stretch,
                                children: [
                                  Row(
                                    children: [
                                      Icon(
                                        Icons.eco,
                                        color: ClusterHealthMap.healthColor(
                                          '${entry['health']}',
                                        ),
                                      ),
                                      const SizedBox(width: 8),
                                      Expanded(
                                        child: Text(
                                          '${entry['health']}',
                                          style: const TextStyle(
                                            fontWeight: FontWeight.bold,
                                          ),
                                        ),
                                      ),
                                      Text(
                                        '${entry['submitted_at']}'
                                            .split(' ')
                                            .first,
                                      ),
                                    ],
                                  ),
                                  const SizedBox(height: 8),
                                  Text(
                                    '${entry['species_name'] ?? 'Species unassigned'}',
                                  ),
                                  Text(
                                    'Living mangroves: ${entry['observed_alive_count'] ?? 'Not counted'}',
                                  ),
                                  if (entry['parent_report_id'] != null)
                                    const Text('Follow-up visit'),
                                  if (entry['photo_url'] != null)
                                    Padding(
                                      padding: const EdgeInsets.symmetric(
                                        vertical: 10,
                                      ),
                                      child: ClipRRect(
                                        borderRadius: BorderRadius.circular(12),
                                        child: Image.network(
                                          widget.api
                                              .resolve('${entry['photo_url']}')
                                              .toString(),
                                          headers: widget.api.imageHeaders,
                                          height: 150,
                                          fit: BoxFit.cover,
                                          errorBuilder: (_, _, _) =>
                                              const SizedBox.shrink(),
                                        ),
                                      ),
                                    ),
                                  if (entry['expert_feedback'] != null)
                                    Text('${entry['expert_feedback']}'),
                                  if (entry['can_view_details'] == true)
                                    TextButton(
                                      onPressed: () => Navigator.push(
                                        context,
                                        MaterialPageRoute<void>(
                                          builder: (_) => ReportDetailScreen(
                                            api: widget.api,
                                            reportId: int.parse(
                                              '${entry['id']}',
                                            ),
                                          ),
                                        ),
                                      ),
                                      child: Text(
                                        'View ${entry['report_code']}',
                                      ),
                                    )
                                  else
                                    const Text(
                                      'Community observation',
                                      style: TextStyle(color: Colors.black54),
                                    ),
                                ],
                              ),
                            ),
                          ),
                      ],
                    ),
                  ),
                  ListView(
                    padding: const EdgeInsets.all(16),
                    children: [
                      Text(
                        'Living mangroves over time',
                        style: Theme.of(context).textTheme.titleLarge,
                      ),
                      const Text(
                        'Counts from verified visits, oldest first. Changes can reflect a different area counted.',
                      ),
                      const SizedBox(height: 16),
                      if (counts.isEmpty) const Text('No verified counts yet.'),
                      for (int index = 0; index < counts.length; index++)
                        _GrowthVisit(
                          entry: counts[index],
                          previous: index == 0 ? null : counts[index - 1],
                          maximum: maxCount,
                        ),
                    ],
                  ),
                ],
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
  final _search = TextEditingController();
  int _generation = 0;
  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _search.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    final generation = ++_generation;
    try {
      final result = await widget.api.clusters(query: _search.text.trim());
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
        widget.initialTab == 1 ? 'Growth timelines' : 'Health history',
      ),
    ),
    body: RefreshIndicator(
      onRefresh: _load,
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          TextField(
            controller: _search,
            onSubmitted: (_) => _load(),
            decoration: InputDecoration(
              labelText: 'Find a cluster',
              suffixIcon: IconButton(
                onPressed: _load,
                tooltip: 'Search',
                icon: const Icon(Icons.search),
              ),
            ),
          ),
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
