import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:mangrooves_mobile/core/api_client.dart';
import 'package:mangrooves_mobile/core/report_photos.dart';

void main() {
  test(
    'renaming a photo cannot bypass duplicate checking in any slot',
    () async {
      final directory = await Directory.systemTemp.createTemp(
        'mangrooves-photo-test',
      );
      try {
        final first = await File('${directory.path}/overview.jpg')
            .writeAsBytes([1, 2, 3]);
        final second = await File('${directory.path}/closeup.jpg')
            .writeAsBytes([4, 5, 6]);
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
