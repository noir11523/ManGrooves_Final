import 'package:flutter/material.dart';

import '../core/api_client.dart';

class BadgesScreen extends StatefulWidget {
  const BadgesScreen({super.key, required this.api});

  final ApiClient api;

  @override
  State<BadgesScreen> createState() => _BadgesScreenState();
}

class _BadgesScreenState extends State<BadgesScreen> {
  Map<String, dynamic>? _data;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _error = null);
    try {
      _data = await widget.api.badges();
    } catch (error) {
      _error = error is ApiException ? error.message : 'Unable to load badges.';
    }
    if (mounted) setState(() {});
  }

  @override
  Widget build(BuildContext context) {
    if (_data == null && _error == null) {
      return const Center(child: CircularProgressIndicator());
    }
    if (_data == null) {
      return Center(
        child: FilledButton.tonal(onPressed: _load, child: Text(_error!)),
      );
    }
    final metrics = Map<String, dynamic>.from(_data!['metrics'] as Map);
    final badges = (_data!['badges'] as List? ?? const [])
        .map((item) => Map<String, dynamic>.from(item as Map))
        .toList();

    return RefreshIndicator(
      onRefresh: _load,
      child: ListView(
        padding: const EdgeInsets.fromLTRB(20, 8, 20, 32),
        children: [
          Text(
            'Guardian achievements',
            style: Theme.of(context).textTheme.headlineSmall
                ?.copyWith(fontWeight: FontWeight.w800),
          ),
          const Text('Badges unlock from contributions verified by CCENRO.'),
          const SizedBox(height: 18),
          Wrap(
            spacing: 10,
            runSpacing: 10,
            children: [
              _Metric('Verified', metrics['verified_reports']),
              _Metric('Follow-ups', metrics['verified_followups']),
              _Metric('Species', metrics['distinct_species']),
              _Metric('Uncorrected', metrics['uncorrected_reports']),
            ],
          ),
          const SizedBox(height: 20),
          if (badges.isEmpty)
            const Card(
              child: Padding(
                padding: EdgeInsets.all(20),
                child: Text('No active badge definitions are available.'),
              ),
            )
          else
            ...badges.map((badge) => _BadgeCard(badge: badge)),
        ],
      ),
    );
  }
}

class _Metric extends StatelessWidget {
  const _Metric(this.label, this.value);
  final String label;
  final dynamic value;

  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 13, vertical: 10),
    decoration: BoxDecoration(
      color: Theme.of(context).colorScheme.primaryContainer,
      borderRadius: BorderRadius.circular(14),
    ),
    child: Text('$label: ${value ?? 0}'),
  );
}

class _BadgeCard extends StatelessWidget {
  const _BadgeCard({required this.badge});
  final Map<String, dynamic> badge;

  @override
  Widget build(BuildContext context) {
    final earned = badge['earned'] == true;
    final progress =
        ((badge['progress_percent'] as num?)?.toDouble() ?? 0) / 100;
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Card(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              CircleAvatar(
                radius: 28,
                backgroundColor: earned
                    ? Colors.amber.shade100
                    : Colors.grey.shade200,
                child: Icon(
                  earned ? Icons.workspace_premium : Icons.lock_outline,
                  color: earned ? Colors.amber.shade900 : Colors.grey.shade600,
                ),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      badge['badge_name']?.toString() ?? 'Guardian badge',
                      style: Theme.of(context).textTheme.titleMedium
                          ?.copyWith(fontWeight: FontWeight.w800),
                    ),
                    const SizedBox(height: 3),
                    Text(badge['description']?.toString() ?? ''),
                    const SizedBox(height: 12),
                    LinearProgressIndicator(value: progress.clamp(0, 1)),
                    const SizedBox(height: 6),
                    Text(
                      earned
                          ? 'Earned ${badge['earned_at'] ?? ''}'
                          : '${badge['current_value'] ?? 0} / ${badge['target_value'] ?? 0}',
                      style: Theme.of(context).textTheme.bodySmall,
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
