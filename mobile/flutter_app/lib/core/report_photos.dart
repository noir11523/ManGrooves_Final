import 'dart:io';

import 'package:flutter/foundation.dart';

import 'api_client.dart';

Future<void> validateReportPhotos(List<String> paths) async {
  if (paths.length > 6) throw const ApiException('Use up to 6 photos.');
  var total = 0;
  final contents = <Uint8List>[];
  for (final path in paths) {
    final file = File(path), size = await File(path).length();
    if (size > 5 * 1024 * 1024) {
      throw const ApiException('Use photos under 5 MB each.');
    }
    total += size;
    if (total > 12 * 1024 * 1024) {
      throw const ApiException(
        'Photos must total 12 MB or less. Remove a photo or choose smaller files.',
      );
    }
    final bytes = await file.readAsBytes();
    if (contents.any((previous) => listEquals(previous, bytes))) {
      throw const ApiException(
        'This photo is already added. Choose a different photo.',
      );
    }
    contents.add(bytes);
  }
}
