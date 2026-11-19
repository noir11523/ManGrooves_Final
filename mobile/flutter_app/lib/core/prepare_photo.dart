import 'dart:io';
import 'dart:math' as math;
import 'dart:ui' as ui;

import 'package:path_provider/path_provider.dart';
import 'package:image_picker/image_picker.dart';

import 'api_client.dart';
import 'photo_quality.dart';

// Keep original bytes when possible. Decode oversized camera images directly to
// a bounded bitmap; never upscale an original or distort its shape.
Future<XFile> preparePhoto(XFile file) async {
  final c = await photoQualityConfig();
  if (await file.length() > c['maxBytes']) {
    throw const ApiException(
      'Photo exceeds the 5 MB limit.',
      code: 'photo_unclear',
    );
  }
  ui.ImmutableBuffer? buffer;
  ui.ImageDescriptor? descriptor;
  ui.Codec? codec;
  ui.Image? image;
  try {
    final bytes = await file.readAsBytes();
    final jpg =
        bytes.length >= 3 &&
        bytes[0] == 255 &&
        bytes[1] == 216 &&
        bytes[2] == 255;
    final png =
        bytes.length >= 8 &&
        [
          137,
          80,
          78,
          71,
          13,
          10,
          26,
          10,
        ].asMap().entries.every((e) => bytes[e.key] == e.value);
    final webp =
        bytes.length >= 12 &&
        String.fromCharCodes(bytes.take(4)) == 'RIFF' &&
        String.fromCharCodes(bytes.sublist(8, 12)) == 'WEBP';
    if (!jpg && !png && !webp) {
      throw const ApiException(
        'Unsupported image format. Please upload JPG, PNG, or WebP.',
        code: 'photo_unclear',
      );
    }
    buffer = await ui.ImmutableBuffer.fromUint8List(bytes);
    descriptor = await ui.ImageDescriptor.encoded(buffer);
    final w = descriptor.width, h = descriptor.height;
    if (w * h <= c['maxPixels']) return file;
    if (w * h > 64000000) {
      throw const ApiException(
        'Photo is too large to process. Please resize it and try again.',
        code: 'photo_unclear',
      );
    }
    final scale = math.min(1.0, (c['uploadSide'] as num) / math.max(w, h));
    final tw = (w * scale).round(), th = (h * scale).round();
    if (tw * th > c['maxPixels']) {
      throw const ApiException(
        'Photo is too large to process. Please resize it and try again.',
        code: 'photo_unclear',
      );
    }
    codec = await descriptor.instantiateCodec(
      targetWidth: tw,
      targetHeight: th,
    );
    image = (await codec.getNextFrame()).image;
    final data = await image.toByteData(format: ui.ImageByteFormat.png);
    if (data == null) {
      throw const ApiException(
        'Could not read this photo. Please choose another.',
        code: 'photo_unclear',
      );
    }
    if (data.lengthInBytes > c['maxBytes']) {
      throw const ApiException(
        'Photo exceeds the 5 MB limit.',
        code: 'photo_unclear',
      );
    }
    final dir = await getTemporaryDirectory(),
        out = File(
          '${dir.path}/report-prepared-${DateTime.now().microsecondsSinceEpoch}.png',
        );
    await out.writeAsBytes(
      data.buffer.asUint8List(data.offsetInBytes, data.lengthInBytes),
    );
    return XFile(out.path, mimeType: 'image/png');
  } on ApiException {
    rethrow;
  } catch (_) {
    throw const ApiException(
      'Could not read this photo. Please choose another.',
      code: 'photo_unclear',
    );
  } finally {
    image?.dispose();
    codec?.dispose();
    descriptor?.dispose();
    buffer?.dispose();
  }
}
