import 'package:flutter/material.dart';

import '../core/api_client.dart';
import 'certificate_actions.dart';

class BadgesScreen extends StatefulWidget {
  const BadgesScreen({super.key, required this.api, this.active = true});

  final ApiClient api;
  final bool active;

  @override
  State<BadgesScreen> createState() => _BadgesScreenState();
}

class _BadgesScreenState extends State<BadgesScreen> {
  @override
  void didUpdateWidget(covariant BadgesScreen oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.active && !oldWidget.active) _load();
  }

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
          const Text('Earn badges through verified reports.'),
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
            ...badges.map((badge) => _BadgeCard(badge: badge, api: widget.api)),
        ],
      ),
    );
  }
}

class _BadgeEmblem extends CustomPainter {
  const _BadgeEmblem(this.code, this.earned);
  final String code;
  final bool earned;
  @override
  void paint(Canvas canvas, Size size) {
    canvas.save();
    canvas.scale(size.width / 100, size.height / 116);
    final color = code.contains('gold')
        ? const Color(0xFFB88B24)
        : code.contains('silver')
        ? const Color(0xFF647785)
        : code.contains('bronze')
        ? const Color(0xFF9B5E35)
        : code.contains('species')
        ? const Color(0xFF53382F)
        : const Color(0xFF2D5A27);
    final paint = Paint()..color = const Color(0xFF53382F);
    canvas.drawPath(
      Path()
        ..moveTo(28, 3)
        ..lineTo(50, 19)
        ..lineTo(72, 3)
        ..lineTo(81, 41)
        ..lineTo(19, 41)
        ..close(),
      paint,
    );
    paint.color = const Color(0xFFD8C8AC);
    canvas.drawCircle(const Offset(50, 63), 46, paint);
    paint.color = const Color(0xFFF7F4EC);
    canvas.drawCircle(const Offset(50, 63), 42, paint);
    paint.color = earned ? color : color.withValues(alpha: .45);
    canvas.drawCircle(const Offset(50, 63), 36, paint);
    paint
      ..color = Colors.white
      ..style = PaintingStyle.stroke
      ..strokeWidth = 3.4
      ..strokeCap = StrokeCap.round;
    canvas.drawPath(
      Path()
        ..moveTo(50, 38)
        ..lineTo(50, 81)
        ..moveTo(50, 52)
        ..quadraticBezierTo(38, 43, 30, 48)
        ..moveTo(50, 63)
        ..quadraticBezierTo(62, 54, 70, 59)
        ..moveTo(50, 81)
        ..lineTo(36, 94)
        ..moveTo(50, 81)
        ..lineTo(64, 94)
        ..moveTo(50, 81)
        ..lineTo(50, 97),
      paint,
    );
    canvas.restore();
  }

  @override
  bool shouldRepaint(covariant _BadgeEmblem old) =>
      old.code != code || old.earned != earned;
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
  const _BadgeCard({required this.badge, required this.api});
  final ApiClient api;
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
              Semantics(
                label: '${badge['badge_name']} badge',
                child: CustomPaint(
                  size: const Size(76, 88),
                  painter: _BadgeEmblem('${badge['code'] ?? ''}', earned),
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
                    if (earned && api.supportsCloudAccounts)
                      CertificateActions(api: api, badgeId: badge['id'] as int),
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
