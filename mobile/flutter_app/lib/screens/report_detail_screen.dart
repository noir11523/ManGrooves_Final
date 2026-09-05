import 'package:flutter/material.dart';

import '../core/api_client.dart';

class ReportDetailScreen extends StatefulWidget {
  const ReportDetailScreen({
    super.key,
    required this.api,
    required this.reportId,
  });
  final ApiClient api;
  final int reportId;

  @override
  State<ReportDetailScreen> createState() => _ReportDetailScreenState();
}

class _ReportDetailScreenState extends State<ReportDetailScreen> {
  Map<String, dynamic>? _report;
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
    } catch (error) {
      _error = error is ApiException ? error.message : 'Unable to load report.';
    }
    if (mounted) setState(() {});
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(
      title: Text(_report?['report_code']?.toString() ?? 'Report details'),
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
    final observations = (_report!['observations'] as List? ?? const [])
        .map((item) => Map<String, dynamic>.from(item as Map))
        .toList();
    final photo = _report!['photo_url']?.toString();
    return ListView(
      padding: const EdgeInsets.fromLTRB(20, 8, 20, 32),
      children: [
        if (photo != null)
          ClipRRect(
            borderRadius: BorderRadius.circular(18),
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
        const SizedBox(height: 16),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: [
            _Pill(_report!['status']?.toString() ?? ''),
            _Pill(
              _report!['final_health']?.toString() ??
                  _report!['suggested_health']?.toString() ??
                  'Unknown',
            ),
            if (_report!['needs_attention'] == 1)
              const _Pill('Needs attention'),
          ],
        ),
        const SizedBox(height: 18),
        _InfoCard(
          title: 'Field observation',
          rows: {
            'Barangay': _report!['barangay_name'],
            'Cluster': _report!['cluster_name'] ?? 'New observation site',
            'Sitio': _report!['sitio_name'],
            'Coordinates': '${_report!['latitude']}, ${_report!['longitude']}',
            'Living mangroves': _report!['observed_alive_count'],
          },
        ),
        const SizedBox(height: 12),
        _InfoCard(
          title: 'Identification',
          rows: {
            'Species':
                _report!['final_species_name'] ??
                _report!['suggested_species_name'] ??
                'Unidentified',
            'Root type': _report!['root_type'],
            'Leaf shape': _report!['leaf_shape'],
            'Bark texture': _report!['bark_texture'],
          },
        ),
        const SizedBox(height: 18),
        Text(
          'Health checklist',
          style: Theme.of(context).textTheme.titleLarge
              ?.copyWith(fontWeight: FontWeight.w700),
        ),
        const SizedBox(height: 8),
        ...observations.map((criterion) {
          final options = (criterion['options'] as List? ?? const [])
              .map((item) => Map<String, dynamic>.from(item as Map))
              .map((item) => item['label']?.toString() ?? '')
              .join(', ');
          return ListTile(
            contentPadding: EdgeInsets.zero,
            leading: const Icon(Icons.check_circle_outline),
            title: Text(criterion['name']?.toString() ?? ''),
            subtitle: Text(options),
          );
        }),
        if ((_report!['expert_feedback']?.toString().trim().isNotEmpty ??
            false)) ...[
          const SizedBox(height: 12),
          _InfoCard(
            title: 'Expert feedback',
            rows: {'Feedback': _report!['expert_feedback']},
          ),
        ],
      ],
    );
  }
}

class _Pill extends StatelessWidget {
  const _Pill(this.label);
  final String label;

  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 7),
    decoration: BoxDecoration(
      color: Theme.of(context).colorScheme.primaryContainer,
      borderRadius: BorderRadius.circular(20),
    ),
    child: Text(label, style: const TextStyle(fontWeight: FontWeight.w700)),
  );
}

class _InfoCard extends StatelessWidget {
  const _InfoCard({required this.title, required this.rows});
  final String title;
  final Map<String, dynamic> rows;

  @override
  Widget build(BuildContext context) => Card(
    child: Padding(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: Theme.of(context).textTheme.titleMedium
                ?.copyWith(fontWeight: FontWeight.w700),
          ),
          const SizedBox(height: 10),
          ...rows.entries
              .where((entry) => entry.value != null)
              .map(
                (entry) => Padding(
                  padding: const EdgeInsets.symmetric(vertical: 4),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      SizedBox(
                        width: 125,
                        child: Text(
                          entry.key,
                          style: const TextStyle(color: Colors.black54),
                        ),
                      ),
                      Expanded(child: Text(entry.value.toString())),
                    ],
                  ),
                ),
              ),
        ],
      ),
    ),
  );
}
