import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import 'package:url_launcher/url_launcher.dart';

import '../core/api_client.dart';
import '../core/display_text.dart';
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
  final _map = MapController();
  final _mapKey = GlobalKey();
  Timer? _searchTimer;
  int _searchVersion = 0;
  List<Map<String, dynamic>> _places = [];
  Map<String, dynamic>? _selectedPlace;
  String? _searchMessage;
  bool _mapReady = false, _followReports = true, _tileError = false;
  int _tileVersion = 0;
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
    _searchTimer?.cancel();
    _searchVersion++;
    _query.dispose();
    _map.dispose();
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
      );
      if (!mounted || generation != _generation) return;
      setState(() => _data = data);
      _fitReports();
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

  List<Map<String, dynamic>> get _items => (_data?['items'] as List? ?? [])
      .map((item) => Map<String, dynamic>.from(item as Map))
      .toList();

  void _fitReports() {
    if (!_mapReady || !_followReports || _selectedPlace != null) return;
    final points = _items.map(_point).whereType<LatLng>().toList();
    if (points.isEmpty) return;
    if (points.length == 1) {
      _map.move(points.first, 16);
    } else {
      _map.fitCamera(
        CameraFit.bounds(
          bounds: LatLngBounds.fromPoints(points),
          padding: const EdgeInsets.all(35),
          maxZoom: 16,
        ),
      );
    }
  }

  List<Map<String, dynamic>> _validPlaces(
    Iterable<Map<String, dynamic>> places,
  ) {
    final seen = <String>{};
    return places
        .where((place) {
          final point = _point(place), label = '${place['label'] ?? ''}'.trim();
          return point != null &&
              label.isNotEmpty &&
              seen.add('$label|${point.latitude}|${point.longitude}');
        })
        .take(8)
        .toList();
  }

  void _searchPlaces(String value, {bool immediately = false}) {
    _searchTimer?.cancel();
    final version = ++_searchVersion;
    final trimmed = value.trim();
    final term = trimmed.length > 150 ? trimmed.substring(0, 150) : trimmed;
    final local = _validPlaces(
      _items
          .where(
            (item) =>
                [
                  'sitio_name',
                  'cluster_name',
                  'barangay_name',
                  'report_code',
                ].any(
                  (key) => '${item[key] ?? ''}'.toLowerCase().contains(
                    term.toLowerCase(),
                  ),
                ),
          )
          .map(
            (item) => {
              ...item,
              'label':
                  item['sitio_name'] ??
                  item['cluster_name'] ??
                  item['barangay_name'] ??
                  item['report_code'],
            },
          ),
    );
    setState(() {
      _selectedPlace = null;
      _places = term.length < 3 ? [] : local;
      _searchMessage = term.isNotEmpty && term.length < 3
          ? 'Type at least 3 letters.'
          : null;
    });
    if (term.length < 3) {
      if (term.isEmpty) {
        _followReports = true;
        _fitReports();
      }
      return;
    }
    _searchTimer = Timer(
      immediately ? Duration.zero : const Duration(milliseconds: 700),
      () async {
        if (!mounted) return;
        if (!widget.api.supportsCloudAccounts) {
          setState(
            () => _searchMessage = local.isEmpty
                ? 'No saved locations found on this page.'
                : 'Choose a location below.',
          );
          return;
        }
        setState(() => _searchMessage = 'Finding places...');
        try {
          final data = await widget.api.cloudRequest(
            'places.php',
            query: {'q': term},
          );
          if (!mounted || version != _searchVersion) return;
          setState(() {
            _places = _validPlaces([
              ...local,
              ...(data['places'] as List? ?? []).map(
                (item) => Map<String, dynamic>.from(item as Map),
              ),
            ]);
            _searchMessage = _places.isEmpty
                ? 'No places found. Try another address or landmark.'
                : 'Choose a location below.';
          });
        } catch (_) {
          if (!mounted || version != _searchVersion) return;
          setState(
            () => _searchMessage = local.isEmpty
                ? 'Search is unavailable. Try again in a moment.'
                : 'Address search is unavailable. Choose a report location below.',
          );
        }
      },
    );
  }

  void _selectPlace(Map<String, dynamic> place) {
    _searchTimer?.cancel();
    _searchVersion++;
    FocusScope.of(context).unfocus();
    setState(() {
      _selectedPlace = place;
      _query.text = '${place['label']}';
      _places = [];
      _searchMessage = 'Selected: ${place['label']}';
      _followReports = false;
    });
    if (_mapReady) _map.move(_point(place)!, 16);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted && _mapKey.currentContext != null) {
        Scrollable.ensureVisible(
          _mapKey.currentContext!,
          alignment: .1,
          duration: const Duration(milliseconds: 200),
        );
      }
    });
  }

  void _onTileError() {
    if (_tileError) return;
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted && !_tileError) setState(() => _tileError = true);
    });
  }

  LatLng? _point(Map item) {
    final lat = double.tryParse('${item['latitude']}'),
        lng = double.tryParse('${item['longitude']}');
    if (lat == null ||
        lng == null ||
        !lat.isFinite ||
        !lng.isFinite ||
        lat.abs() > 85.05112878 ||
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
                '${item['report_code'] ?? 'Report'}',
                style: Theme.of(context).textTheme.titleLarge,
              ),
              Text(
                '${statusLabel(item['status'])} · ${item['display_health']}',
              ),
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
    final items = _items;
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
              labelText: 'Find a location',
              hintText: 'Address or landmark',
              prefixIcon: const Icon(Icons.search),
              helperText: 'Choose a place to see it on the map.',
              helperMaxLines: 2,
              counterText: '',
              suffixIcon: _query.text.isEmpty
                  ? null
                  : IconButton(
                      tooltip: 'Clear location',
                      onPressed: () {
                        _query.clear();
                        _searchPlaces('');
                      },
                      icon: const Icon(Icons.close),
                    ),
            ),
            maxLength: 150,
            onChanged: _searchPlaces,
            onSubmitted: (value) => _searchPlaces(value, immediately: true),
          ),
          if (_searchMessage != null)
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 8),
              child: Text(_searchMessage!),
            ),
          if (_places.isNotEmpty)
            ConstrainedBox(
              constraints: const BoxConstraints(maxHeight: 220),
              child: ListView(
                shrinkWrap: true,
                children: _places
                    .map(
                      (place) => ListTile(
                        leading: const Icon(Icons.place_outlined),
                        title: Text('${place['label']}'),
                        onTap: () => _selectPlace(place),
                      ),
                    )
                    .toList(),
              ),
            ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: DropdownButtonFormField<String>(
                  isExpanded: true,
                  initialValue: _status,
                  decoration: const InputDecoration(labelText: 'Status'),
                  items:
                      {
                            '': 'All reports',
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
                  isExpanded: true,
                  initialValue: _health,
                  decoration: const InputDecoration(labelText: 'Health'),
                  items: ['', 'Healthy', 'Stressed', 'At Risk', 'Unknown']
                      .map(
                        (value) => DropdownMenuItem(
                          value: value,
                          child: Text(value.isEmpty ? 'All health' : value),
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
          if (_loading) const Text('Loading reports...'),
          if (_data != null)
            Text(
              '${located.length} pins · ${_data!['total'] ?? items.length} reports · Page $page of $pages',
            ),
          const Text(
            'Tap a report pin to view its details. A blue pin marks your search.',
          ),
          const SizedBox(height: 8),
          SizedBox(
            key: _mapKey,
            height: 340,
            child: FlutterMap(
              mapController: _map,
              options: MapOptions(
                keepAlive: true,
                initialCenter: const LatLng(10.2833, 123.8833),
                initialZoom: 14,
                onMapReady: () {
                  _mapReady = true;
                  WidgetsBinding.instance.addPostFrameCallback((_) {
                    if (!mounted) return;
                    if (_selectedPlace != null) {
                      _map.move(_point(_selectedPlace!)!, 16);
                    } else {
                      _fitReports();
                    }
                  });
                },
                onPositionChanged: (_, hasGesture) {
                  if (hasGesture) _followReports = false;
                },
                interactionOptions: const InteractionOptions(
                  flags: InteractiveFlag.all & ~InteractiveFlag.rotate,
                ),
              ),
              children: [
                TileLayer(
                  key: ValueKey(_tileVersion),
                  urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                  userAgentPackageName: 'org.mangrooves.mobile',
                  tileProvider: widget.tileProvider,
                  errorTileCallback: (_, _, _) => _onTileError(),
                ),
                MarkerLayer(
                  markers: [
                    if (_selectedPlace != null)
                      Marker(
                        point: _point(_selectedPlace!)!,
                        width: 42,
                        height: 42,
                        child: Tooltip(
                          message:
                              'Selected location: ${_selectedPlace!['label']}',
                          child: const Icon(
                            Icons.location_on,
                            key: ValueKey('searched-location-pin'),
                            color: Colors.blue,
                            size: 42,
                          ),
                        ),
                      ),
                    ...located.map(
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
                    ),
                  ],
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
          if (_tileError)
            Card(
              child: Padding(
                padding: const EdgeInsets.all(12),
                child: Column(
                  children: [
                    const Text('Some map tiles could not load.'),
                    TextButton(
                      onPressed: () => setState(() {
                        _tileError = false;
                        _tileVersion++;
                      }),
                      child: const Text('Reload map'),
                    ),
                  ],
                ),
              ),
            ),
          Wrap(
            spacing: 12,
            children: ['Healthy', 'Stressed', 'At Risk', 'Unknown']
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
          if (!_loading && _error == null && items.isEmpty)
            const Padding(
              padding: EdgeInsets.all(24),
              child: Text(
                'No reports match these filters. You can still search for a place.',
              ),
            ),
          if (!_loading && items.length > located.length)
            Text(
              '${items.length - located.length} reports on this page have no map location.',
            ),
          for (final item in items)
            Card(
              child: ListTile(
                title: Text('${item['report_code'] ?? 'Report'}'),
                subtitle: Text(
                  '${statusLabel(item['status'])} · ${item['display_health']}\n${item['cluster_name'] ?? item['sitio_name'] ?? 'New site'}',
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
                  onPressed: !_loading && page > 1
                      ? () => _load(page: page - 1)
                      : null,
                  icon: const Icon(Icons.chevron_left),
                ),
                Text('$page / $pages'),
                IconButton(
                  tooltip: 'Next page',
                  onPressed: !_loading && page < pages
                      ? () => _load(page: page + 1)
                      : null,
                  icon: const Icon(Icons.chevron_right),
                ),
              ],
            ),
        ],
      ),
    );
  }
}
