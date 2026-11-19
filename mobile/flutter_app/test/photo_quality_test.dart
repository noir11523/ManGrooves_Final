import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:mangrooves_mobile/core/photo_quality.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  for (final name in [
    'clear.jpg',
    'clear.png',
    'clear.webp',
    'close-up.jpg',
    'motion-trails.jpg',
    'blur.jpg',
    'out-of-focus.jpg',
    'dark.jpg',
    'bright.jpg',
    'low-contrast.jpg',
    'low-resolution.jpg',
  ]) {
    test('accepts decodable photo regardless of appearance: $name', () async {
      await checkPhotoFile(
        await File('../../supabase/test/fixtures/quality/$name').readAsBytes(),
      );
    });
  }
}
