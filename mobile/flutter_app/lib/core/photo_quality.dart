import 'dart:ui' as ui;
import 'dart:typed_data';
import 'dart:math' as math;
import 'dart:convert';

import 'package:flutter/services.dart';

import 'api_client.dart';

Future<Map<String, dynamic>>? _config;
Future<Map<String, dynamic>> photoQualityConfig() => _config ??= rootBundle
    .loadString('assets/config/photo_quality.json')
    .then((text) => Map<String, dynamic>.from(jsonDecode(text) as Map));

String? photoQualityProblem(
  Uint8List data,
  int width,
  int height,
  Map<String, dynamic> c,
) {
  if (data.length != width * height * 4 || width < 3 || height < 3) {
    return 'Could not read this photo. Please choose another.';
  }
  final gray = Float32List(width * height), hist = List<int>.filled(256, 0);
  double sum = 0, squares = 0;
  for (var i = 0; i < gray.length; i++) {
    final a = data[i * 4 + 3] / 255;
    final v =
        (.299 * data[i * 4] + .587 * data[i * 4 + 1] + .114 * data[i * 4 + 2]) *
            a +
        255 * (1 - a);
    gray[i] = v;
    hist[v.round()]++;
    sum += v;
    squares += v * v;
  }
  int percentile(double f) {
    var n = 0;
    for (var i = 0; i < 256; i++) {
      n += hist[i];
      if (n >= gray.length * f) return i;
    }
    return 255;
  }

  final grid = c['tileGrid'] as int,
      tiles = List.generate(grid * grid, (_) => [0.0, 0.0, 0.0, 0.0]);
  double lapSum = 0, lapSquares = 0;
  var n = 0;
  for (var y = 1; y < height - 1; y++) {
    for (var x = 1; x < width - 1; x++) {
      final i = y * width + x,
          lap =
              4 * gray[i] -
              gray[i - 1] -
              gray[i + 1] -
              gray[i - width] -
              gray[i + width];
      final tile =
          tiles[(y * grid / height).floor() * grid +
              (x * grid / width).floor()];
      tile[0]++;
      tile[1] += lap;
      tile[2] += lap * lap;
      tile[3] +=
          ((gray[i + 1] - gray[i - 1]).abs() +
              (gray[i + width] - gray[i - width]).abs()) /
          2;
      lapSum += lap;
      lapSquares += lap * lap;
      n++;
    }
  }
  final mean = sum / gray.length,
      contrast = math.sqrt(math.max(0, squares / gray.length - mean * mean));
  final p05 = percentile(.05), p95 = percentile(.95);
  if (mean < c['minBrightness'] && p95 < c['darkPercentile']) {
    return 'Photo is too dark. Please take a photo with better lighting.';
  }
  if (mean > c['maxBrightness'] && p05 > c['brightPercentile']) {
    return 'Photo is too bright. Please avoid excessive lighting.';
  }
  if (contrast < c['minContrast'] || p95 - p05 < c['minTonalRange']) {
    return 'Photo quality is too low. Please upload a clearer photo.';
  }
  final sharp = tiles
      .where(
        (t) =>
            t[0] > 0 &&
            t[2] / t[0] - math.pow(t[1] / t[0], 2) >=
                c['minSharpTileLaplacian'] &&
            t[3] / t[0] >= c['minGradient'],
      )
      .length;
  if (lapSquares / n - math.pow(lapSum / n, 2) < c['minLaplacian'] &&
      sharp < c['minSharpTiles']) {
    return 'Photo is blurry. Please take a clearer photo.';
  }
  return null;
}

Future<void> checkPhotoClarity(Uint8List bytes) async {
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
    if (math.min(width, height) < c['minSide']) {
      reject(
        'Photo resolution is too low. Please upload a higher-quality photo.',
      );
    }
    if (width * height > c['maxPixels']) {
      reject('Photo is too large to process. Please resize it and try again.');
    }
    final scale = math.min(
      1.0,
      (c['sampleSide'] as num) / math.max(width, height),
    );
    codec = await descriptor.instantiateCodec(
      targetWidth: math.max(3, (width * scale).round()),
      targetHeight: math.max(3, (height * scale).round()),
    );
    image = (await codec.getNextFrame()).image;
    final pixels = await image.toByteData(
      format: ui.ImageByteFormat.rawStraightRgba,
    );
    if (pixels == null) {
      reject('Could not read this photo. Please choose another.');
    }
    final problem = photoQualityProblem(
      pixels!.buffer.asUint8List(),
      image.width,
      image.height,
      c,
    );
    if (problem != null) reject(problem);
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
