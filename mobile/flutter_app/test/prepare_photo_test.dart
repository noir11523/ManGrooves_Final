import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:image_picker/image_picker.dart';
import 'package:mangrooves_mobile/core/prepare_photo.dart';
import 'package:mangrooves_mobile/core/api_client.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  const base = '../../supabase/test/fixtures/quality/';
  for (final name in [
    'clear.jpg',
    'clear.png',
    'clear.webp',
    'close-up.jpg',
    'low-resolution.jpg',
  ]) {
    test('keeps original full-resolution bytes for $name', () async {
      final file = XFile('$base$name'),
          prepared = await preparePhoto(XFile('$base$name'));
      expect(prepared.path, file.path);
      expect(await prepared.readAsBytes(), await file.readAsBytes());
    });
  }
  test('rejects unsupported files before decoding', () async {
    final dir = await Directory.systemTemp.createTemp('photo-format-test');
    try {
      final file = File('${dir.path}/renamed.jpg');
      await file.writeAsString('GIF89a');
      await expectLater(
        preparePhoto(XFile(file.path)),
        throwsA(
          isA<ApiException>().having(
            (e) => e.message,
            'message',
            contains('Unsupported'),
          ),
        ),
      );
    } finally {
      await dir.delete(recursive: true);
    }
  });
}
