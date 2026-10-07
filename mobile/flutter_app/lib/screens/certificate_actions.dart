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
  Future<void> _download() async {
    if (_busy) return;
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final bytes = await widget.api.cloudFile(
        'certificate.php',
        query: {'badge_id': '${widget.badgeId}'},
      );
      await Printing.sharePdf(
        bytes: bytes,
        filename: 'ManGROOVES-certificate.pdf',
      );
    } catch (error) {
      if (mounted) {
        setState(
          () => _error = error is ApiException
              ? error.message
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
      TextButton.icon(
        onPressed: _busy ? null : _download,
        icon: const Icon(Icons.download),
        label: Text(_busy ? 'Opening certificate…' : 'Certificate'),
      ),
      const Text('The verification QR is inside your certificate.'),
      if (_error != null)
        Text(
          _error!,
          style: TextStyle(color: Theme.of(context).colorScheme.error),
        ),
    ],
  );
}
