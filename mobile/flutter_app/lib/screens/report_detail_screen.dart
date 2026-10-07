import 'package:flutter/material.dart';

import '../core/api_client.dart';
import '../core/display_text.dart';
import '../shared/retry_view.dart';
import 'validation_history_screen.dart';
import 'cluster_timeline_screen.dart';

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
                : RetryView(message: _error!, onRetry: _load),
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
            _Pill(reportStatusLabel(_report!)),
            _Pill(
              _report!['final_health']?.toString() ??
                  _report!['suggested_health']?.toString() ??
                  'Unknown',
            ),
          ],
        ),
        const SizedBox(height: 18),
        _InfoCard(
          title: 'Visit details',
          rows: {
            'Barangay': _report!['barangay_name'],
            'Cluster': _report!['cluster_name'] ?? 'New site',
            'Sitio': _report!['sitio_name'],
            'Coordinates': '${_report!['latitude']}, ${_report!['longitude']}',
            'Living mangroves': _report!['observed_alive_count'],
            if (_report!['status'] == 'verified' &&
                _report!['expert_id'] == null)
              'Verification': 'Automatically verified as Healthy',
          },
        ),
        const SizedBox(height: 12),
        _InfoCard(
          title: 'Species assessment',
          rows: {
            'Species':
                (_report!['status'] == 'verified'
                    ? _report!['final_species_name']
                    : (_report!['status'] == 'pending'
                          ? _report!['suggested_species_name']
                          : null)) ??
                'Unidentified',
            'Root type': _report!['root_type'],
            'Leaf shape': _report!['leaf_shape'],
            'Bark texture': _report!['bark_texture'],
          },
        ),
        const SizedBox(height: 18),
        Text(
          _report!['health_score'] == null
              ? 'Not scored. Needs review.'
              : 'Health score: ${_report!['health_score']} / ${_report!['health_max_score']}',
        ),
        const Text('6 Healthy | 3-5 Stressed | 0-2 At Risk'),
        const SizedBox(height: 8),
        Text(
          'Health checklist',
          style: Theme.of(context).textTheme.titleLarge
              ?.copyWith(fontWeight: FontWeight.w700),
        ),
        const SizedBox(height: 8),
        ...observations.map((criterion) {
          final options = (criterion['options'] as List? ?? const [])
              .map((item) => Map<String, dynamic>.from(item as Map))
              .map(
                (item) =>
                    '${item['label']}${criterion['score_group'] == 'health' ? ' (${item['points'] == null ? 'Not scored' : '${item['points']}/2'})' : ''}',
              )
              .join(', ');
          return Card(
            child: ListTile(
              contentPadding: const EdgeInsets.symmetric(
                horizontal: 16,
                vertical: 10,
              ),
              leading: const Icon(Icons.check_circle_outline),
              title: Text(
                criterion['name']?.toString() ?? '',
                style: const TextStyle(fontWeight: FontWeight.w700),
              ),
              subtitle: Padding(
                padding: const EdgeInsets.only(top: 6),
                child: Text(
                  options,
                  style: const TextStyle(fontSize: 15, height: 1.5),
                ),
              ),
            ),
          );
        }),
        if (_report!['cluster_id'] != null)
          for (final mode in [0, 1])
            TextButton.icon(
              onPressed: () => Navigator.push(
                context,
                MaterialPageRoute<void>(
                  builder: (_) => ClusterTimelineScreen(
                    api: widget.api,
                    clusterId: int.parse('${_report!['cluster_id']}'),
                    initialTab: mode,
                  ),
                ),
              ),
              icon: const Icon(Icons.timeline),
              label: Text(mode == 0 ? 'Health history' : 'Growth timeline'),
            ),
        ValidationHistoryCard(report: _report!),
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
