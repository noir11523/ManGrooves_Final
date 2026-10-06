import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';
import 'package:image_picker/image_picker.dart';
import 'package:latlong2/latlong.dart';

import '../core/api_client.dart';
import '../core/report_location.dart';
import '../core/report_draft_store.dart';
import 'location_picker_screen.dart';

class SubmitReportScreen extends StatefulWidget {
  const SubmitReportScreen({
    super.key,
    required this.api,
    required this.onSubmitted,
    this.onExit,
    this.initialParentReportId,
    this.initialClusterId,
    this.active = true,
    this.draftOwner,
    this.draftStore,
  });

  final ApiClient api;
  final VoidCallback onSubmitted;
  final VoidCallback? onExit;
  final int? initialParentReportId;
  final int? initialClusterId;
  final bool active;
  final String? draftOwner;
  final ReportDraftStore? draftStore;

  @override
  State<SubmitReportScreen> createState() => SubmitReportScreenState();
}

class SubmitReportScreenState extends State<SubmitReportScreen>
    with WidgetsBindingObserver {
  final _formKey = GlobalKey<FormState>();
  final _sitio = TextEditingController();
  final _aliveCount = TextEditingController();
  final _remarks = TextEditingController();
  final _picker = ImagePicker();

  Map<String, dynamic>? _form;
  final Map<String, List<int>> _observations = {};
  List<Map<String, dynamic>> _previousReports = [];
  int _step = 0;
  int? _clusterId;
  int? _parentReportId;
  String? _rootType;
  String? _leafShape;
  String? _barkTexture;
  XFile? _photo;
  ReportLocation? _location;
  String? _error;
  bool _busy = false;
  bool _gettingLocation = false;
  LatLng? _areaCenter;
  double? _areaAccuracy;
  String? _locationMessage;
  Timer? _placeTimer;
  int _placeRequest = 0;
  int _locationRequest = 0;
  List<Map<String, dynamic>> _placeSuggestions = [];
  String? _placeMessage;
  String? _selectedPlaceLabel;
  double? _gpsProgressAccuracy;
  Position? _approximatePosition;
  StreamSubscription<Position>? _gpsSubscription;
  Completer<Position>? _gpsResult;
  Timer? _gpsDeadline;
  bool _autoCaptureTried = false;
  bool _requestingPermission = false;
  bool _permissionAsked = false;
  bool _loadingParents = false;
  bool _confirmed = false;
  Map<String, dynamic>? _preview;
  String? _previewError;
  Timer? _previewTimer;
  int _previewRequest = 0;
  bool _previewBusy = false;
  bool _followup = false;
  int _parentRequest = 0;
  late final ReportDraftStore _draftStore;
  bool _draftReady = false;
  bool _clearingDraft = false;
  bool _pickingPhoto = false;
  String? _lastDraft;
  final _draftStatus = ValueNotifier<String>('');
  String? get _draftScope => widget.draftOwner == null
      ? null
      : '${widget.api.baseUrl}:${widget.draftOwner}';

  Map<String, dynamic> _draftValues() => {
    'sitio_name': _sitio.text,
    'selected_place_label': _selectedPlaceLabel,
    'observed_alive_count': _aliveCount.text,
    'guardian_remarks': _remarks.text,
    'root_type': _rootType,
    'leaf_shape': _leafShape,
    'bark_texture': _barkTexture,
    'cluster_id': _clusterId,
    'parent_report_id': _parentReportId,
    'followup': _followup,
    'step': _step,
    'photo_path': _photo?.path,
    'picking_photo': _pickingPhoto,
    'location': _location?.fields,
    'form': _form,
    'previous_reports': _previousReports,
    'observations': {
      for (final e in _observations.entries) e.key: List<int>.from(e.value),
    },
  };

  Future<void> _saveDraft() async {
    final scope = _draftScope;
    if (!_draftReady || _clearingDraft || scope == null) return;
    if (_photo == null &&
        !_pickingPhoto &&
        _location == null &&
        _sitio.text.isEmpty &&
        _aliveCount.text.isEmpty &&
        _remarks.text.isEmpty &&
        _clusterId == null &&
        _rootType == null &&
        _leafShape == null &&
        _barkTexture == null &&
        _observations.values.every((answers) => answers.isEmpty)) {
      return;
    }
    final snapshot = _draftValues(), encoded = jsonEncode(_draftValues());
    if (encoded == _lastDraft) return;
    _lastDraft = encoded;
    try {
      await _draftStore.save(scope, snapshot);
      if (_photo?.path == snapshot['photo_path'] &&
          _draftStore.photoPath(scope) != null) {
        _photo = XFile(_draftStore.photoPath(scope)!);
      }
      if (mounted &&
          encoded == _lastDraft &&
          _draftStatus.value.startsWith('Could not save your progress.')) {
        _draftStatus.value = '';
      }
    } catch (_) {
      _lastDraft = null;
      if (mounted) _draftStatus.value = 'Could not save your progress. Keep the app open and check device storage.';
    }
  }

  void _draftEdited() {
    unawaited(_saveDraft());
  }

  Future<void> _restoreDraft() async {
    if (_draftScope == null) return;
    try {
      final draft = await _draftStore.load(_draftScope!);
      if (draft == null || !mounted) return;
      _sitio.text = draft['sitio_name']?.toString() ?? '';
      _selectedPlaceLabel = draft['selected_place_label'] as String?;
      _aliveCount.text = draft['observed_alive_count']?.toString() ?? '';
      _remarks.text = draft['guardian_remarks']?.toString() ?? '';
      _rootType = draft['root_type'] as String?;
      _leafShape = draft['leaf_shape'] as String?;
      _barkTexture = draft['bark_texture'] as String?;
      _clusterId = draft['cluster_id'] as int?;
      _parentReportId = draft['parent_report_id'] as int?;
      _followup = draft['followup'] == true;
      _previousReports = (draft['previous_reports'] as List? ?? [])
          .map((r) => Map<String, dynamic>.from(r as Map))
          .toList();
      _step = (draft['step'] as int? ?? 0).clamp(0, 3);
      for (final entry in (draft['observations'] as Map? ?? {}).entries) {
        _observations['${entry.key}'] = List<int>.from(entry.value as List);
      }
      if (draft['photo_path'] != null) _photo = XFile('${draft['photo_path']}');
      final point = draft['location'] as Map?;
      final lat = double.tryParse('${point?['latitude']}'),
          lng = double.tryParse('${point?['longitude']}');
      if (lat != null &&
          lng != null &&
          lat.isFinite &&
          lng.isFinite &&
          lat.abs() <= 85.05112878 &&
          lng.abs() <= 180) {
        final accuracy = double.tryParse('${point?['location_accuracy']}');
        _location =
            point?['location_source'] == 'gps' &&
                accuracy != null &&
                accuracy.isFinite &&
                accuracy >= 0
            ? ReportLocation.gps(
                latitude: lat,
                longitude: lng,
                accuracy: accuracy,
              )
            : ReportLocation.manual(latitude: lat, longitude: lng);
      }
      if (draft['form'] is Map) {
        _form = Map<String, dynamic>.from(draft['form'] as Map);
      }
      _draftStatus.value = '';
      if (draft['missing_photo'] == true) {
        _step = 0;
        _draftStatus.value =
            'Details restored. Please choose your field photo again.';
      }
      _confirmed = false;
      if (draft['picking_photo'] == true && Platform.isAndroid) {
        final lost = await _picker.retrieveLostData();
        if (lost.files?.isNotEmpty == true) _photo = lost.files!.first;
      }
    } catch (_) {
      _draftStatus.value = 'Could not restore the draft. Check device storage.';
    }
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state != AppLifecycleState.resumed) {
      _draftEdited();
      if (state == AppLifecycleState.inactive && _requestingPermission) return;
      if (_gettingLocation && _location == null) _autoCaptureTried = false;
      _cancelGps();
    } else {
      unawaited(_tryAutoCapture());
    }
  }

  @override
  void initState() {
    super.initState();
    _draftStore = widget.draftStore ?? ReportDraftStore();
    WidgetsBinding.instance.addObserver(this);
    for (final controller in [_sitio, _aliveCount, _remarks]) {
      controller.addListener(_draftEdited);
    }
    _clusterId = widget.initialClusterId;
    _parentReportId = widget.initialParentReportId;
    _followup = _parentReportId != null;
    _loadForm();
  }

  @override
  void dispose() {
    _draftEdited();
    _placeTimer?.cancel();
    _placeRequest++;
    WidgetsBinding.instance.removeObserver(this);
    _previewTimer?.cancel();
    _cancelGps();
    _sitio.dispose();
    _aliveCount.dispose();
    _remarks.dispose();
    _draftStatus.dispose();
    super.dispose();
  }

  Future<void> _loadForm() async {
    if (!_draftReady) await _restoreDraft();
    if (!mounted) return;
    final previousVersions = {
      for (final c in _criteria) '${c['id']}': c['version'],
    };
    try {
      _form = await widget.api.reportForm();
      if (!mounted) return;
      for (final c in _criteria) {
        final options = (c['options'] as List).map((o) => o['id']).toSet();
        _observations['${c['code']}']?.removeWhere(
          (id) => !options.contains(id),
        );
        if (previousVersions.isNotEmpty &&
            previousVersions['${c['id']}'] != c['version'] &&
            _step > 0) {
          _step = 1;
          _draftStatus.value = 'Draft restored. The checklist changed; check your answers again.';
        }
      }
      if (!_traits('root_type').contains(_rootType)) _rootType = null;
      if (!_traits('leaf_shape').contains(_leafShape)) _leafShape = null;
      if (!_traits('bark_texture').contains(_barkTexture)) _barkTexture = null;
      final clusterExists = _clusters.any((item) => item['id'] == _clusterId);
      if (!clusterExists) {
        _clusterId = null;
        _parentReportId = null;
      }
      if (_clusterId != null) {
        await _loadPreviousReports(
          _clusterId!,
          preferredParentId: _parentReportId,
        );
      }
      _error = null;
      if (mounted) unawaited(_tryAutoCapture());
      if (_step == 3) await _fetchPreview();
    } catch (error) {
      _error = error is ApiException
          ? error.message
          : 'Unable to load the field checklist.';
    }
    _draftReady = true;
    if (mounted) setState(() {});
  }

  Future<void> _loadPreviousReports(
    int clusterId, {
    int? preferredParentId,
  }) async {
    final request = ++_parentRequest;
    if (mounted) setState(() => _loadingParents = true);
    try {
      final response = await widget.api.previousReports(clusterId);
      if (!mounted || request != _parentRequest || _clusterId != clusterId) {
        return;
      }
      final reports = (response['reports'] as List? ?? const [])
          .map((item) => Map<String, dynamic>.from(item as Map))
          .toList();
      _previousReports = reports;
      _parentReportId = reports.any((item) => item['id'] == preferredParentId)
          ? preferredParentId
          : null;
      _followup = _followup || _parentReportId != null;
    } catch (error) {
      if (!mounted || request != _parentRequest || _clusterId != clusterId) {
        return;
      }
      _error = error is ApiException
          ? error.message
          : 'Unable to load follow-up reports.';
    }
    if (mounted) setState(() => _loadingParents = false);
  }

  Future<void> _selectCluster(int? clusterId) async {
    _parentRequest++;
    setState(() {
      _followup = false;
      _loadingParents = false;
      _clusterId = clusterId;
      _parentReportId = null;
      _previousReports = [];
    });
    if (clusterId != null) await _loadPreviousReports(clusterId);
    await _saveDraft();
  }

  Future<void> _pickPhoto(ImageSource source) async {
    _pickingPhoto = true;
    await _saveDraft();
    try {
      final image = await _picker.pickImage(
        source: source,
        imageQuality: 85,
        maxWidth: 2200,
        maxHeight: 2200,
        requestFullMetadata: false,
      );
      if (image != null && mounted) setState(() => _photo = image);
    } catch (_) {
      if (mounted) {
        setState(
          () => _error = 'Camera or photo access was not available. Check app permissions.',
        );
      }
    } finally {
      _pickingPhoto = false;
      await _saveDraft();
    }
  }

  Future<void> _captureLocation() async {
    if (_gettingLocation) return;
    final request = ++_locationRequest;
    setState(() {
      _gettingLocation = true;
      _gpsProgressAccuracy = null;
      _approximatePosition = null;
      _locationMessage = 'Finding your location… Allow access if asked.';
      _error = null;
    });
    try {
      if (!await Geolocator.isLocationServiceEnabled()) {
        throw const ApiException('Turn on Location/GPS, then try again.');
      }
      var permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied && !_permissionAsked) {
        _permissionAsked = true;
        _requestingPermission = true;
        try {
          permission = await Geolocator.requestPermission();
        } finally {
          _requestingPermission = false;
        }
      }
      if (permission == LocationPermission.denied ||
          permission == LocationPermission.deniedForever) {
        throw const ApiException(
          'Allow location access or place a pin on the map.',
        );
      }
      if (!mounted || !widget.active || request != _locationRequest) {
        if (mounted && request == _locationRequest) {
          setState(() => _gettingLocation = false);
        }
        return;
      }
      final position = await _findAccurateGps(_maxGpsAccuracy);
      if (!mounted || !widget.active || request != _locationRequest) {
        if (mounted && request == _locationRequest) {
          setState(() => _gettingLocation = false);
        }
        return;
      }
      _location = ReportLocation.gps(
        latitude: position.latitude,
        longitude: position.longitude,
        accuracy: position.accuracy,
      );
      _selectedPlaceLabel = null;
      _approximatePosition = null;
      _locationMessage =
          'Location found · about ${position.accuracy.round()} m accuracy. Check the pin.';
      await _fillNearbyAddress(_location!);
    } catch (_) {
      if (!mounted || !widget.active || request != _locationRequest) return;
      await _findApproximateArea(request);
    }
    if (mounted && request == _locationRequest) {
      setState(() {
        _gettingLocation = false;
        _gpsProgressAccuracy = null;
      });
      await _saveDraft();
    }
  }

  @override
  void didUpdateWidget(covariant SubmitReportScreen oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (!widget.active) {
      if (_gettingLocation && _location == null) _autoCaptureTried = false;
      _cancelGps();
    }
    if (widget.active && !oldWidget.active) unawaited(_tryAutoCapture());
  }

  Future<void> _tryAutoCapture() async {
    if (!widget.active ||
        _form == null ||
        _location != null ||
        _autoCaptureTried ||
        _gettingLocation) {
      return;
    }
    _autoCaptureTried = true;
    await _captureLocation();
  }

  void _cancelGps() {
    _locationRequest++;
    _gettingLocation = false;
    _gpsProgressAccuracy = null;
    _gpsDeadline?.cancel();
    unawaited(_gpsSubscription?.cancel());
    if (_gpsResult != null && !_gpsResult!.isCompleted) {
      _gpsResult!.completeError(
        const ApiException('Location stopped. Try again or place a pin.'),
      );
    }
  }

  double get _maxGpsAccuracy =>
      double.tryParse(
        (_form?['location'] as Map?)?['max_gps_accuracy_meters']?.toString() ??
            '',
      ) ??
      100;

  Future<Position> _findAccurateGps(double maxAccuracy) async {
    final result = Completer<Position>();
    _gpsResult = result;
    StreamSubscription<Position>? subscription;
    Position? best;
    Timer? deadline;
    Timer? fallbackTimer;
    bool fallbackRequested = false;

    void receive(Position position) {
      if (result.isCompleted || !mounted || !widget.active) return;
      if (!position.accuracy.isFinite || position.accuracy < 0) return;
      final age = DateTime.now().difference(position.timestamp);
      if (age.inSeconds > 30 ||
          age.inSeconds < -5 ||
          !position.latitude.isFinite ||
          !position.longitude.isFinite ||
          position.latitude.abs() > 85.05112878 ||
          position.longitude.abs() > 180) {
        return;
      }
      if (best == null || position.accuracy < best!.accuracy) {
        best = position;
        setState(() => _gpsProgressAccuracy = position.accuracy);
        if (position.accuracy > maxAccuracy) _approximatePosition = position;
      }
      if (position.accuracy <= (maxAccuracy < 20 ? maxAccuracy : 20)) {
        result.complete(position);
      }
    }

    void fallback() {
      if (fallbackRequested || result.isCompleted) return;
      fallbackRequested = true;
      Geolocator.getCurrentPosition(
        locationSettings: const LocationSettings(
          accuracy: LocationAccuracy.high,
          timeLimit: Duration(seconds: 12),
        ),
      ).then(receive).catchError((Object _) {
        /* Keep the main GPS stream and map fallback available. */
      });
    }

    subscription = Geolocator.getPositionStream(
      locationSettings: const LocationSettings(
        accuracy: LocationAccuracy.bestForNavigation,
        distanceFilter: 0,
      ),
    ).listen(receive, onError: (Object error) => fallback());
    _gpsSubscription = subscription;
    fallbackTimer = Timer(const Duration(seconds: 8), fallback);
    deadline = Timer(const Duration(seconds: 30), () {
      if (result.isCompleted) return;
      if (best != null && best!.accuracy <= maxAccuracy) {
        result.complete(best);
        return;
      }
      final bestAccuracy = best?.accuracy.round();
      result.completeError(
        ApiException(
          bestAccuracy == null
              ? 'Location not found. Try outdoors or place a pin.'
              : 'Approximate: ±$bestAccuracy m. Try outdoors or place a pin.',
        ),
      );
    });
    _gpsDeadline = deadline;

    try {
      return await result.future;
    } finally {
      deadline.cancel();
      fallbackTimer.cancel();
      await subscription.cancel();
      if (_gpsResult == result) {
        _gpsSubscription = null;
        _gpsResult = null;
        _gpsDeadline = null;
      }
    }
  }

  LatLng? _coordinates(Map? value) {
    final latitude = double.tryParse(value?['center_lat']?.toString() ?? '');
    final longitude = double.tryParse(value?['center_lng']?.toString() ?? '');
    if (latitude == null ||
        longitude == null ||
        !latitude.isFinite ||
        !longitude.isFinite ||
        latitude.abs() > 85.05112878 ||
        longitude.abs() > 180) {
      return null;
    }
    return LatLng(latitude, longitude);
  }

  Future<void> _chooseManualLocation({
    LatLng? areaCenter,
    double? areaAccuracy,
  }) async {
    _cancelGps();
    areaCenter ??= _areaCenter;
    areaAccuracy ??= _areaAccuracy;
    if (_approximatePosition != null &&
        DateTime.now().difference(_approximatePosition!.timestamp).inMinutes >=
            5) {
      _approximatePosition = null;
    }
    final settings = _form?['location'] as Map?;
    final barangayCenter = _coordinates(settings?['barangay'] as Map?);
    LatLng? clusterCenter;
    for (final cluster in _clusters) {
      if (cluster['id'] == _clusterId) clusterCenter = _coordinates(cluster);
    }
    final location = await Navigator.of(context).push<ReportLocation>(
      MaterialPageRoute(
        builder: (_) => LocationPickerScreen(
          api: widget.api,
          initialName: _sitio.text,
          // The fallback centers the map only. It never selects a report pin.
          initialCenter:
              _location?.point ??
              areaCenter ??
              (_approximatePosition == null
                  ? null
                  : LatLng(
                      _approximatePosition!.latitude,
                      _approximatePosition!.longitude,
                    )) ??
              clusterCenter ??
              barangayCenter ??
              const LatLng(10.2833, 123.8833),
          initialLocation: _location,
          approximateCenter:
              areaCenter ??
              (_approximatePosition == null
                  ? null
                  : LatLng(
                      _approximatePosition!.latitude,
                      _approximatePosition!.longitude,
                    )),
          approximateAccuracy: areaAccuracy ?? _approximatePosition?.accuracy,
          barangayCenter: barangayCenter,
          maxDistanceMeters: double.tryParse(
            settings?['max_distance_meters']?.toString() ?? '',
          ),
        ),
      ),
    );
    if (!mounted) return;
    if (location == null) {
      setState(
        () => _locationMessage = _location != null
            ? 'Your selected pin is saved.'
            : 'Search for a place or choose a pin on the map.',
      );
      return;
    }
    setState(() {
      _location = location;
      _selectedPlaceLabel = null;
      _error = null;
    });
    await _fillNearbyAddress(location);
    await _saveDraft();
  }

  Future<void> _findApproximateArea(int request) async {
    LatLng? center;
    double? accuracy;
    final device = _approximatePosition;
    if (device != null &&
        DateTime.now().difference(device.timestamp).inSeconds < 30) {
      center = LatLng(device.latitude, device.longitude);
      accuracy = device.accuracy;
    }
    if (center == null || accuracy! > 5000) {
      try {
        final area = await widget.api.approximateArea();
        final estimate = area['accuracy'] as double?;
        if (center == null || (estimate != null && estimate < accuracy!)) {
          center = LatLng(
            area['latitude'] as double,
            area['longitude'] as double,
          );
          accuracy = estimate;
        }
      } catch (_) {
        /* Address search and the map stay available. */
      }
    }
    if (!mounted ||
        !widget.active ||
        request != _locationRequest ||
        _location != null) {
      return;
    }
    setState(() {
      _areaCenter = center;
      _areaAccuracy = accuracy;
      _locationMessage = center == null
          ? 'Location unavailable. Search a place or choose your spot on the map.'
          : 'Approximate area found. Choose your exact spot on the map.';
    });
  }

  Future<void> _fillNearbyAddress(ReportLocation point) async {
    if (!widget.api.supportsCloudAccounts || _sitio.text.trim().isNotEmpty) {
      return;
    }
    try {
      final result = await widget.api.cloudRequest(
        'places.php',
        query: {
          'latitude': '${point.latitude}',
          'longitude': '${point.longitude}',
        },
      );
      if (!mounted || _location != point || _sitio.text.trim().isNotEmpty) {
        return;
      }
      final places = result['places'] as List? ?? [];
      if (places.isNotEmpty) {
        final name = '${places.first['label']}';
        _sitio.text = name.length > 120 ? name.substring(0, 120) : name;
      }
    } catch (_) {
      /* Missing address labels do not change the selected pin. */
    }
  }

  void _searchLocationName(String value) {
    _placeTimer?.cancel();
    final request = ++_placeRequest;
    setState(() {
      _placeSuggestions = [];
      _placeMessage = null;
      if (_selectedPlaceLabel != null && value.trim() != _selectedPlaceLabel) {
        _selectedPlaceLabel = null;
        _location = null;
      }
    });
    _draftEdited();
    if (!widget.api.supportsCloudAccounts || value.trim().length < 3) return;
    _placeTimer = Timer(const Duration(milliseconds: 700), () async {
      if (mounted) setState(() => _placeMessage = 'Finding places...');
      try {
        final response = await widget.api.cloudRequest(
          'places.php',
          query: {'q': value.trim()},
        );
        if (!mounted || request != _placeRequest) return;
        setState(() {
          _placeSuggestions = (response['places'] as List? ?? [])
              .map((p) => Map<String, dynamic>.from(p as Map))
              .toList();
          _placeMessage = _placeSuggestions.isEmpty
              ? 'No matching places. Keep your landmark and choose the pin on the map.'
              : 'Choose your location below.';
        });
      } catch (_) {
        if (mounted && request == _placeRequest) {
          setState(
            () => _placeMessage = 'Search unavailable. Keep your landmark and choose the pin on the map.',
          );
        }
      }
    });
  }

  void _selectPlace(Map<String, dynamic> place) {
    final latitude = double.tryParse('${place['latitude']}'),
        longitude = double.tryParse('${place['longitude']}');
    if (latitude == null ||
        longitude == null ||
        !latitude.isFinite ||
        !longitude.isFinite ||
        latitude.abs() > 85.05112878 ||
        longitude.abs() > 180) {
      return;
    }
    _cancelGps();
    _placeTimer?.cancel();
    _placeRequest++;
    final label = '${place['label']}';
    setState(() {
      _location = ReportLocation.manual(
        latitude: latitude,
        longitude: longitude,
      );
      _gettingLocation = false;
      _gpsProgressAccuracy = null;
      _approximatePosition = null;
      _selectedPlaceLabel = label.length > 120
          ? label.substring(0, 120)
          : label;
      _sitio.text = _selectedPlaceLabel!;
      _placeSuggestions = [];
      _placeMessage =
          'Location selected. Check its pin using Adjust pin on map.';
      _error = null;
    });
    FocusScope.of(context).unfocus();
    _draftEdited();
  }

  void _nextFromSite() {
    if (_followup && _parentReportId == null) {
      setState(() => _error = 'Choose the previous report.');
      return;
    }
    final alive = int.tryParse(_aliveCount.text.trim());
    if (_photo == null) {
      setState(() => _error = 'Take or select a current mangrove photo.');
      return;
    }
    if (_location == null) {
      setState(
        () => _error = 'Search for a place or choose your spot on the map.',
      );
      return;
    }
    if (_sitio.text.trim().isEmpty) {
      setState(() => _error = 'Enter the sitio or location name.');
      return;
    }
    if (alive == null || alive < 0 || (_clusterId == null && alive < 1)) {
      setState(
        () => _error = _clusterId == null
            ? 'A new site needs at least one living mangrove.'
            : 'Enter a valid whole number of living mangroves.',
      );
      return;
    }
    setState(() {
      _error = null;
      _step = 1;
    });
    _draftEdited();
  }

  void _nextFromHealth() async {
    for (final criterion in _criteria.where(
      (item) => item['selection_mode'] == 'single',
    )) {
      final code = criterion['code'].toString();
      if ((_observations[code] ?? const []).length != 1) {
        setState(() => _error = 'Choose one answer for ${criterion['name']}.');
        return;
      }
    }
    if (!await _fetchPreview() || !mounted || _step != 1) return;
    setState(() {
      _error = null;
      _step = 2;
    });
    _draftEdited();
  }

  void goBack() {
    if (_busy) return;
    if (_step > 0) {
      _editStep(_step - 1);
    } else {
      widget.onExit?.call();
    }
  }

  void _editStep(int step) {
    setState(() {
      _step = step;
      _confirmed = false;
      _error = null;
    });
    _draftEdited();
  }

  void _review() async {
    if (_rootType == null || _leafShape == null || _barkTexture == null) {
      setState(() => _error = 'Choose the roots, leaves and bark.');
      return;
    }
    if (_remarks.text.length > 5000) {
      setState(() => _error = 'Keep notes under 5,000 characters.');
      return;
    }
    if (!await _fetchPreview() || !mounted || _step != 2) return;
    setState(() {
      _step = 3;
      _confirmed = false;
      _error = null;
    });
    _draftEdited();
  }

  Future<void> _submit() async {
    if (_busy || _step != 3) return;
    if (!_confirmed) {
      setState(() => _error = 'Confirm these details are from this visit.');
      return;
    }
    final approved = await showDialog<bool>(
      context: context,
      builder: (dialog) => AlertDialog(
        title: const Text('Submit report?'),
        content: const Text(
          'Check that your photo, location and answers are correct.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(dialog, false),
            child: const Text('Keep editing'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(dialog, true),
            child: const Text('Submit'),
          ),
        ],
      ),
    );
    if (approved != true || !mounted || _busy) return;

    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await _saveDraft();
      // A resumed draft must use a current server assessment before submission.
      if (!await _fetchPreview()) return;
      final fields = <String, String>{
        ..._location!.fields,
        'sitio_name': _sitio.text,
        'guardian_remarks': _remarks.text,
        'root_type': _rootType!,
        'leaf_shape': _leafShape!,
        'bark_texture': _barkTexture!,
        'observed_alive_count': _aliveCount.text,
        'field_confirmation': '1',
      };
      if (_clusterId != null) fields['cluster_id'] = '$_clusterId';
      if (_parentReportId != null) {
        fields['parent_report_id'] = '$_parentReportId';
      }
      final response = await widget.api.submitReport(
        fields: fields,
        observations: _observations,
        photoPath: _photo!.path,
      );
      _clearingDraft = true;
      if (_draftScope != null) await _draftStore.clear(_draftScope!);
      if (!mounted) return;
      final report = Map<String, dynamic>.from(response['report'] as Map);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            report['status'] == 'verified'
                ? 'Report ${report['report_code']} was automatically verified as Healthy.'
                : 'Submitted ${report['report_code']} for expert or admin review.',
          ),
        ),
      );
      _reset();
      _lastDraft = null;
      _draftStatus.value = '';
      widget.onSubmitted();
    } catch (error) {
      if (mounted) {
        setState(
          () => _error = error is ApiException
              ? error.message
              : 'Report submission failed.',
        );
      }
    } finally {
      _clearingDraft = false;
      if (mounted) setState(() => _busy = false);
    }
  }

  void _reset() {
    _placeTimer?.cancel();
    _placeRequest++;
    _placeSuggestions = [];
    _placeMessage = null;
    _selectedPlaceLabel = null;
    _previewTimer?.cancel();
    _previewRequest++;
    _preview = null;
    _previewError = null;
    _previewBusy = false;
    _formKey.currentState?.reset();
    _sitio.clear();
    _aliveCount.clear();
    _remarks.clear();
    _observations.clear();
    _previousReports = [];
    _followup = false;
    _parentRequest++;
    _loadingParents = false;
    _clusterId = null;
    _parentReportId = null;
    _rootType = null;
    _leafShape = null;
    _barkTexture = null;
    _photo = null;
    _location = null;
    _approximatePosition = null;
    _autoCaptureTried = false;
    _confirmed = false;
    _step = 0;
  }

  List<Map<String, dynamic>> get _criteria =>
      (_form?['criteria'] as List? ?? const [])
          .map((item) => Map<String, dynamic>.from(item as Map))
          .toList();

  List<Map<String, dynamic>> get _clusters =>
      (_form?['clusters'] as List? ?? const [])
          .map((item) => Map<String, dynamic>.from(item as Map))
          .toList();

  List<String> _traits(String key) =>
      ((_form?['traits'] as Map?)?[key] as List? ?? const [])
          .map((item) => item.toString())
          .toList();

  String _assetUrl(String rawPath) {
    var path = rawPath.replaceAll('\\', '/').replaceFirst(RegExp(r'^/+'), '');
    path = path.replaceFirst(RegExp(r'^(?:public/)?assets/'), '');
    return widget.api.resolve('../assets/$path').toString();
  }

  @override
  Widget build(BuildContext context) {
    if (_form == null && _error == null) {
      return const Center(child: CircularProgressIndicator());
    }
    if (_form == null) {
      return Center(
        child: FilledButton.tonal(onPressed: _loadForm, child: Text(_error!)),
      );
    }
    return Form(
      key: _formKey,
      onChanged: _draftEdited,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 8, 20, 8),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  _parentReportId == null ? 'New report' : 'Follow-up report',
                  style: Theme.of(context).textTheme.headlineSmall
                      ?.copyWith(fontWeight: FontWeight.w800),
                ),
                const Text('Add details, review, then submit.'),
                if (_draftScope != null)
                  ValueListenableBuilder<String>(
                    valueListenable: _draftStatus,
                    builder: (_, text, _) => text.isEmpty
                        ? const SizedBox.shrink()
                        : Text(
                            text,
                            style: Theme.of(context).textTheme.bodySmall,
                          ),
                  ),
                if (_error != null) ...[
                  const SizedBox(height: 10),
                  Container(
                    padding: const EdgeInsets.all(11),
                    decoration: BoxDecoration(
                      color: Colors.red.shade50,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Text(
                      _error!,
                      style: TextStyle(color: Colors.red.shade900),
                    ),
                  ),
                ],
              ],
            ),
          ),
          Expanded(
            child: Stepper(
              type: StepperType.horizontal,
              currentStep: _step,
              onStepTapped: _busy
                  ? null
                  : (value) {
                      if (value < _step) _editStep(value);
                    },
              controlsBuilder: (_, _) => const SizedBox.shrink(),
              steps: [
                Step(
                  title: Text(_step == 0 ? 'Site' : ''),
                  isActive: _step >= 0,
                  state: _step > 0 ? StepState.complete : StepState.indexed,
                  content: _siteStep(),
                ),
                Step(
                  title: Text(_step == 1 ? 'Health' : ''),
                  isActive: _step >= 1,
                  state: _step > 1 ? StepState.complete : StepState.indexed,
                  content: _healthStep(),
                ),
                Step(
                  title: Text(_step == 2 ? 'Details' : ''),
                  isActive: _step >= 2,
                  state: _step > 2 ? StepState.complete : StepState.indexed,
                  content: _speciesStep(),
                ),
                Step(
                  title: Text(_step == 3 ? 'Review' : ''),
                  isActive: _step >= 3,
                  content: _reviewStep(),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _siteStep() => Column(
    crossAxisAlignment: CrossAxisAlignment.stretch,
    children: [
      _Section(
        title: 'Photo',
        child: Column(
          children: [
            if (_photo != null)
              ClipRRect(
                borderRadius: BorderRadius.circular(14),
                child: AspectRatio(
                  aspectRatio: 4 / 3,
                  child: Image.file(File(_photo!.path), fit: BoxFit.cover),
                ),
              )
            else
              Container(
                height: 155,
                decoration: BoxDecoration(
                  color: const Color(0xFFE8EEE5),
                  borderRadius: BorderRadius.circular(14),
                ),
                child: const Center(
                  child: Icon(Icons.add_a_photo_outlined, size: 46),
                ),
              ),
            const SizedBox(height: 10),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: () => _pickPhoto(ImageSource.camera),
                    icon: const Icon(Icons.camera_alt_outlined),
                    label: const Text('Camera'),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: () => _pickPhoto(ImageSource.gallery),
                    icon: const Icon(Icons.photo_library_outlined),
                    label: const Text('Gallery'),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
      _Section(
        title: 'Location',
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(
              _gettingLocation
                  ? (_gpsProgressAccuracy == null
                        ? 'Finding your location…'
                        : 'Improving location · about ${_gpsProgressAccuracy!.round()} m')
                  : _locationMessage ??
                        (_location != null
                            ? 'Check your selected pin.'
                            : 'Search a place or choose your spot on the map.'),
              key: const ValueKey('automatic-location-status'),
            ),
            const SizedBox(height: 12),
            OutlinedButton.icon(
              key: const ValueKey('manual-location'),
              onPressed: _busy ? null : _chooseManualLocation,
              icon: const Icon(Icons.pin_drop_outlined),
              label: Text(
                _location == null
                    ? 'Choose location on map'
                    : 'Adjust pin on map',
              ),
            ),
            if (_location != null)
              Padding(
                padding: const EdgeInsets.only(top: 8),
                child: Text(
                  '${_location!.source == 'manual' ? 'Manual pin' : 'Device location'}: '
                  '${_location!.latitude.toStringAsFixed(6)}, '
                  '${_location!.longitude.toStringAsFixed(6)}',
                  key: const ValueKey('report-location-summary'),
                ),
              ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _sitio,
              onChanged: _searchLocationName,
              decoration: const InputDecoration(
                labelText: 'Sitio or location name',
                helperText: 'Choose a place or enter a landmark.',
                helperMaxLines: 2,
              ),
              validator: (value) => value == null || value.trim().isEmpty
                  ? 'Enter the sitio or location name.'
                  : null,
            ),
            if (_placeMessage != null)
              Text(
                _placeMessage!,
                style: Theme.of(context).textTheme.bodySmall,
              ),
            ..._placeSuggestions.map(
              (place) => ListTile(
                contentPadding: EdgeInsets.zero,
                leading: const Icon(Icons.place_outlined),
                title: Text('${place['label']}'),
                onTap: () => _selectPlace(place),
              ),
            ),
            const SizedBox(height: 12),
            DropdownButtonFormField<int>(
              key: ValueKey('cluster-$_clusterId'),
              initialValue: _clusterId,
              decoration: const InputDecoration(labelText: 'Site'),
              isExpanded: true,
              items: [
                const DropdownMenuItem<int>(
                  value: null,
                  child: Text('New site'),
                ),
                ..._clusters.map(
                  (cluster) => DropdownMenuItem<int>(
                    value: cluster['id'] as int,
                    child: Text(
                      cluster['name']?.toString() ??
                          cluster['cluster_code'].toString(),
                    ),
                  ),
                ),
              ],
              onChanged: _selectCluster,
            ),
            if (_loadingParents) const LinearProgressIndicator(),
            if (_previousReports.isNotEmpty)
              SwitchListTile(
                contentPadding: EdgeInsets.zero,
                title: const Text('This is a follow-up'),
                value: _followup,
                onChanged: (value) {
                  setState(() {
                    _followup = value;
                    if (!value) _parentReportId = null;
                  });
                  _draftEdited();
                },
              ),
            if (_followup) ...[
              const SizedBox(height: 12),
              DropdownButtonFormField<int>(
                key: ValueKey(
                  'parent-$_clusterId-$_parentReportId-${_previousReports.length}',
                ),
                initialValue: _parentReportId,
                isExpanded: true,
                decoration: InputDecoration(
                  labelText: 'Previous report',
                  suffixIcon: _loadingParents
                      ? const Padding(
                          padding: EdgeInsets.all(12),
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : null,
                ),
                items: _previousReports
                    .map(
                      (report) => DropdownMenuItem<int>(
                        value: report['id'] as int,
                        child: Text(
                          '${report['report_code']} · ${report['health']}',
                        ),
                      ),
                    )
                    .toList(),
                onChanged: _loadingParents
                    ? null
                    : (value) => setState(() => _parentReportId = value),
              ),
              if (!_loadingParents && _previousReports.isEmpty)
                const Padding(
                  padding: EdgeInsets.only(top: 6),
                  child: Text(
                    'No verified report is currently available for follow-up.',
                  ),
                ),
            ],
            const SizedBox(height: 12),
            TextFormField(
              controller: _aliveCount,
              keyboardType: TextInputType.number,
              decoration: const InputDecoration(
                labelText: 'Living mangroves observed',
              ),
              validator: (value) {
                final number = int.tryParse(value ?? '');
                if (number == null || number < 0) {
                  return 'Enter a whole number of living mangroves.';
                }
                if (_clusterId == null && number < 1) {
                  return 'A new site needs at least one living mangrove.';
                }
                return null;
              },
            ),
          ],
        ),
      ),
      if (widget.onExit != null)
        OutlinedButton(onPressed: widget.onExit, child: const Text('Back')),
      FilledButton.icon(
        onPressed: _gettingLocation ? null : _nextFromSite,
        icon: const Icon(Icons.arrow_forward),
        label: const Text('Continue'),
      ),
      const SizedBox(height: 24),
    ],
  );

  Widget _healthStep() => Column(
    crossAxisAlignment: CrossAxisAlignment.stretch,
    children: [
      const Text('Choose what you see.'),
      const SizedBox(height: 12),
      ..._criteria.map(_criterionCard),
      _assessment(),
      Row(
        children: [
          Expanded(
            child: OutlinedButton(onPressed: goBack, child: const Text('Back')),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: FilledButton(
              onPressed: _previewBusy ? null : _nextFromHealth,
              child: const Text('Continue'),
            ),
          ),
        ],
      ),
      const SizedBox(height: 24),
    ],
  );

  Widget _speciesStep() => Column(
    crossAxisAlignment: CrossAxisAlignment.stretch,
    children: [
      _assessment(),
      _Section(
        title: 'Species traits',
        subtitle: 'Choose the roots, leaves and bark you see.',
        child: Column(
          children: [
            _traitDropdown(
              'Root type',
              _rootType,
              _traits('root_type'),
              (value) => setState(() => _rootType = value),
            ),
            const SizedBox(height: 12),
            _traitDropdown(
              'Leaf shape',
              _leafShape,
              _traits('leaf_shape'),
              (value) => setState(() => _leafShape = value),
            ),
            const SizedBox(height: 12),
            _traitDropdown(
              'Bark texture',
              _barkTexture,
              _traits('bark_texture'),
              (value) => setState(() => _barkTexture = value),
            ),
          ],
        ),
      ),
      _Section(
        title: 'Notes',
        child: Column(
          children: [
            TextFormField(
              controller: _remarks,
              maxLines: 4,
              maxLength: 5000,
              decoration: const InputDecoration(
                labelText: 'Notes (optional)',
                hintText: 'Anything else you noticed?',
              ),
            ),
          ],
        ),
      ),
      Row(
        children: [
          Expanded(
            child: OutlinedButton(
              onPressed: _busy ? null : goBack,
              child: const Text('Back'),
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: FilledButton.icon(
              onPressed: _busy || _previewBusy ? null : _review,
              icon: _busy
                  ? const SizedBox.square(
                      dimension: 18,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : const Icon(Icons.cloud_upload_outlined),
              label: const Text('Review report'),
            ),
          ),
        ],
      ),
      const SizedBox(height: 24),
    ],
  );

  Widget _reviewCard(String title, int step, List<Widget> children) => _Section(
    title: title,
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        ...children,
        Align(
          alignment: Alignment.centerRight,
          child: TextButton(
            onPressed: _busy ? null : () => _editStep(step),
            child: Text('Edit ${title.toLowerCase()}'),
          ),
        ),
      ],
    ),
  );

  Widget _reviewStep() {
    String cluster = 'New site';
    String? parent;
    for (final item in _clusters) {
      if (item['id'] == _clusterId) cluster = '${item['name']}';
    }
    for (final item in _previousReports) {
      if (item['id'] == _parentReportId) parent = '${item['report_code']}';
    }
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const Text('Check your details. Tap Edit to make changes.'),
        const SizedBox(height: 12),
        _reviewCard('Site', 0, [
          if (_photo != null)
            Image.file(File(_photo!.path), height: 150, fit: BoxFit.contain),
          Text('Site: $cluster'),
          Text('Location: ${_sitio.text.trim()}'),
          if (_location != null)
            Text(
              'Pin: ${_location!.latitude.toStringAsFixed(6)}, ${_location!.longitude.toStringAsFixed(6)}',
            ),
          if (_location != null)
            Text(
              _location!.source == 'gps'
                  ? 'Device location (+/-${_location!.accuracy!.round()} m)'
                  : 'Manual pin',
            ),
          Text('Living mangroves: ${_aliveCount.text.trim()}'),
          if (parent != null) Text('Follow-up to: $parent'),
        ]),
        _reviewCard(
          'Health',
          1,
          _criteria.map((criterion) {
            final selected = _observations['${criterion['code']}'] ?? [];
            final labels = (criterion['options'] as List? ?? [])
                .where((option) => selected.contains(option['id']))
                .map((option) => option['label'])
                .join(', ');
            return Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: Text(
                '${criterion['name']}: ${labels.isEmpty ? 'None selected' : labels}',
              ),
            );
          }).toList(),
        ),
        _reviewCard('Details', 2, [
          Text('Roots: ${_rootType ?? ''}'),
          Text('Leaves: ${_leafShape ?? ''}'),
          Text('Bark: ${_barkTexture ?? ''}'),
          Text(
            'Notes: ${_remarks.text.trim().isEmpty ? 'None' : _remarks.text.trim()}',
          ),
        ]),
        _assessment(),
        const Text(
          'Healthy reports are verified automatically. Others go for review.',
        ),
        CheckboxListTile(
          value: _confirmed,
          contentPadding: EdgeInsets.zero,
          controlAffinity: ListTileControlAffinity.leading,
          title: const Text('These details are from this visit.'),
          onChanged: _busy
              ? null
              : (value) => setState(() => _confirmed = value ?? false),
        ),
        Row(
          children: [
            Expanded(
              child: OutlinedButton(
                onPressed: _busy ? null : goBack,
                child: const Text('Back'),
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: FilledButton(
                onPressed: _busy ? null : _submit,
                child: Text(_busy ? 'Submitting...' : 'Submit report'),
              ),
            ),
          ],
        ),
        const SizedBox(height: 24),
      ],
    );
  }

  Widget _traitDropdown(
    String label,
    String? value,
    List<String> values,
    ValueChanged<String?> changed,
  ) => DropdownButtonFormField<String>(
    key: ValueKey('$label-$value'),
    initialValue: value,
    isExpanded: true,
    decoration: InputDecoration(labelText: label),
    items: values
        .map(
          (item) => DropdownMenuItem(
            value: item,
            child: Text(item, overflow: TextOverflow.ellipsis),
          ),
        )
        .toList(),
    onChanged: (value) {
      changed(value);
      _queuePreview();
    },
    validator: (selected) => selected == null ? 'Select $label.' : null,
  );

  Widget _criterionCard(Map<String, dynamic> criterion) {
    final code = criterion['code'].toString();
    final selected = _observations[code] ?? <int>[];
    final options = (criterion['options'] as List? ?? const [])
        .map((item) => Map<String, dynamic>.from(item as Map))
        .toList();
    final single = criterion['selection_mode'] == 'single';
    final guideImage = criterion['guide_image']?.toString();
    return _Section(
      title: criterion['name']?.toString() ?? 'Health check',
      subtitle: single
          ? criterion['question_text']?.toString()
          : '${criterion['question_text']} Choose all that apply.',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          if (guideImage != null && guideImage.isNotEmpty) ...[
            ClipRRect(
              borderRadius: BorderRadius.circular(12),
              child: Image.network(
                _assetUrl(guideImage),
                height: 150,
                fit: BoxFit.contain,
                errorBuilder: (_, _, _) => const SizedBox.shrink(),
              ),
            ),
            const SizedBox(height: 10),
          ],
          if (single)
            RadioGroup<int>(
              groupValue: selected.isEmpty ? null : selected.first,
              onChanged: (value) {
                setState(
                  () => _observations[code] = value == null ? [] : [value],
                );
                _queuePreview();
              },
              child: Column(
                children: options
                    .map(
                      (option) => RadioListTile<int>(
                        value: option['id'] as int,
                        contentPadding: EdgeInsets.zero,
                        title: Text(option['label']?.toString() ?? ''),
                        subtitle: option['image_path'] == null
                            ? null
                            : Image.network(
                                _assetUrl('${option['image_path']}'),
                                height: 90,
                                fit: BoxFit.contain,
                                errorBuilder: (_, _, _) =>
                                    const SizedBox.shrink(),
                              ),
                      ),
                    )
                    .toList(),
              ),
            )
          else
            ...options.map((option) {
              final id = option['id'] as int;
              return CheckboxListTile(
                value: selected.contains(id),
                contentPadding: EdgeInsets.zero,
                title: Text(option['label']?.toString() ?? ''),
                subtitle: option['image_path'] == null
                    ? null
                    : Image.network(
                        _assetUrl('${option['image_path']}'),
                        height: 90,
                        fit: BoxFit.contain,
                        errorBuilder: (_, _, _) => const SizedBox.shrink(),
                      ),
                controlAffinity: ListTileControlAffinity.leading,
                onChanged: (checked) {
                  setState(() {
                    final values = List<int>.from(selected);
                    const aggregateCodes = [
                      'none_of_the_above',
                      'all_of_the_above',
                      'unknown',
                    ];
                    if (checked == true) {
                      if (aggregateCodes.contains(option['code'])) {
                        values.clear();
                      } else {
                        final aggregateIds = options
                            .where(
                              (item) => aggregateCodes.contains(item['code']),
                            )
                            .map((item) => item['id']);
                        values.removeWhere(aggregateIds.contains);
                      }
                    }
                    checked == true ? values.add(id) : values.remove(id);
                    _observations[code] = values.toSet().toList();
                    if (checked == true) {
                      _resolveObservationConflict(code, '${option['code']}');
                    }
                  });
                  _queuePreview();
                },
              );
            }),
        ],
      ),
    );
  }

  void _resolveObservationConflict(String group, String option) {
    String? otherGroup;
    final hasNoAnimals = _criteria
        .where((c) => c['code'] == 'negative_signs')
        .any(
          (c) => (c['options'] as List).any((o) => o['code'] == 'no_animals'),
        );
    bool includesNoAnimals(String code) =>
        code == 'no_animals' || (code == 'all_of_the_above' && hasNoAnimals);
    bool shouldRemove(String code) => otherGroup == 'bio_indicators'
        ? !['none_of_the_above', 'unknown'].contains(code)
        : includesNoAnimals(code);
    if (group == 'negative_signs' && includesNoAnimals(option)) {
      otherGroup = 'bio_indicators';
    } else if (group == 'bio_indicators' &&
        !['none_of_the_above', 'unknown'].contains(option)) {
      otherGroup = 'negative_signs';
    }
    if (otherGroup == null) return;
    for (final criterion in _criteria.where(
      (item) => item['code'] == otherGroup,
    )) {
      final conflicts = (criterion['options'] as List)
          .where((item) => shouldRemove('${item['code']}'))
          .map((item) => item['id'])
          .toSet();
      _observations[otherGroup]?.removeWhere(conflicts.contains);
    }
  }

  void _queuePreview() {
    _draftEdited();
    _previewTimer?.cancel();
    _previewRequest++;
    setState(() {
      _preview = null;
      _previewError = null;
      _previewBusy = false;
    });
    if (_criteria
        .where((item) => item['selection_mode'] == 'single')
        .any((item) => (_observations['${item['code']}'] ?? []).length != 1)) {
      return;
    }
    _previewTimer = Timer(const Duration(milliseconds: 300), _fetchPreview);
  }

  Future<bool> _fetchPreview() async {
    _previewTimer?.cancel();
    final request = ++_previewRequest;
    setState(() {
      _previewBusy = true;
      _previewError = null;
    });
    try {
      final result = await widget.api.reportPreview({
        'observations': {
          for (final entry in _observations.entries)
            entry.key: List<int>.from(entry.value),
        },
        'root_type': _rootType,
        'leaf_shape': _leafShape,
        'bark_texture': _barkTexture,
      });
      if (!mounted || request != _previewRequest) return false;
      setState(() {
        _preview = result;
        _error = null;
      });
      return true;
    } catch (error) {
      if (!mounted || request != _previewRequest) return false;
      setState(() {
        _preview = null;
        _previewError = error is ApiException
            ? error.message
            : 'Could not check the result. Try again.';
      });
      return false;
    } finally {
      if (mounted && request == _previewRequest) {
        setState(() => _previewBusy = false);
      }
    }
  }

  Widget _assessment() {
    final health = _preview?['classification'] as Map?;
    final species = (_preview?['species'] as Map?)?['best'] as Map?;
    return _Section(
      title: 'Health check',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          if (_previewBusy) const LinearProgressIndicator(),
          if (_previewError != null)
            TextButton(
              onPressed: _fetchPreview,
              child: Text('$_previewError Tap to retry.'),
            ),
          if (health == null && !_previewBusy && _previewError == null)
            const Text('Answer the checklist to see the result.'),
          if (health != null) ...[
            Text(
              health['health_score'] == null
                  ? 'Unknown - needs review'
                  : '${health['status']} - ${health['health_score']}/${health['health_max_score']}',
              style: Theme.of(context).textTheme.titleLarge,
            ),
            const Text('6 Healthy · 3–5 Stressed · 0–2 At Risk'),
            for (final row in health['breakdown'] as List? ?? [])
              Text(
                '${row['name']}: ${row['answer']} (${row['points'] == null ? 'Unscored' : '${row['points']}/2'})',
              ),
            const Text(
              'Unknown answers need review. Other choices add context.',
              style: TextStyle(fontSize: 12),
            ),
            const Text(
              'Species assessment',
              style: TextStyle(fontWeight: FontWeight.bold),
            ),
            if (_rootType != null && _leafShape != null && _barkTexture != null)
              Text(
                species == null
                    ? 'Species unclear. An expert can identify it.'
                    : 'Species: ${species['scientific_name']} (${species['confidence']}% trait match)',
              ),
          ],
        ],
      ),
    );
  }
}

class _Section extends StatelessWidget {
  const _Section({required this.title, required this.child, this.subtitle});
  final String title;
  final String? subtitle;
  final Widget child;

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.only(bottom: 14),
    child: Card(
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
            if (subtitle != null) ...[
              const SizedBox(height: 3),
              Text(subtitle!, style: const TextStyle(color: Colors.black54)),
            ],
            const SizedBox(height: 12),
            child,
          ],
        ),
      ),
    ),
  );
}
