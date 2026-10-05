import 'package:flutter/material.dart';

import 'dart:async';

import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import 'package:url_launcher/url_launcher.dart';

import '../core/report_location.dart';
import '../core/api_client.dart';

class LocationPickerScreen extends StatefulWidget {
  const LocationPickerScreen({
    super.key,
    required this.initialCenter,
    this.initialLocation,
    this.initialName = '',
    this.barangayCenter,
    this.maxDistanceMeters,
    this.tileProvider,
    this.approximateCenter,
    this.approximateAccuracy,
    this.api,
  });

  final LatLng initialCenter;
  final ReportLocation? initialLocation;
  final String initialName;
  final LatLng? barangayCenter;
  final double? maxDistanceMeters;
  final TileProvider? tileProvider;
  final LatLng? approximateCenter;
  final double? approximateAccuracy;
  final ApiClient? api;

  @override
  State<LocationPickerScreen> createState() => _LocationPickerScreenState();
}

class _LocationPickerScreenState extends State<LocationPickerScreen> {
  final _map = MapController();
  LatLng? _selected;
  bool _edited = false;
  final _search = TextEditingController();
  Timer? _debounce;
  int _searchVersion = 0;
  List<Map<String, dynamic>> _places = [];
  String? _searchMessage;
  void _searchPlaces(String value) {
    _debounce?.cancel();
    final version = ++_searchVersion;
    setState(() {
      _places = [];
      _searchMessage = null;
    });
    if (value.trim().length < 3) return;
    _debounce = Timer(const Duration(milliseconds: 700), () async {
      if (mounted) setState(() => _searchMessage = 'Finding places...');
      try {
        final data = await widget.api!.cloudRequest(
          'places.php',
          query: {'q': value.trim()},
        );
        if (!mounted || version != _searchVersion) return;
        setState(() {
          _places = (data['places'] as List)
              .map((p) => Map<String, dynamic>.from(p as Map))
              .toList();
          _searchMessage = _places.isEmpty
              ? 'No places found. Try a landmark or tap the map.'
              : null;
        });
      } catch (e) {
        if (mounted && version == _searchVersion) {
          setState(
            () => _searchMessage = e is ApiException
                ? e.message
                : 'Search unavailable. Tap the map instead.',
          );
        }
      }
    });
  }

  @override
  void initState() {
    super.initState();
    _selected = widget.initialLocation?.point;
    _search.text = widget.initialName;
    if (_selected == null &&
        widget.api?.supportsCloudAccounts == true &&
        _search.text.trim().length >= 3) {
      _searchPlaces(_search.text);
    }
  }

  @override
  void dispose() {
    _debounce?.cancel();
    _search.dispose();
    _searchVersion++;
    _map.dispose();
    super.dispose();
  }

  String? get _selectionError {
    if (_selected == null ||
        widget.barangayCenter == null ||
        widget.maxDistanceMeters == null) {
      return null;
    }
    if (const Distance().as(
          LengthUnit.Meter,
          widget.barangayCenter!,
          _selected!,
        ) >
        widget.maxDistanceMeters!) {
      return 'This pin is outside your barangay monitoring area. Move it closer to your field site.';
    }
    return null;
  }

  void _moveTo(LatLng point) {
    setState(() {
      _selected = point;
      _edited = true;
    });
    _map.move(point, _map.camera.zoom);
  }

  Future<void> _enterCoordinates() async {
    final point = await showDialog<LatLng>(
      context: context,
      builder: (_) => _CoordinatesDialog(initial: _selected),
    );
    if (point != null && mounted) _moveTo(point);
  }

  Future<void> _openAttribution() async {
    try {
      if (await launchUrl(
        Uri.parse('https://www.openstreetmap.org/copyright'),
      )) {
        return;
      }
    } catch (_) {
      // A device without a browser can still use the picker.
    }
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Map data: openstreetmap.org/copyright')),
    );
  }

  @override
  Widget build(BuildContext context) {
    final error = _selectionError;
    return Scaffold(
      appBar: AppBar(title: const Text('Choose location')),
      body: Column(
        children: [
          if (widget.api?.supportsCloudAccounts == true) ...[
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 4),
              child: TextField(
                controller: _search,
                onChanged: _searchPlaces,
                decoration: const InputDecoration(
                  labelText: 'Find an address or landmark',
                  prefixIcon: Icon(Icons.search),
                  helperText: 'Check the pin or choose another place.',
                  helperMaxLines: 2,
                ),
              ),
            ),
            if (_searchMessage != null)
              Padding(
                padding: const EdgeInsets.all(8),
                child: Text(_searchMessage!),
              ),
            if (_places.isNotEmpty)
              ConstrainedBox(
                constraints: BoxConstraints(
                  maxHeight: MediaQuery.sizeOf(context).height * .22,
                ),
                child: ListView(
                  shrinkWrap: true,
                  children: _places
                      .map(
                        (place) => ListTile(
                          dense: true,
                          leading: const Icon(Icons.place_outlined),
                          title: Text(
                            '${place['label']}',
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                          ),
                          onTap: () {
                            _searchVersion++;
                            _debounce?.cancel();
                            _search.text = '${place['label']}';
                            setState(() => _places = []);
                            FocusScope.of(context).unfocus();
                            _moveTo(
                              LatLng(
                                (place['latitude'] as num).toDouble(),
                                (place['longitude'] as num).toDouble(),
                              ),
                            );
                          },
                        ),
                      )
                      .toList(),
                ),
              ),
          ],
          const Padding(
            padding: EdgeInsets.fromLTRB(16, 8, 16, 12),
            child: Text(
              'Tap the map or move the pin to your mangrove. Check the spot before confirming.',
            ),
          ),
          Expanded(
            child: Stack(
              children: [
                FlutterMap(
                  key: const ValueKey('location-map'),
                  mapController: _map,
                  options: MapOptions(
                    initialCenter: _selected ?? widget.initialCenter,
                    initialZoom:
                        widget.initialLocation == null &&
                            widget.approximateCenter != null
                        ? (widget.approximateAccuracy == null ||
                                  widget.approximateAccuracy! > 5000
                              ? 10
                              : 14)
                        : 16,
                    minZoom: 3,
                    maxZoom: 19,
                    interactionOptions: const InteractionOptions(
                      flags: InteractiveFlag.all & ~InteractiveFlag.rotate,
                    ),
                    onTap: (_, point) => _moveTo(point),
                    onPositionChanged: (camera, hasGesture) {
                      if (hasGesture) {
                        setState(() {
                          _selected = camera.center;
                          _edited = true;
                        });
                      }
                    },
                  ),
                  children: [
                    TileLayer(
                      urlTemplate:
                          'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                      userAgentPackageName: 'org.mangrooves.mobile',
                      maxNativeZoom: 19,
                      tileProvider: widget.tileProvider,
                    ),
                    if (widget.initialLocation?.accuracy != null ||
                        (widget.approximateCenter != null &&
                            widget.approximateAccuracy != null))
                      CircleLayer(
                        circles: [
                          CircleMarker(
                            point: widget.initialLocation?.accuracy != null
                                ? widget.initialLocation!.point
                                : widget.approximateCenter!,
                            radius:
                                widget.initialLocation?.accuracy ??
                                widget.approximateAccuracy ??
                                0,
                            useRadiusInMeter: true,
                            color: Colors.blue.withValues(alpha: 0.12),
                            borderColor: Colors.blue,
                            borderStrokeWidth: 1,
                          ),
                        ],
                      ),
                    Align(
                      alignment: Alignment.bottomRight,
                      child: ColoredBox(
                        color: Colors.white,
                        child: TextButton(
                          onPressed: _openAttribution,
                          child: const Text('© OpenStreetMap contributors'),
                        ),
                      ),
                    ),
                  ],
                ),
                Center(
                  child: IgnorePointer(
                    child: Transform.translate(
                      offset: const Offset(0, -23),
                      child: Icon(
                        Icons.location_pin,
                        key: const ValueKey('report-map-pin'),
                        size: 46,
                        color: _selected == null
                            ? Colors.grey
                            : Theme.of(context).colorScheme.primary,
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
          SafeArea(
            top: false,
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Text(
                    _selected == null
                        ? 'Place the pin where you took the photo.'
                        : '${_selected!.latitude.toStringAsFixed(6)}, ${_selected!.longitude.toStringAsFixed(6)}',
                    key: const ValueKey('selected-coordinates'),
                  ),
                  if (widget.initialLocation?.accuracy != null ||
                      widget.approximateAccuracy != null)
                    Text(
                      'GPS accuracy: ±${(widget.initialLocation?.accuracy ?? widget.approximateAccuracy!).round()} m. Move the pin to choose the exact spot.',
                    ),
                  if (error != null)
                    Text(
                      error,
                      style: TextStyle(
                        color: Theme.of(context).colorScheme.error,
                      ),
                    ),
                  TextButton.icon(
                    onPressed: _enterCoordinates,
                    icon: const Icon(Icons.edit_location_alt_outlined),
                    label: const Text('Enter coordinates instead'),
                  ),
                  const Text(
                    'Map not loading? Enter coordinates if you know them.',
                    style: TextStyle(fontSize: 12),
                  ),
                  const SizedBox(height: 12),
                  FilledButton(
                    key: const ValueKey('confirm-location'),
                    onPressed: _selected == null || error != null
                        ? null
                        : () => Navigator.of(context).pop(
                            !_edited && widget.initialLocation != null
                                ? widget.initialLocation!
                                : ReportLocation.manual(
                                    latitude: _selected!.latitude,
                                    longitude: _selected!.longitude,
                                  ),
                          ),
                    child: const Text('Use this location'),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _CoordinatesDialog extends StatefulWidget {
  const _CoordinatesDialog({this.initial});

  final LatLng? initial;

  @override
  State<_CoordinatesDialog> createState() => _CoordinatesDialogState();
}

class _CoordinatesDialogState extends State<_CoordinatesDialog> {
  final _form = GlobalKey<FormState>();
  late final _latitude = TextEditingController(
    text: widget.initial?.latitude.toStringAsFixed(6) ?? '',
  );
  late final _longitude = TextEditingController(
    text: widget.initial?.longitude.toStringAsFixed(6) ?? '',
  );

  @override
  void dispose() {
    _latitude.dispose();
    _longitude.dispose();
    super.dispose();
  }

  String? _validate(String? text, double limit) {
    final value = double.tryParse(text?.trim() ?? '');
    if (value == null || !value.isFinite || value.abs() > limit) {
      return 'Enter a number between -$limit and $limit.';
    }
    return null;
  }

  @override
  Widget build(BuildContext context) => AlertDialog(
    title: const Text('Enter field coordinates'),
    content: SingleChildScrollView(
      child: Form(
        key: _form,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextFormField(
              controller: _latitude,
              keyboardType: const TextInputType.numberWithOptions(
                decimal: true,
                signed: true,
              ),
              decoration: const InputDecoration(labelText: 'Latitude'),
              validator: (value) => _validate(value, 85.05112878),
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _longitude,
              keyboardType: const TextInputType.numberWithOptions(
                decimal: true,
                signed: true,
              ),
              decoration: const InputDecoration(labelText: 'Longitude'),
              validator: (value) => _validate(value, 180),
            ),
          ],
        ),
      ),
    ),
    actions: [
      TextButton(
        onPressed: () => Navigator.pop(context),
        child: const Text('Cancel'),
      ),
      FilledButton(
        onPressed: () {
          if (!_form.currentState!.validate()) return;
          Navigator.pop(
            context,
            LatLng(
              double.parse(_latitude.text.trim()),
              double.parse(_longitude.text.trim()),
            ),
          );
        },
        child: const Text('Set pin'),
      ),
    ],
  );
}
