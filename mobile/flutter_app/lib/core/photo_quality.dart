import 'dart:ui' as ui;
import 'dart:typed_data';

import 'api_client.dart';

Future<void> checkPhotoClarity(Uint8List bytes) async {
  final buffer = await ui.ImmutableBuffer.fromUint8List(bytes);
  ui.ImageDescriptor? descriptor;
  try {
    descriptor = await ui.ImageDescriptor.encoded(buffer);
    if (descriptor.width < 240 || descriptor.height < 240) {
      throw const ApiException(
        'Photo is too small. Use a clearer photo.',
        code: 'photo_unclear',
      );
    }
    final codec = await descriptor.instantiateCodec(
      targetWidth: 192,
      targetHeight: 192,
    );
    try {
      final frame = await codec.getNextFrame();
      try {
        final pixels = await frame.image.toByteData(
          format: ui.ImageByteFormat.rawRgba,
        );
        if (pixels == null) return;
        final data = pixels.buffer.asUint8List();
        final gray = <double>[];
        for (var i = 0; i < data.length; i += 4) {
          gray.add(.299 * data[i] + .587 * data[i + 1] + .114 * data[i + 2]);
        }
        final width = frame.image.width, height = frame.image.height;
        var sum = 0.0, squares = 0.0, n = 0;
        for (var y = 1; y < height - 1; y++) {
          for (var x = 1; x < width - 1; x++) {
            final i = y * width + x,
                v =
                    4 * gray[i] -
                    gray[i - 1] -
                    gray[i + 1] -
                    gray[i - width] -
                    gray[i + width];
            sum += v;
            squares += v * v;
            n++;
          }
        }
        if (n > 0 && squares / n - (sum / n) * (sum / n) < 5) {
          throw const ApiException(
            'Photo is unclear. Retake it in good light.',
            code: 'photo_unclear',
          );
        }
      } finally {
        frame.image.dispose();
      }
    } finally {
      codec.dispose();
    }
  } on ApiException {
    rethrow;
  } catch (_) {
    throw const ApiException(
      'Could not read this photo. Choose another.',
      code: 'photo_unclear',
    );
  } finally {
    descriptor?.dispose();
    buffer.dispose();
  }
}
