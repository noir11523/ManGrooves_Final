import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import 'package:url_launcher/url_launcher.dart';

import '../core/api_client.dart';
import 'cluster_health_map.dart';
import 'report_detail_screen.dart';

class ReportMapScreen extends StatefulWidget {
  const ReportMapScreen({super.key, required this.api, this.tileProvider});
  final ApiClient api;
  final TileProvider? tileProvider;
  @override
  State<ReportMapScreen> createState() => _ReportMapScreenState();
}

class _ReportMapScreenState extends State<ReportMapScreen> {
  final _query = TextEditingController();
  Map<String, dynamic>? _data;
  String _status = '', _health = '';
  String? _error;
  bool _loading = false;
  int _generation = 0;
  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _query.dispose();
    super.dispose();
  }

  Future<void> _load({int page = 1}) async {
    final generation = ++_generation;
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final data = await widget.api.reportMap(
        page: page,
        status: _status,
        health: _health,
        query: _query.text.trim(),
      );
      if (!mounted || generation != _generation) return;
      setState(() => _data = data);
    } catch (error) {
      if (!mounted || generation != _generation) return;
      setState(() {
        _data = null;
        _error = error is ApiException
            ? error.message
            : 'Could not load reports.';
      });
    } finally {
      if (mounted && generation == _generation) {
        setState(() => _loading = false);
      }
    }
  }

  LatLng? _point(Map item) {
    final lat = double.tryParse('${item['latitude']}'),
        lng = double.tryParse('${item['longitude']}');
    if (lat == null ||
        lng == null ||
        !lat.isFinite ||
        !lng.isFinite ||
        lat.abs() > 85 ||
        lng.abs() > 180) {
      return null;
    }
    return LatLng(lat, lng);
  }

  void _open(Map<String, dynamic> item) {
    Navigator.push(
      context,
      MaterialPageRoute<void>(
        builder: (_) => ReportDetailScreen(
          api: widget.api,
          reportId: int.parse('${item['id']}'),
        ),
      ),
    );
  }

  void _pin(Map<String, dynamic> item) {
    showModalBottomSheet<void>(
      context: context,
      showDragHandle: true,
      builder: (sheet) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(20, 0, 20, 20),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text(
                '${item['report_code']}',
                style: Theme.of(context).textTheme.titleLarge,
              ),
              Text('${item['status']} · ${item['display_health']}'),
              Text(
                '${item['cluster_name'] ?? item['sitio_name'] ?? 'New site'}',
              ),
              if (item['status'] != 'verified')
                const Text('Health is a system suggestion.'),
              FilledButton(
                onPressed: () {
                  Navigator.pop(sheet);
                  _open(item);
                },
                child: const Text('View report'),
              ),
            ],
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final items = (_data?['items'] as List? ?? [])
        .map((item) => Map<String, dynamic>.from(item as Map))
        .toList();
    final located = items.where((item) => _point(item) != null).toList();
    final page = (_data?['page'] as num?)?.toInt() ?? 1,
        pages = (_data?['pages'] as num?)?.toInt() ?? 1;
    return Scaffold(
      appBar: AppBar(title: const Text('Report map')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          TextField(
            controller: _query,
            decoration: InputDecoration(
              labelText: 'Find a site or report',
              suffixIcon: IconButton(
                tooltip: 'Search',
                onPressed: _load,
                icon: const Icon(Icons.search),
              ),
            ),
            onSubmitted: (_) => _load(),
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: DropdownButtonFormField<String>(
                  initialValue: _status,
                  decoration: const InputDecoration(labelText: 'Status'),
                  items:
                      {
                            '': 'All',
                            'pending': 'Pending',
                            'verified': 'Verified',
                            'rejected': 'Rejected',
                          }.entries
                          .map(
                            (entry) => DropdownMenuItem(
                              value: entry.key,
                              child: Text(entry.value),
                            ),
                          )
                          .toList(),
                  onChanged: (value) {
                    _status = value ?? '';
                    _load();
                  },
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: DropdownButtonFormField<String>(
                  initialValue: _health,
                  decoration: const InputDecoration(labelText: 'Health'),
                  items: ['', 'Healthy', 'Stressed', 'At Risk']
                      .map(
                        (value) => DropdownMenuItem(
                          value: value,
                          child: Text(value.isEmpty ? 'All' : value),
                        ),
                      )
                      .toList(),
                  onChanged: (value) {
                    _health = value ?? '';
                    _load();
                  },
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          if (_loading) const LinearProgressIndicator(),
          if (_error != null)
            TextButton(onPressed: _load, child: Text('$_error Tap to retry.')),
          if (!_loading && _data != null) ...[
            Text(
              '${_data!['total'] ?? items.length} reports · Page $page of $pages',
            ),
            const Text(
              'Tap a pin or a report below. Pins show submitted locations.',
            ),
            const SizedBox(height: 8),
            if (located.isNotEmpty)
              SizedBox(
                height: 340,
                child: FlutterMap(
                  key: ValueKey('$_generation'),
                  options: MapOptions(
                    initialCenter: _point(located.first)!,
                    initialZoom: 16,
                    initialCameraFit: located.length > 1
                        ? CameraFit.bounds(
                            bounds: LatLngBounds.fromPoints(
                              located.map((item) => _point(item)!).toList(),
                            ),
                            padding: const EdgeInsets.all(40),
                            maxZoom: 17,
                          )
                        : null,
                  ),
                  children: [
                    TileLayer(
                      urlTemplate:
                          'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                      userAgentPackageName: 'org.mangrooves.mobile',
                      tileProvider: widget.tileProvider,
                    ),
                    MarkerLayer(
                      markers: located
                          .map(
                            (item) => Marker(
                              point: _point(item)!,
                              width: 48,
                              height: 48,
                              child: IconButton(
                                tooltip:
                                    '${item['report_code']}: ${item['display_health']}',
                                onPressed: () => _pin(item),
                                icon: Icon(
                                  Icons.location_on,
                                  color: ClusterHealthMap.healthColor(
                                    '${item['display_health']}',
                                  ),
                                  size: 36,
                                ),
                              ),
                            ),
                          )
                          .toList(),
                    ),
                    RichAttributionWidget(
                      attributions: [
                        TextSourceAttribution(
                          'OpenStreetMap contributors',
                          onTap: () async {
                            try {
                              await launchUrl(
                                Uri.parse(
                                  'https://www.openstreetmap.org/copyright',
                                ),
                              );
                            } catch (_) {
                              // The attribution remains readable if no browser is available.
                            }
                          },
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            Wrap(
              spacing: 12,
              children: ['Healthy', 'Stressed', 'At Risk']
                  .map(
                    (health) => Chip(
                      avatar: Icon(
                        Icons.circle,
                        size: 12,
                        color: ClusterHealthMap.healthColor(health),
                      ),
                      label: Text(health),
                    ),
                  )
                  .toList(),
            ),
            if (items.isEmpty)
              const Padding(
                padding: EdgeInsets.all(24),
                child: Text('No reports match these filters.'),
              ),
            for (final item in items)
              Card(
                child: ListTile(
                  title: Text('${item['report_code']}'),
                  subtitle: Text(
                    '${item['status']} · ${item['display_health']}\n${item['cluster_name'] ?? item['sitio_name'] ?? 'New site'}',
                  ),
                  trailing: const Icon(Icons.chevron_right),
                  onTap: () => _open(item),
                ),
              ),
            if (pages > 1)
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  IconButton(
                    tooltip: 'Previous page',
                    onPressed: page > 1 ? () => _load(page: page - 1) : null,
                    icon: const Icon(Icons.chevron_left),
                  ),
                  Text('$page / $pages'),
                  IconButton(
                    tooltip: 'Next page',
                    onPressed: page < pages
                        ? () => _load(page: page + 1)
                        : null,
                    icon: const Icon(Icons.chevron_right),
                  ),
                ],
              ),
          ],
        ],
      ),
    );
  }
}
