import 'dart:io';

import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';
import 'package:image_picker/image_picker.dart';

import '../core/api_client.dart';

class SubmitReportScreen extends StatefulWidget {
  const SubmitReportScreen({
    super.key,
    required this.api,
    required this.onSubmitted,
    this.initialParentReportId,
    this.initialClusterId,
  });

  final ApiClient api;
  final VoidCallback onSubmitted;
  final int? initialParentReportId;
  final int? initialClusterId;

  @override
  State<SubmitReportScreen> createState() => _SubmitReportScreenState();
}

class _SubmitReportScreenState extends State<SubmitReportScreen> {
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
  Position? _position;
  String? _error;
  bool _busy = false;
  bool _gettingLocation = false;
  bool _loadingParents = false;
  bool _confirmed = false;

  @override
  void initState() {
    super.initState();
    _clusterId = widget.initialClusterId;
    _parentReportId = widget.initialParentReportId;
    _loadForm();
  }

  @override
  void dispose() {
    _sitio.dispose();
    _aliveCount.dispose();
    _remarks.dispose();
    super.dispose();
  }

  Future<void> _loadForm() async {
    try {
      _form = await widget.api.reportForm();
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
    } catch (error) {
      _error = error is ApiException
          ? error.message
          : 'Unable to load the field checklist.';
    }
    if (mounted) setState(() {});
  }

  Future<void> _loadPreviousReports(
    int clusterId, {
    int? preferredParentId,
  }) async {
    if (mounted) setState(() => _loadingParents = true);
    try {
      final response = await widget.api.previousReports(clusterId);
      final reports = (response['reports'] as List? ?? const [])
          .map((item) => Map<String, dynamic>.from(item as Map))
          .toList();
      _previousReports = reports;
      _parentReportId = reports.any((item) => item['id'] == preferredParentId)
          ? preferredParentId
          : null;
    } catch (error) {
      _previousReports = [];
      _parentReportId = null;
      _error = error is ApiException
          ? error.message
          : 'Unable to load follow-up reports.';
    }
    if (mounted) setState(() => _loadingParents = false);
  }

  Future<void> _selectCluster(int? clusterId) async {
    setState(() {
      _clusterId = clusterId;
      _parentReportId = null;
      _previousReports = [];
    });
    if (clusterId != null) await _loadPreviousReports(clusterId);
  }

  Future<void> _pickPhoto(ImageSource source) async {
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
    }
  }

  Future<void> _captureLocation() async {
    setState(() {
      _gettingLocation = true;
      _error = null;
    });
    try {
      if (!await Geolocator.isLocationServiceEnabled()) {
        throw const ApiException('Turn on Location/GPS, then try again.');
      }
      var permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
      }
      if (permission == LocationPermission.denied ||
          permission == LocationPermission.deniedForever) {
        throw const ApiException(
          'Location permission is required for field reports.',
        );
      }
      _position = await Geolocator.getCurrentPosition(
        locationSettings: const LocationSettings(
          accuracy: LocationAccuracy.high,
          timeLimit: Duration(seconds: 20),
        ),
      );
    } catch (error) {
      _error = error is ApiException
          ? error.message
          : 'Could not capture the GPS location.';
    }
    if (mounted) setState(() => _gettingLocation = false);
  }

  void _nextFromSite() {
    final alive = int.tryParse(_aliveCount.text.trim());
    if (_photo == null) {
      setState(() => _error = 'Take or select a current mangrove photo.');
      return;
    }
    if (_position == null) {
      setState(() => _error = 'Capture the field GPS location.');
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
  }

  void _nextFromHealth() {
    for (final criterion in _criteria.where(
      (item) => item['selection_mode'] == 'single',
    )) {
      final code = criterion['code'].toString();
      if ((_observations[code] ?? const []).length != 1) {
        setState(() => _error = 'Choose one answer for ${criterion['name']}.');
        return;
      }
    }
    setState(() {
      _error = null;
      _step = 2;
    });
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    if (_rootType == null || _leafShape == null || _barkTexture == null) {
      setState(
        () => _error = 'Select the root type, leaf shape, and bark texture.',
      );
      return;
    }
    if (!_confirmed) {
      setState(
        () => _error =
            'Confirm that this evidence came from the current field visit.',
      );
      return;
    }

    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final fields = <String, String>{
        'latitude': _position!.latitude.toStringAsFixed(8),
        'longitude': _position!.longitude.toStringAsFixed(8),
        'location_accuracy': _position!.accuracy.toStringAsFixed(2),
        'location_source': 'gps',
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
      if (!mounted) return;
      final report = Map<String, dynamic>.from(response['report'] as Map);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            'Submitted ${report['report_code']} for expert verification.',
          ),
        ),
      );
      _reset();
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
      if (mounted) setState(() => _busy = false);
    }
  }

  void _reset() {
    _formKey.currentState?.reset();
    _sitio.clear();
    _aliveCount.clear();
    _remarks.clear();
    _observations.clear();
    _previousReports = [];
    _clusterId = null;
    _parentReportId = null;
    _rootType = null;
    _leafShape = null;
    _barkTexture = null;
    _photo = null;
    _position = null;
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
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 8, 20, 8),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  _parentReportId == null
                      ? 'New field observation'
                      : 'Follow-up observation',
                  style: Theme.of(context).textTheme.headlineSmall
                      ?.copyWith(fontWeight: FontWeight.w800),
                ),
                const Text(
                  'Complete all three steps with evidence from this visit.',
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
                      if (value < _step) setState(() => _step = value);
                    },
              controlsBuilder: (_, _) => const SizedBox.shrink(),
              steps: [
                Step(
                  title: const Text('Site'),
                  isActive: _step >= 0,
                  state: _step > 0 ? StepState.complete : StepState.indexed,
                  content: _siteStep(),
                ),
                Step(
                  title: const Text('Health'),
                  isActive: _step >= 1,
                  state: _step > 1 ? StepState.complete : StepState.indexed,
                  content: _healthStep(),
                ),
                Step(
                  title: const Text('Species'),
                  isActive: _step >= 2,
                  content: _speciesStep(),
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
        title: 'Photo evidence',
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
        title: 'GPS and monitoring site',
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            FilledButton.tonalIcon(
              onPressed: _gettingLocation ? null : _captureLocation,
              icon: _gettingLocation
                  ? const SizedBox.square(
                      dimension: 18,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : const Icon(Icons.my_location),
              label: Text(
                _position == null
                    ? 'Capture GPS location'
                    : 'GPS captured · ±${_position!.accuracy.toStringAsFixed(0)} m',
              ),
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _sitio,
              decoration: const InputDecoration(
                labelText: 'Sitio or location name',
              ),
              validator: (value) => value == null || value.trim().isEmpty
                  ? 'Enter the sitio or location name.'
                  : null,
            ),
            const SizedBox(height: 12),
            DropdownButtonFormField<int>(
              key: ValueKey('cluster-$_clusterId'),
              initialValue: _clusterId,
              decoration: const InputDecoration(
                labelText: 'Existing cluster (optional)',
              ),
              isExpanded: true,
              items: _clusters
                  .map(
                    (cluster) => DropdownMenuItem<int>(
                      value: cluster['id'] as int,
                      child: Text(
                        cluster['name']?.toString() ??
                            cluster['cluster_code'].toString(),
                      ),
                    ),
                  )
                  .toList(),
              onChanged: _loadingParents ? null : _selectCluster,
            ),
            if (_clusterId != null) ...[
              const SizedBox(height: 12),
              DropdownButtonFormField<int>(
                key: ValueKey(
                  'parent-$_clusterId-$_parentReportId-${_previousReports.length}',
                ),
                initialValue: _parentReportId,
                isExpanded: true,
                decoration: InputDecoration(
                  labelText: 'Link as follow-up (optional)',
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
      FilledButton.icon(
        onPressed: _nextFromSite,
        icon: const Icon(Icons.arrow_forward),
        label: const Text('Continue to health checklist'),
      ),
      const SizedBox(height: 24),
    ],
  );

  Widget _healthStep() => Column(
    crossAxisAlignment: CrossAxisAlignment.stretch,
    children: [
      const Text('Use the visual guides and choose what you see at the site.'),
      const SizedBox(height: 12),
      ..._criteria.map(_criterionCard),
      Row(
        children: [
          Expanded(
            child: OutlinedButton(
              onPressed: () => setState(() => _step = 0),
              child: const Text('Back'),
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: FilledButton(
              onPressed: _nextFromHealth,
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
      _Section(
        title: 'Species traits',
        subtitle: 'These traits produce a ranked automatic suggestion for expert review.',
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
        title: 'Final review',
        child: Column(
          children: [
            TextFormField(
              controller: _remarks,
              maxLines: 4,
              maxLength: 5000,
              decoration: const InputDecoration(
                labelText: 'Remarks (optional)',
                hintText: 'Context for the CCENRO expert',
              ),
            ),
            CheckboxListTile(
              value: _confirmed,
              contentPadding: EdgeInsets.zero,
              controlAffinity: ListTileControlAffinity.leading,
              title: const Text(
                'I confirm that the photo, GPS location, count, and checklist came from this field visit.',
              ),
              onChanged: _busy
                  ? null
                  : (value) => setState(() => _confirmed = value ?? false),
            ),
          ],
        ),
      ),
      Row(
        children: [
          Expanded(
            child: OutlinedButton(
              onPressed: _busy ? null : () => setState(() => _step = 1),
              child: const Text('Back'),
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: FilledButton.icon(
              onPressed: _busy ? null : _submit,
              icon: _busy
                  ? const SizedBox.square(
                      dimension: 18,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : const Icon(Icons.cloud_upload_outlined),
              label: Text(_busy ? 'Uploading…' : 'Submit report'),
            ),
          ),
        ],
      ),
      const SizedBox(height: 24),
    ],
  );

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
    onChanged: changed,
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
      subtitle: criterion['question_text']?.toString(),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          if (guideImage != null && guideImage.isNotEmpty) ...[
            ClipRRect(
              borderRadius: BorderRadius.circular(12),
              child: Image.network(
                _assetUrl(guideImage),
                height: 150,
                fit: BoxFit.cover,
                errorBuilder: (_, _, _) => const SizedBox.shrink(),
              ),
            ),
            const SizedBox(height: 10),
          ],
          if (single)
            RadioGroup<int>(
              groupValue: selected.isEmpty ? null : selected.first,
              onChanged: (value) => setState(
                () => _observations[code] = value == null ? [] : [value],
              ),
              child: Column(
                children: options
                    .map(
                      (option) => RadioListTile<int>(
                        value: option['id'] as int,
                        contentPadding: EdgeInsets.zero,
                        title: Text(option['label']?.toString() ?? ''),
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
                controlAffinity: ListTileControlAffinity.leading,
                onChanged: (checked) {
                  setState(() {
                    final values = List<int>.from(selected);
                    checked == true ? values.add(id) : values.remove(id);
                    _observations[code] = values.toSet().toList();
                  });
                },
              );
            }),
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
