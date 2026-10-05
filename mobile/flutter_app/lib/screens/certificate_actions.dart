import 'package:flutter/material.dart';
import 'package:printing/printing.dart';

import '../core/api_client.dart';

class CertificateActions extends StatefulWidget {
  const CertificateActions({
    super.key,
    required this.api,
    required this.badgeId,
  });
  final ApiClient api;
  final int badgeId;
  @override
  State<CertificateActions> createState() => _CertificateActionsState();
}

class _CertificateActionsState extends State<CertificateActions> {
  bool _busy = false;
  String? _error;
  Map<String, dynamic>? _qr;
  Future<void> _action(bool share) async {
    if (_busy) return;
    if (share) {
      final yes = await showDialog<bool>(
        context: context,
        builder: (context) => AlertDialog(
          title: const Text('Show certificate QR?'),
          content: const Text(
            'Anyone with this code can download your certificate for 10 minutes.',
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context, false),
              child: const Text('Cancel'),
            ),
            FilledButton(
              onPressed: () => Navigator.pop(context, true),
              child: const Text('Show QR'),
            ),
          ],
        ),
      );
      if (yes != true || !mounted) return;
    }
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      if (share) {
        final data = await widget.api.cloudRequest(
          'certificate-link.php',
          body: {'badge_id': widget.badgeId},
        );
        if (mounted) {
          setState(() => _qr = Map<String, dynamic>.from(data['qr'] as Map));
        }
      } else {
        final bytes = await widget.api.cloudFile(
          'certificate.php',
          query: {'badge_id': '${widget.badgeId}'},
        );
        await Printing.sharePdf(
          bytes: bytes,
          filename: 'ManGROOVES-certificate.pdf',
        );
      }
    } catch (e) {
      if (mounted) {
        setState(
          () => _error = e is ApiException
              ? e.message
              : 'Could not open your certificate. Try again.',
        );
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) => Column(
    crossAxisAlignment: CrossAxisAlignment.start,
    children: [
      Wrap(
        spacing: 8,
        children: [
          TextButton.icon(
            onPressed: _busy ? null : () => _action(false),
            icon: const Icon(Icons.download),
            label: const Text('Certificate'),
          ),
          TextButton.icon(
            onPressed: _busy ? null : () => _action(true),
            icon: const Icon(Icons.qr_code),
            label: const Text('Show QR'),
          ),
        ],
      ),
      if (_error != null)
        Text(
          _error!,
          style: TextStyle(color: Theme.of(context).colorScheme.error),
        ),
      if (_qr != null) ...[
        Semantics(
          label: 'Scan to download your certificate',
          child: CustomPaint(
            size: const Size(210, 210),
            painter: CertificateQrPainter(_qr!),
          ),
        ),
        const Text(
          'Scan to download. Expires in 10 minutes. The PDF has no QR code.',
        ),
      ],
    ],
  );
}

class CertificateQrPainter extends CustomPainter {
  CertificateQrPainter(this.qr);
  final Map<String, dynamic> qr;
  @override
  void paint(Canvas canvas, Size size) {
    final count = qr['size'] as int,
        data = qr['data'] as List,
        unit = size.shortestSide / (count + 8);
    final paint = Paint()..color = Colors.white;
    canvas.drawRect(Offset.zero & size, paint);
    paint.color = Colors.black;
    for (var y = 0; y < count; y++) {
      for (var x = 0; x < count; x++) {
        if (data[y * count + x] == 1) {
          canvas.drawRect(
            Rect.fromLTWH(
              (x + 4) * unit,
              (y + 4) * unit,
              unit + .05,
              unit + .05,
            ),
            paint,
          );
        }
      }
    }
  }

  @override
  bool shouldRepaint(covariant CertificateQrPainter oldDelegate) =>
      oldDelegate.qr != qr;
}
