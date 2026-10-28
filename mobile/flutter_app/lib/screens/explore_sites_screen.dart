import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';

import '../core/api_client.dart';
import '../shared/content_width.dart';
import 'cluster_health_map.dart';
import 'cluster_timeline_screen.dart';
import 'reports_screen.dart';

class ExploreSitesScreen extends StatefulWidget {
  const ExploreSitesScreen({
    super.key,
    required this.api,
    required this.user,
    this.tileProvider,
  });
  final ApiClient api;
  final Map<String, dynamic> user;
  final TileProvider? tileProvider;
  @override
  State<ExploreSitesScreen> createState() => _ExploreSitesScreenState();
}

class _ExploreSitesScreenState extends State<ExploreSitesScreen> {
  Map<String, dynamic>? _data;
  String? _error;
  final _search = TextEditingController();
  final _scroll = ScrollController();
  String _species = '', _place = '', _health = '';
  Set<String> _accessibleSites = {};
  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _search.dispose();
    _scroll.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    try {
      final data = await widget.api.cloudRequest('explore.php');
      Set<String> accessible = {};
      if (widget.user['role'] == 'guardian') {
        try {
          final result = await widget.api.cloudRequest('clusters.php');
          accessible = ((result['clusters'] as List?) ?? [])
              .map((s) => '${s['id']}')
              .toSet();
        } catch (_) {
          /* Public sites remain available if the account lookup fails. */
        }
      }
      if (mounted) {
        setState(() {
          _data = data;
          _accessibleSites = accessible;
          _error = null;
        });
      }
    } catch (error) {
      if (mounted) {
        setState(
          () => _error = error is ApiException
              ? error.message
              : 'Could not load sites.',
        );
      }
    }
  }

  bool _canOpen(Map<String, dynamic> site) =>
      widget.user['role'] != 'guardian' ||
      '${site['barangay_id']}' == '${widget.user['barangay_id']}' ||
      _accessibleSites.contains('${site['id']}');
  Widget _filter(
    String label,
    String value,
    Map<String, String> choices,
    ValueChanged<String> onChanged,
  ) => Padding(
    padding: const EdgeInsets.only(bottom: 12),
    child: DropdownButtonFormField<String>(
      key: ValueKey('$label-$value'),
      isExpanded: true,
      initialValue: value,
      decoration: InputDecoration(labelText: label),
      items: choices.entries
          .map(
            (e) => DropdownMenuItem(
              value: e.key,
              child: Text(e.value, overflow: TextOverflow.ellipsis),
            ),
          )
          .toList(),
      onChanged: (v) => setState(() => onChanged(v ?? '')),
    ),
  );
  @override
  Widget build(BuildContext context) {
    final all = (_data?['clusters'] as List? ?? [])
        .map((s) => Map<String, dynamic>.from(s as Map))
        .toList();
    final catalog = (_data?['species'] as List? ?? [])
        .map((s) => Map<String, dynamic>.from(s as Map))
        .toList();
    final speciesById = {for (final s in catalog) '${s['id']}': s};
    final q = _search.text.trim().toLowerCase();
    final sites = all
        .where((s) {
          final species = speciesById['${s['species_id']}'] ?? {};
          return (_species.isEmpty || '${s['species_id']}' == _species) &&
              (_place.isEmpty || '${s['barangay_id']}' == _place) &&
              (_health.isEmpty || s['latest_health'] == _health) &&
              [
                s['name'],
                s['barangay_name'],
                s['city_municipality'],
                species['local_name'],
                species['common_name'],
                species['scientific_name'],
              ].join(' ').toLowerCase().contains(q);
        })
        .map(
          (s) => {
            ...s,
            ...{
              for (final key in [
                'local_name',
                'common_name',
                'scientific_name',
              ])
                key: speciesById['${s['species_id']}']?[key],
            },
          },
        )
        .toList();
    return Scaffold(
      appBar: AppBar(title: const Text('Explore mangrove sites')),
      body: ContentWidth(
        maxWidth: 960,
        child: RefreshIndicator(
          onRefresh: _load,
          child: ListView(
            controller: _scroll,
            padding: const EdgeInsets.all(20),
            children: [
              const Text(
                'Shared sites with verified reports. Find a species, place or health result.',
              ),
              const SizedBox(height: 16),
              if (_error != null)
                TextButton(onPressed: _load, child: Text('$_error Retry')),
              if (_data == null && _error == null)
                const Center(child: CircularProgressIndicator()),
              TextField(
                controller: _search,
                decoration: const InputDecoration(
                  labelText: 'Search sites or species',
                  hintText: 'Site, barangay or mangrove name',
                  prefixIcon: Icon(Icons.search),
                ),
                onChanged: (_) => setState(() {}),
              ),
              const SizedBox(height: 16),
              _filter('Species', _species, {
                '': 'All species',
                for (final s in catalog)
                  '${s['id']}': '${s['scientific_name']}',
              }, (v) => _species = v),
              _filter('Location', _place, {
                '': 'All locations',
                for (final s in all)
                  '${s['barangay_id']}': [
                    s['barangay_name'],
                    s['city_municipality'],
                  ].where((v) => v != null).join(', '),
              }, (v) => _place = v),
              _filter('Health status', _health, {
                '': 'All health',
                for (final h in ['Healthy', 'Stressed', 'At Risk', 'Unknown'])
                  h: h,
              }, (v) => _health = v),
              OutlinedButton(
                onPressed: () => setState(() {
                  _search.clear();
                  _species = '';
                  _place = '';
                  _health = '';
                }),
                child: const Text('Reset filters'),
              ),
              const SizedBox(height: 16),
              Text(
                '${sites.length} shared ${sites.length == 1 ? 'site' : 'sites'} · Verified reports only',
              ),
              const SizedBox(height: 12),
              if (sites.isEmpty && _data != null)
                const Card(
                  child: Padding(
                    padding: EdgeInsets.all(20),
                    child: Text(
                      'No matching verified sites. Try another species, location or health result. New sites appear after a report is verified and the site is shared.',
                    ),
                  ),
                ),
              if (sites.isNotEmpty)
                ClusterHealthMap(
                  key: ValueKey('$q|$_species|$_place|$_health'),
                  clusters: sites,
                  title: 'Matching sites',
                  tileProvider: widget.tileProvider,
                  canOpenSite: _canOpen,
                  onOpenReports: (id) => Navigator.push(
                    context,
                    MaterialPageRoute<void>(
                      builder: (_) => Scaffold(
                        appBar: AppBar(title: const Text('Reports')),
                        body: ReportsScreen(
                          api: widget.api,
                          clusterId: id,
                          initialStatus: 'verified',
                        ),
                      ),
                    ),
                  ),
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
                ),
            ],
          ),
        ),
      ),
    );
  }
}
