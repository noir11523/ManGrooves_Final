import 'package:flutter/material.dart';

import '../core/api_client.dart';
import '../shared/retry_view.dart';
import '../shared/list_filters.dart';
import 'validation_history_screen.dart';

class VerificationScreen extends StatefulWidget {
  const VerificationScreen({super.key, required this.api, this.active = true});

  final ApiClient api;
  final bool active;

  @override
  State<VerificationScreen> createState() => _VerificationScreenState();
}

class _VerificationScreenState extends State<VerificationScreen> {
  Map<String, dynamic>? _data;
  String? _error;
  bool _loading = false;
  int _page = 1;
  String _query = '', _health = '';

  @override
  void didUpdateWidget(covariant VerificationScreen oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.active && !oldWidget.active) _load();
  }

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load({int? page}) async {
    if (_loading) return;
    setState(() {
      _error = null;
      _loading = true;
    });
    try {
      _data = await widget.api.verification(
        page: page ?? _page,
        query: _query,
        health: _health,
      );
      _page = (_data!['page'] as num?)?.toInt() ?? 1;
    } catch (error) {
      _error = error is ApiException
          ? error.message
          : 'Could not load reports. Try again.';
    }
    if (mounted) setState(() => _loading = false);
  }

  @override
  Widget build(BuildContext context) {
    if (_data == null && _error == null) {
      return const Center(child: CircularProgressIndicator());
    }
    if (_data == null) {
      return RetryView(message: _error!, onRetry: _load);
    }
    final summary = Map<String, dynamic>.from(_data!['summary'] as Map);
    final pages = (_data!['pages'] as num?)?.toInt() ?? 1;
    final species = (_data!['species'] as List? ?? const [])
        .map((item) => Map<String, dynamic>.from(item as Map))
        .toList();
    final items = (_data!['items'] as List? ?? const [])
        .map((item) => Map<String, dynamic>.from(item as Map))
        .toList();

    return RefreshIndicator(
      onRefresh: _load,
      child: ListView(
        padding: const EdgeInsets.fromLTRB(20, 8, 20, 32),
        children: [
          if (_loading) const LinearProgressIndicator(),
          if (_error != null)
            TextButton(onPressed: _load, child: Text('$_error Retry')),
          Text(
            'Review reports',
            style: Theme.of(context).textTheme.headlineSmall
                ?.copyWith(fontWeight: FontWeight.w800),
          ),
          const Text('Check the photo and answers, then choose your decision.'),
          Align(
            alignment: Alignment.centerLeft,
            child: TextButton.icon(
              onPressed: () => Navigator.push(
                context,
                MaterialPageRoute<void>(
                  builder: (_) => ValidationHistoryScreen(api: widget.api),
                ),
              ),
              icon: const Icon(Icons.history),
              label: const Text('Review history'),
            ),
          ),
          const SizedBox(height: 16),
          ListFilters(
            hint: 'Site or report number',
            filterLabel: 'Health',
            options: const {
              '': 'All health',
              'Healthy': 'Healthy',
              'Stressed': 'Stressed',
              'At Risk': 'At Risk',
              'Unknown': 'Unknown',
            },
            busy: _loading,
            onApply: (query, health) {
              _query = query;
              _health = health;
              _load(page: 1);
            },
          ),
          Text('${_data!["total"] ?? items.length} results'),
          Wrap(
            spacing: 10,
            runSpacing: 10,
            children: [
              _SummaryChip('Pending', summary['pending'], Colors.orange),
              _SummaryChip('Verified', summary['verified'], Colors.green),
              _SummaryChip('Rejected', summary['rejected'], Colors.red),
            ],
          ),
          const SizedBox(height: 20),
          if (items.isEmpty)
            Card(
              child: Padding(
                padding: EdgeInsets.all(22),
                child: Text(
                  _query.isNotEmpty || _health.isNotEmpty
                      ? 'No pending reports match. Try another search or clear the filters.'
                      : 'No reports waiting for review.',
                ),
              ),
            )
          else
            ...items.map(
              (report) => Padding(
                padding: const EdgeInsets.only(bottom: 10),
                child: Card(
                  child: ListTile(
                    onTap: () async {
                      final reviewed = await Navigator.push<bool>(
                        context,
                        MaterialPageRoute(
                          builder: (_) => ReviewReportScreen(
                            api: widget.api,
                            reportId: report['id'] as int,
                            species: species,
                          ),
                        ),
                      );
                      if (reviewed == true && mounted) _load();
                    },
                    leading: const CircleAvatar(
                      child: Icon(Icons.fact_check_outlined),
                    ),
                    title: Text(report['report_code']?.toString() ?? ''),
                    subtitle: Text(
                      '${report['guardian_name'] ?? ''}\n${report['cluster_name'] ?? report['sitio_name'] ?? 'New site'}',
                    ),
                    isThreeLine: true,
                    trailing: const Icon(Icons.chevron_right),
                  ),
                ),
              ),
            ),
          if (pages > 1)
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                IconButton(
                  tooltip: 'Previous page',
                  onPressed: _page > 1 && !_loading
                      ? () => _load(page: _page - 1)
                      : null,
                  icon: const Icon(Icons.chevron_left),
                ),
                Text('$_page / $pages'),
                IconButton(
                  tooltip: 'Next page',
                  onPressed: _page < pages && !_loading
                      ? () => _load(page: _page + 1)
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

class ReviewReportScreen extends StatefulWidget {
  const ReviewReportScreen({
    super.key,
    required this.api,
    required this.reportId,
    required this.species,
  });

  final ApiClient api;
  final int reportId;
  final List<Map<String, dynamic>> species;

  @override
  State<ReviewReportScreen> createState() => _ReviewReportScreenState();
}

class _ReviewReportScreenState extends State<ReviewReportScreen> {
  final _feedback = TextEditingController();
  Map<String, dynamic>? _report;
  String? _health;
  int? _speciesId;
  String _rarity = 'Unassigned';

  bool _busy = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final response = await widget.api.report(widget.reportId);
      _report = Map<String, dynamic>.from(response['report'] as Map);
      _health = _report!['suggested_health'] == 'Unknown'
          ? null
          : _report!['suggested_health']?.toString();
      _speciesId = _report!['suggested_species_id'] as int?;
      _rarity = _report!['rarity_level']?.toString() ?? 'Unassigned';
    } catch (error) {
      _error = error is ApiException ? error.message : 'Unable to load report.';
    }
    if (mounted) setState(() {});
  }

  bool get _changed =>
      _health != _report?['suggested_health'] ||
      _speciesId != _report?['suggested_species_id'] ||
      _rarity != (_report?['rarity_level'] ?? 'Unassigned');

  Future<void> _review(String action) async {
    if (_busy) return;
    if (action != 'reject' && _health == null) {
      setState(() => _error = 'Choose the final health before saving.');
      return;
    }
    if (action == 'confirm' && _changed) {
      setState(() => _error = 'Use Save correction for your changes.');
      return;
    }
    if (action == 'reject' && _feedback.text.trim().isEmpty) {
      setState(() => _error = 'Enter actionable feedback before rejecting.');
      return;
    }
    final verb = switch (action) {
      'confirm' => 'confirm the original suggestions for',
      'correct' => 'save the correction for',
      _ => 'reject',
    };
    final approved = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Complete review?'),
        content: Text(
          'Are you sure you want to $verb ${_report!['report_code']}?${action == 'reject' ? '' : '\nHealth: ${action == 'confirm' ? _report!['suggested_health'] : _health}\nSpecies: ${_speciesId == null ? 'Unassigned' : widget.species.where((item) => item['id'] == _speciesId).map((item) => item['scientific_name']).join()}'}',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Continue'),
          ),
        ],
      ),
    );
    if (approved != true || !mounted) return;
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final response = await widget.api.reviewReport({
        'report_id': widget.reportId,
        'action': action,
        'final_health': _health,
        'final_species_id': _speciesId,
        'rarity_level': _rarity,

        'expert_feedback': _feedback.text,
      });
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(response['message']?.toString() ?? 'Review saved.'),
        ),
      );
      Navigator.pop(context, true);
    } catch (error) {
      _error = error is ApiException
          ? error.message
          : 'Review could not be saved.';
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  void dispose() {
    _feedback.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(
      title: Text(_report?['report_code']?.toString() ?? 'Review report'),
    ),
    body: _report == null
        ? Center(
            child: _error == null
                ? const CircularProgressIndicator()
                : FilledButton.tonal(onPressed: _load, child: Text(_error!)),
          )
        : _content(context),
  );

  Widget _content(BuildContext context) {
    final photo = _report!['photo_url']?.toString();
    final observations = (_report!['observations'] as List? ?? const [])
        .map((item) => Map<String, dynamic>.from(item as Map))
        .toList();
    return ListView(
      padding: const EdgeInsets.fromLTRB(20, 8, 20, 32),
      children: [
        if (photo != null)
          ClipRRect(
            borderRadius: BorderRadius.circular(16),
            child: AspectRatio(
              aspectRatio: 4 / 3,
              child: Image.network(
                widget.api.resolve(photo).toString(),
                headers: widget.api.imageHeaders,
                fit: BoxFit.cover,
                errorBuilder: (_, _, _) => const ColoredBox(
                  color: Color(0xFFE7ECE5),
                  child: Center(
                    child: Icon(Icons.broken_image_outlined, size: 44),
                  ),
                ),
              ),
            ),
          ),
        const SizedBox(height: 14),
        Card(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  _report!['guardian_name']?.toString() ?? '',
                  style: Theme.of(context).textTheme.titleMedium
                      ?.copyWith(fontWeight: FontWeight.w800),
                ),
                Text(
                  '${_report!['barangay_name']} · ${_report!['sitio_name'] ?? 'Unspecified sitio'}',
                ),
                Text(
                  'Location: ${_report!['latitude']}, ${_report!['longitude']}',
                ),
                Text('Living mangroves: ${_report!['observed_alive_count']}'),
                const Divider(height: 24),
                Text('Suggested health: ${_report!['suggested_health']}'),
                Text(
                  _report!['health_score'] == null
                      ? 'Not scored. Choose the final health.'
                      : 'Score: ${_report!['health_score']} / ${_report!['health_max_score']}',
                ),
                const Text('6 Healthy | 3-5 Stressed | 0-2 At Risk'),
                Text(
                  'Suggested species: ${_report!['suggested_species_name'] ?? 'Needs manual identification'}',
                ),
                Text(
                  'Species trait match: ${_report!['species_confidence'] ?? 0}%. This is a suggestion.',
                ),
                Text(
                  'Traits: ${_report!['root_type']} / ${_report!['leaf_shape']} / ${_report!['bark_texture']}',
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 12),
        Card(
          child: ExpansionTile(
            title: Text('Health checklist (${observations.length})'),
            children: observations.map((criterion) {
              final options = (criterion['options'] as List? ?? const [])
                  .map(
                    (item) =>
                        '${item['label']}${criterion['score_group'] == 'health' ? ' (${item['points'] == null ? 'Unscored' : '${item['points']}/2'})' : ''}',
                  )
                  .join(', ');
              return ListTile(
                title: Text(criterion['name']?.toString() ?? ''),
                subtitle: Text(options),
              );
            }).toList(),
          ),
        ),
        const SizedBox(height: 12),
        Card(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              children: [
                DropdownButtonFormField<String>(
                  initialValue: _health,
                  decoration: const InputDecoration(labelText: 'Final health'),
                  items: ['Healthy', 'Stressed', 'At Risk']
                      .map(
                        (value) =>
                            DropdownMenuItem(value: value, child: Text(value)),
                      )
                      .toList(),
                  onChanged: _busy
                      ? null
                      : (value) => setState(() => _health = value),
                ),
                const SizedBox(height: 12),
                DropdownButtonFormField<int?>(
                  initialValue: _speciesId,
                  isExpanded: true,
                  decoration: const InputDecoration(labelText: 'Final species'),
                  items: <DropdownMenuItem<int?>>[
                    const DropdownMenuItem(
                      value: null,
                      child: Text('Needs manual identification'),
                    ),
                    ...widget.species.map(
                      (item) => DropdownMenuItem<int?>(
                        value: item['id'] as int,
                        child: Text(
                          '${item['common_name']} (${item['scientific_name']})',
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                    ),
                  ],
                  onChanged: _busy
                      ? null
                      : (value) => setState(() => _speciesId = value),
                ),
                const SizedBox(height: 12),
                DropdownButtonFormField<String>(
                  initialValue: _rarity,
                  decoration: const InputDecoration(labelText: 'Rarity'),
                  items: ['Common', 'Vulnerable', 'Rare', 'Unassigned']
                      .map(
                        (value) =>
                            DropdownMenuItem(value: value, child: Text(value)),
                      )
                      .toList(),
                  onChanged: _busy
                      ? null
                      : (value) =>
                            setState(() => _rarity = value ?? 'Unassigned'),
                ),
                const Padding(
                  padding: EdgeInsets.symmetric(vertical: 12),
                  child: Text(
                    'Saving this review removes the Needs attention tag.',
                  ),
                ),
                TextField(
                  controller: _feedback,
                  enabled: !_busy,
                  maxLines: 4,
                  maxLength: 5000,
                  decoration: const InputDecoration(
                    labelText: 'Expert feedback',
                  ),
                ),
              ],
            ),
          ),
        ),
        if (_error != null) ...[
          const SizedBox(height: 12),
          Text(_error!, style: const TextStyle(color: Colors.red)),
        ],
        const SizedBox(height: 14),
        if (_changed)
          const Text(
            'You changed the result. Use Save correction to verify it.',
          ),
        FilledButton.icon(
          onPressed: _busy || _changed ? null : () => _review('confirm'),
          icon: const Icon(Icons.verified_outlined),
          label: const Text('Confirm suggestion'),
        ),
        const SizedBox(height: 10),
        FilledButton.tonalIcon(
          onPressed: _busy ? null : () => _review('correct'),
          icon: const Icon(Icons.edit_outlined),
          label: const Text('Save correction and verify'),
        ),
        const SizedBox(height: 10),
        OutlinedButton.icon(
          onPressed: _busy ? null : () => _review('reject'),
          icon: const Icon(Icons.cancel_outlined),
          label: const Text('Reject with feedback'),
        ),
      ],
    );
  }
}

class _SummaryChip extends StatelessWidget {
  const _SummaryChip(this.label, this.value, this.color);
  final String label;
  final dynamic value;
  final Color color;

  @override
  Widget build(BuildContext context) => Chip(
    avatar: CircleAvatar(backgroundColor: color, radius: 7),
    label: Text('$label ${value ?? 0}'),
  );
}
