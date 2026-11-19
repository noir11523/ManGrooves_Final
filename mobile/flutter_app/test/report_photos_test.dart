import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:mangrooves_mobile/core/api_client.dart';
import 'package:mangrooves_mobile/core/report_photos.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  test(
    'structural failures identify the affected photo and enforce ten photos',
    () async {
      await expectLater(
        validateReportPhotos([
          '../../supabase/test/fixtures/quality/clear.jpg',
          '../../supabase/test/fixtures/quality/clear.jpg',
        ]),
        throwsA(
          isA<ApiException>()
              .having((e) => e.photoIndices, 'affected slot', [1])
              .having((e) => e.code, 'duplicate', 'photo_duplicate'),
        ),
      );
      await expectLater(
        validateReportPhotos(List.filled(11, 'unused.jpg')),
        throwsA(
          isA<ApiException>().having(
            (e) => e.message,
            'limit',
            'Use up to 10 photos.',
          ),
        ),
      );
    },
  );
  test(
    'renaming a photo cannot bypass duplicate checking in any slot',
    () async {
      final directory = await Directory.systemTemp.createTemp(
        'mangrooves-photo-test',
      );
      try {
        final first = await File('${directory.path}/overview.jpg').writeAsBytes(
          await File('../../supabase/test/fixtures/quality/clear.jpg')
              .readAsBytes(),
        );
        final second = await File('${directory.path}/closeup.jpg').writeAsBytes(
          await File('../../public/assets/img/observations/v1-green-leaf.jpg')
              .readAsBytes(),
        );
        final copy = await first.copy('${directory.path}/renamed.jpg');
        await validateReportPhotos([first.path, second.path]);
        await expectLater(
          validateReportPhotos([first.path, copy.path]),
          throwsA(
            isA<ApiException>().having(
              (e) => e.message,
              'message',
              contains('already added'),
            ),
          ),
        );
        await expectLater(
          validateReportPhotos([first.path, second.path, copy.path]),
          throwsA(isA<ApiException>()),
        );
      } finally {
        await directory.delete(recursive: true);
      }
    },
  );
}
