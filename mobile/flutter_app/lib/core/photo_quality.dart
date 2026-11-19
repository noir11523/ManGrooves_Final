import 'dart:ui' as ui;
import 'dart:convert';

import 'package:flutter/services.dart';

import 'api_client.dart';

Future<Map<String, dynamic>>? _config;
Future<Map<String, dynamic>> photoQualityConfig() => _config ??= rootBundle
    .loadString('assets/config/photo_quality.json')
    .then((text) => Map<String, dynamic>.from(jsonDecode(text) as Map));

Future<void> checkPhotoFile(Uint8List bytes) async {
  ui.ImmutableBuffer? buffer;
  ui.ImageDescriptor? descriptor;
  ui.Codec? codec;
  ui.Image? image;
  void reject(String message) =>
      throw ApiException(message, code: 'photo_unclear');
  try {
    final c = await photoQualityConfig();
    if (bytes.length > c['maxBytes']) reject('Photo exceeds the 5 MB limit.');
    final jpeg =
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
        ascii.decode(bytes.sublist(0, 4), allowInvalid: true) == 'RIFF' &&
        ascii.decode(bytes.sublist(8, 12), allowInvalid: true) == 'WEBP';
    if (!jpeg && !png && !webp) {
      reject('Unsupported image format. Please upload JPG, PNG, or WebP.');
    }
    buffer = await ui.ImmutableBuffer.fromUint8List(bytes);
    descriptor = await ui.ImageDescriptor.encoded(buffer);
    final width = descriptor.width, height = descriptor.height;
    if (width * height > c['maxPixels']) {
      reject('Photo is too large to process. Please resize it and try again.');
    }
    codec = await descriptor.instantiateCodec();
    image = (await codec.getNextFrame()).image;
  } on ApiException {
    rethrow;
  } catch (_) {
    reject('Could not read this photo. Please choose another.');
  } finally {
    image?.dispose();
    codec?.dispose();
    descriptor?.dispose();
    buffer?.dispose();
  }
}
