import 'package:flutter/material.dart';
import 'package:latlong2/latlong.dart';

import '../core/api_client.dart';
import '../core/report_location.dart';
import '../shared/list_filters.dart';
import '../shared/catalog_widgets.dart';
import '../shared/content_width.dart';
import '../shared/barangay_picker.dart';
import 'location_picker_screen.dart';

class SitesScreen extends StatefulWidget {
  const SitesScreen({super.key, required this.api});
  final ApiClient api;
  @override
  State<SitesScreen> createState() => _SitesScreenState();
}

class _SitesScreenState extends State<SitesScreen> {
  List<Map<String, dynamic>> _sites = [], _barangays = [];
  String _query = '', _status = '', _error = '';
  bool _loading = true;
  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final data = await widget.api.cloudRequest('sites.php');
      if (!mounted) return;
      setState(() {
        _sites = (data['sites'] as List)
            .map((x) => Map<String, dynamic>.from(x as Map))
            .toList();
        _barangays = (data['barangays'] as List)
            .map((x) => Map<String, dynamic>.from(x as Map))
            .toList();
        _error = '';
      });
    } catch (error) {
      if (mounted) {
        setState(
          () => _error = error is ApiException
              ? error.message
              : 'Could not load sites.',
        );
      }
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _edit([Map<String, dynamic>? site]) async {
    final saved = await Navigator.push<bool>(
      context,
      MaterialPageRoute(
        builder: (_) =>
            _SiteEditor(api: widget.api, barangays: _barangays, site: site),
      ),
    );
    if (saved == true && mounted) await _load();
  }

  Future<void> _delete(Map<String, dynamic> site) async {
    final yes = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Delete this site?'),
        content: Text(
          'Remove this site from choices? Existing reports will be kept.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(context, true),
            style: FilledButton.styleFrom(
              backgroundColor: Theme.of(context).colorScheme.error,
            ),
            child: const Text('Delete'),
          ),
        ],
      ),
    );
    if (yes != true || !mounted) return;
    try {
      await widget.api.cloudRequest(
        'sites.php',
        body: {...site, 'action': 'delete'},
      );
      if (mounted) await _load();
    } catch (error) {
      if (mounted) {
        setState(
          () => _error = error is ApiException
              ? error.message
              : 'Could not update this site.',
        );
      }
    }
  }

  Future<void> _archive(Map<String, dynamic> site) async {
    final active = site['active'] != 0;
    final yes = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(active ? 'Archive site?' : 'Restore site?'),
        content: Text(
          active
              ? 'Remove it from new report choices. Existing reports are kept.'
              : 'Make this site available for reports again.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(context, true),
            child: Text(active ? 'Archive' : 'Restore'),
          ),
        ],
      ),
    );
    if (yes != true || !mounted) return;
    try {
      await widget.api.cloudRequest(
        'sites.php',
        body: {...site, 'active': active ? 0 : 1},
      );
      if (mounted) await _load();
    } catch (error) {
      if (mounted) {
        setState(
          () => _error = error is ApiException
              ? error.message
              : 'Could not update the site.',
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final sites = _sites
        .where(
          (s) =>
              (_status.isEmpty ||
                  (_status == 'needs_pin'
                      ? s['location_pending'] == true
                      : _status == '0'
                      ? s['active'] == 0
                      : s['active'] != 0 && s['location_pending'] != true)) &&
              '${s['name']} ${s['sitio_name']} ${s['barangay_name']}'
                  .toLowerCase()
                  .contains(_query.toLowerCase()),
        )
        .toList();
    return Scaffold(
      appBar: AppBar(
        title: const Text('Species and Sites'),
        bottom: CatalogTabs(
          selected: 'sites',
          textScaler: MediaQuery.textScalerOf(context),
          onSelected: (_) => Navigator.pop(context),
        ),
      ),
      body: ContentWidth(
        maxWidth: 960,
        child: RefreshIndicator(
          onRefresh: _load,
          child: ListView(
            padding: const EdgeInsets.all(16),
            physics: const AlwaysScrollableScrollPhysics(),
            children: [
              ListFilters(
                applyLabel: 'Filter',
                clearLabel: 'Reset',
                hint: 'Site, location, or barangay',
                filterLabel: 'Status',
                options: const {
                  '': 'All statuses',
                  '1': 'Active',
                  '0': 'Archived',
                  'needs_pin': 'Needs map location',
                },
                onApply: (q, status) => setState(() {
                  _query = q;
                  _status = status;
                }),
              ),
              const SizedBox(height: 12),
              FilledButton.icon(
                onPressed: _loading ? null : () => _edit(),
                icon: const Icon(Icons.add_location_alt_outlined),
                label: const Text('Add site'),
              ),
              Padding(
                padding: const EdgeInsets.symmetric(vertical: 16),
                child: Text('${sites.length} results'),
              ),
              if (_loading) const LinearProgressIndicator(),
              if (_error.isNotEmpty)
                TextButton(
                  onPressed: _load,
                  child: Text('$_error Tap to retry.'),
                ),
              if (!_loading && sites.isEmpty)
                const Padding(
                  padding: EdgeInsets.all(20),
                  child: Text('No sites match your filters.'),
                ),
              ...sites.map((site) => _siteCard(context, site)),
            ],
          ),
        ),
      ),
    );
  }

  Widget _siteCard(BuildContext context, Map<String, dynamic> site) {
    final pending = site['location_pending'] == true;
    final location = '${site['sitio_name'] ?? ''}'.trim();
    return Card(
      key: ValueKey('site-${site['id']}'),
      margin: const EdgeInsets.only(bottom: 16),
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(
              '${site['name']}',
              style: Theme.of(context).textTheme.titleMedium
                  ?.copyWith(fontWeight: FontWeight.bold, height: 1.4),
            ),
            const SizedBox(height: 12),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                CatalogStatus(
                  pending
                      ? 'Needs map location'
                      : site['active'] == 0
                      ? 'Archived'
                      : 'Active',
                  attention: pending,
                ),
                CatalogStatus(
                  site['visibility'] == 'personal'
                      ? 'Awaiting report verification'
                      : 'Shared site',
                  attention: site['visibility'] == 'personal',
                ),
              ],
            ),
            const SizedBox(height: 16),
            if (location.isNotEmpty && location != '${site['name']}'.trim())
              CatalogDetail('Location', location),
            CatalogDetail('Barangay', '${site['barangay_name'] ?? ''}'),
            CatalogDetail(
              'Added by',
              '${site['created_by_name'] ?? 'Administrator'}',
            ),
            if (pending)
              const Padding(
                padding: EdgeInsets.only(top: 6),
                child: Text(
                  'Set a map location to make this site available for reports.',
                ),
              ),
            if (site['visibility'] == 'personal')
              const Padding(
                padding: EdgeInsets.only(top: 6),
                child: Text(
                  'This site becomes available to everyone after its first report is verified.',
                ),
              ),
            const Padding(
              padding: EdgeInsets.symmetric(vertical: 8),
              child: Divider(),
            ),
            Wrap(
              spacing: 12,
              runSpacing: 12,
              children: [
                if (pending)
                  FilledButton.icon(
                    onPressed: () => _edit(site),
                    icon: const Icon(Icons.pin_drop_outlined, size: 20),
                    label: const Text('Set map location'),
                  )
                else
                  OutlinedButton.icon(
                    onPressed: () => _edit(site),
                    icon: const Icon(Icons.edit_outlined, size: 18),
                    label: const Text('Edit'),
                  ),
                if (!pending)
                  OutlinedButton(
                    onPressed: () => _archive(site),
                    child: Text(site['active'] == 0 ? 'Restore' : 'Archive'),
                  ),
                OutlinedButton.icon(
                  style: OutlinedButton.styleFrom(
                    foregroundColor: Theme.of(context).colorScheme.error,
                  ),
                  onPressed: () => _delete(site),
                  icon: const Icon(Icons.delete_outline, size: 18),
                  label: const Text('Delete'),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _SiteEditor extends StatefulWidget {
  const _SiteEditor({required this.api, required this.barangays, this.site});
  final ApiClient api;
  final List<Map<String, dynamic>> barangays;
  final Map<String, dynamic>? site;
  @override
  State<_SiteEditor> createState() => _SiteEditorState();
}

class _SiteEditorState extends State<_SiteEditor> {
  final _form = GlobalKey<FormState>();
  late final TextEditingController _name, _locationName, _radius;
  int? _barangay;
  ReportLocation? _pin;
  bool _busy = false;
  String? _error;
  @override
  void initState() {
    super.initState();
    final site = widget.site;
    _name = TextEditingController(text: site?['name'] ?? '');
    _locationName = TextEditingController(
      text: site?['sitio_name'] ?? site?['name'] ?? '',
    );
    _radius = TextEditingController(text: '${site?['radius_meters'] ?? 100}');
    _barangay = site?['barangay_id'] as int?;
    if (site != null &&
        site['center_lat'] != null &&
        site['center_lng'] != null) {
      _pin = ReportLocation.manual(
        latitude: (site['center_lat'] as num).toDouble(),
        longitude: (site['center_lng'] as num).toDouble(),
      );
    }
  }

  @override
  void dispose() {
    _name.dispose();
    _locationName.dispose();
    _radius.dispose();
    super.dispose();
  }

  Future<void> _choosePin() async {
    final places = widget.barangays.where((b) => b['id'] == _barangay);
    final b = places.isEmpty ? null : places.first;
    final center = b == null
        ? const LatLng(10.2833, 123.8833)
        : LatLng(
            (b['center_lat'] as num).toDouble(),
            (b['center_lng'] as num).toDouble(),
          );
    final pin = await Navigator.push<ReportLocation>(
      context,
      MaterialPageRoute(
        builder: (_) => LocationPickerScreen(
          api: widget.api,
          initialCenter: _pin?.point ?? center,
          initialLocation: _pin,
          initialName: _locationName.text,
          barangayCenter: b == null ? null : center,
          maxDistanceMeters:
              (b?['monitoring_radius_meters'] as num?)?.toDouble() ?? 5000,
        ),
      ),
    );
    if (pin != null && mounted) {
      setState(() {
        _pin = pin;
        if (pin.name != null) _locationName.text = pin.name!;
        _error = null;
      });
    }
  }

  Future<void> _save() async {
    if (!_form.currentState!.validate()) return;
    if (_pin == null) {
      setState(() => _error = 'Choose the site location on the map.');
      return;
    }
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await widget.api.cloudRequest(
        'sites.php',
        body: {
          'id': widget.site?['id'],
          'version': widget.site?['version'] ?? '',
          'name': _name.text,
          'sitio_name': _locationName.text.trim().isEmpty
              ? _name.text
              : _locationName.text,
          'barangay_id': _barangay,
          'center_lat': _pin!.latitude,
          'center_lng': _pin!.longitude,
          'radius_meters': _radius.text,
          'active': widget.site?['location_pending'] == true
              ? 1
              : widget.site?['active'] ?? 1,
        },
      );
      if (mounted) Navigator.pop(context, true);
    } catch (error) {
      if (mounted) {
        setState(
          () => _error = error is ApiException
              ? error.message
              : 'Could not save the site.',
        );
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: Text(widget.site == null ? 'Add site' : 'Edit site')),
    body: Form(
      key: _form,
      child: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          TextFormField(
            controller: _name,
            maxLength: 120,
            decoration: const InputDecoration(labelText: 'Site name'),
            validator: (v) =>
                v == null || v.trim().isEmpty ? 'Enter a site name.' : null,
          ),
          const SizedBox(height: 12),
          BarangayPicker(
            items: widget.barangays,
            value: _barangay,
            enabled: !_busy,
            onChanged: (v) => setState(() => _barangay = v),
          ),
          const SizedBox(height: 16),
          TextFormField(
            controller: _locationName,
            maxLength: 120,
            decoration: const InputDecoration(
              labelText: 'Location name',
              helperText: 'Defaults to the site name.',
            ),
          ),
          OutlinedButton.icon(
            onPressed: _busy ? null : _choosePin,
            icon: const Icon(Icons.pin_drop_outlined),
            label: Text(_pin == null ? 'Place site pin' : 'Adjust site pin'),
          ),
          if (_pin != null)
            Text(
              '${_pin!.latitude.toStringAsFixed(5)}, ${_pin!.longitude.toStringAsFixed(5)}',
            ),
          const SizedBox(height: 16),
          TextFormField(
            controller: _radius,
            keyboardType: TextInputType.number,
            decoration: const InputDecoration(
              labelText: 'Site radius (meters)',
              helperText: 'Reports at this site must be inside this area.',
            ),
            validator: (v) {
              final n = int.tryParse(v ?? '');
              return n == null || n < 25 || n > 5000
                  ? 'Use 25 to 5000 meters.'
                  : null;
            },
          ),
          if (_error != null)
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 12),
              child: Text(
                _error!,
                style: TextStyle(color: Theme.of(context).colorScheme.error),
              ),
            ),
          const SizedBox(height: 24),
          FilledButton(
            onPressed: _busy ? null : _save,
            child: Text(_busy ? 'Saving…' : 'Save site'),
          ),
          TextButton(
            onPressed: _busy ? null : () => Navigator.pop(context, false),
            child: const Text('Cancel'),
          ),
        ],
      ),
    ),
  );
}
