import 'dart:io';

import 'package:flutter/foundation.dart';

import 'api_client.dart';
import 'photo_quality.dart';

Future<void> validateReportPhotos(List<String> paths) async {
  if (paths.length > 6) throw const ApiException('Use up to 6 photos.');
  var total = 0;
  final contents = <Uint8List>[];
  for (final path in paths) {
    final file = File(path), size = await File(path).length();
    if (size > 5 * 1024 * 1024) {
      throw const ApiException(
        'Photo exceeds the 5 MB limit.',
        code: 'photo_unclear',
      );
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
        'Photo already added. Choose another.',
        code: 'photo_duplicate',
      );
    }
    contents.add(bytes);
  }
  for (final bytes in contents) {
    await checkPhotoClarity(bytes);
  }
}

bool isPhotoConflict(Object error) =>
    error is ApiException &&
    [
      'photo_duplicate',
      'photo_already_submitted',
      'photo_unclear',
    ].contains(error.code);

String photoConflictMessage(ApiException error) {
  if (error.code == 'photo_duplicate') {
    return 'Photo already added. Choose another.';
  }
  if (error.code == 'photo_already_submitted') {
    return 'Photo already used. Choose a new one.';
  }
  return error.message;
}
