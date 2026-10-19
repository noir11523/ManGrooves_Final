import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

/// Attribution belongs to a specific photo, not to the observation label.
class PhotoCredit extends StatelessWidget {
  const PhotoCredit({super.key, required this.credit});
  final Map? credit;

  @override
  Widget build(BuildContext context) {
    final data = credit;
    if (data == null) return const SizedBox.shrink();
    Widget link(String label, dynamic raw) {
      final uri = Uri.tryParse('$raw');
      if (uri == null || uri.scheme != 'https') {
        return Padding(
          padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 8),
          child: Text(
            label,
            textAlign: TextAlign.center,
            style: Theme.of(context).textTheme.bodySmall,
          ),
        );
      }
      return TextButton(
        onPressed: () async {
          var opened = false;
          try {
            opened = await launchUrl(uri, mode: LaunchMode.externalApplication);
          } catch (_) {
            // Missing browser handlers must not interrupt a report.
          }
          if (!opened && context.mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(content: Text('Could not open the photo source.')),
            );
          }
        },
        style: TextButton.styleFrom(
          padding: const EdgeInsets.symmetric(horizontal: 4),
          textStyle: const TextStyle(fontSize: 12),
        ),
        child: Text(label, textAlign: TextAlign.center),
      );
    }

    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Wrap(
          alignment: WrapAlignment.center,
          children: [
            link(
              data['kind'] == 'generated'
                  ? 'AI illustration'
                  : 'Photo: ${data['author'] ?? 'Source'}',
              data['source'],
            ),
            link('${data['license'] ?? ''}', data['license_url']),
          ],
        ),
        if ('${data['changes'] ?? ''}'.isNotEmpty)
          Text(
            '${data['changes']}',
            style: Theme.of(context).textTheme.bodySmall,
          ),
        if ('${data['note'] ?? ''}'.isNotEmpty)
          Text(
            '${data['note']}',
            textAlign: TextAlign.center,
            style: Theme.of(context).textTheme.bodySmall,
          ),
      ],
    );
  }
}
