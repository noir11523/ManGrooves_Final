import 'dart:io';
import 'dart:ui' as ui;
import 'dart:math' as math;

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
  }.entries) {
    test(
      'local measurements detect ${entry.key}; API decides acceptance',
      () async {
        final bytes = await File(
          '../../supabase/test/fixtures/quality/${entry.key}',
        ).readAsBytes();
        final config = await photoQualityConfig();
        final buffer = await ui.ImmutableBuffer.fromUint8List(bytes);
        final descriptor = await ui.ImageDescriptor.encoded(buffer);
        final scale = math.min(
          1.0,
          (config['sampleSide'] as num) /
              math.max(descriptor.width, descriptor.height),
        );
        final codec = await descriptor.instantiateCodec(
          targetWidth: (descriptor.width * scale).round(),
          targetHeight: (descriptor.height * scale).round(),
        );
        final image = (await codec.getNextFrame()).image;
        try {
          final pixels = await image.toByteData(
            format: ui.ImageByteFormat.rawStraightRgba,
          );
          expect(
            photoQualityProblem(
              pixels!.buffer.asUint8List(),
              image.width,
              image.height,
              config,
            ),
            contains(entry.value),
          );
          // A platform-specific sample cannot override the mandatory server check.
          await checkPhotoClarity(bytes);
        } finally {
          image.dispose();
          codec.dispose();
          descriptor.dispose();
          buffer.dispose();
        }
      },
    );
  }
  test('rejects low resolution before upload without upscaling', () async {
    await expectLater(
      checkPhotoClarity(
        await File('../../supabase/test/fixtures/quality/low-resolution.jpg')
            .readAsBytes(),
      ),
      throwsA(
        isA<ApiException>().having(
          (e) => e.message,
          'specific error',
          contains('resolution is too low'),
        ),
      ),
    );
  });
}
