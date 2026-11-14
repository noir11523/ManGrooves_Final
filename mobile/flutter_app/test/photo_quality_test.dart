import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:mangrooves_mobile/core/photo_quality.dart';
import 'package:mangrooves_mobile/core/api_client.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  for (final name in ['clear.jpg', 'clear.png', 'clear.webp', 'close-up.jpg']) {
    test('accepts $name', () async {
      await checkPhotoClarity(
        await File('../../supabase/test/fixtures/quality/$name').readAsBytes(),
      );
    });
  }
  for (final entry in {
    'blur.jpg': 'blurry',
    'out-of-focus.jpg': 'blurry',
    'dark.jpg': 'too dark',
    'bright.jpg': 'too bright',
    'low-contrast.jpg': 'quality is too low',
    'low-resolution.jpg': 'resolution is too low',
  }.entries) {
    test('rejects ${entry.key}', () async {
      await expectLater(
        checkPhotoClarity(
          await File('../../supabase/test/fixtures/quality/${entry.key}')
              .readAsBytes(),
        ),
        throwsA(
          isA<ApiException>().having(
            (e) => e.message,
            'specific error',
            contains(entry.value),
          ),
        ),
      );
    });
  }
}
