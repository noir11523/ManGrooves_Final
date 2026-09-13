import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:latlong2/latlong.dart';
import 'package:mangrooves_mobile/core/report_location.dart';
import 'package:mangrooves_mobile/screens/location_picker_screen.dart';

// Real map gestures, but no network or platform cache calls in widget tests.
class _MemoryTiles extends TileProvider {
  final _image = MemoryImage(
    base64Decode(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
    ),
  );
  @override
  ImageProvider getImage(TileCoordinates coordinates, TileLayer options) =>
      _image;
}

Finder _field(String label) => find.byWidgetPredicate(
  (widget) => widget is TextField && widget.decoration?.labelText == label,
);

Future<void> _openPicker(
  WidgetTester tester, {
  ReportLocation? initial,
  required void Function(ReportLocation?) onResult,
}) async {
  tester.view.devicePixelRatio = 1;
  tester.view.physicalSize = const Size(420, 820);
  addTearDown(tester.view.resetPhysicalSize);
  addTearDown(tester.view.resetDevicePixelRatio);
  await tester.pumpWidget(
    MaterialApp(
      home: Builder(
        builder: (context) => Scaffold(
          body: TextButton(
            onPressed: () async {
              onResult(
                await Navigator.of(context).push<ReportLocation>(
                  MaterialPageRoute(
                    builder: (_) => LocationPickerScreen(
                      initialCenter: const LatLng(10.2833, 123.8833),
                      barangayCenter: const LatLng(10.2833, 123.8833),
                      maxDistanceMeters: 5000,
                      initialLocation: initial,
                      tileProvider: _MemoryTiles(),
                    ),
                  ),
                ),
              );
            },
            child: const Text('Open map'),
          ),
        ),
      ),
    ),
  );
  await tester.tap(find.text('Open map'));
  await tester.pumpAndSettle();
}

void main() {
  testWidgets(
    'no default pin is silently accepted; tap saves a manual location',
    (tester) async {
      ReportLocation? result;
      await _openPicker(tester, onResult: (location) => result = location);
      final confirm = find.byKey(const ValueKey('confirm-location'));
      expect(tester.widget<FilledButton>(confirm).onPressed, isNull);
      final map = find.byKey(const ValueKey('location-map'));
      await tester.tapAt(tester.getCenter(map) + const Offset(70, -40));
      // Map taps wait for the double-tap-to-zoom gesture timeout.
      await tester.pump(const Duration(milliseconds: 350));
      await tester.pumpAndSettle();
      expect(tester.widget<FilledButton>(confirm).onPressed, isNotNull);
      await tester.tap(confirm);
      await tester.pumpAndSettle();
      expect(result, isNotNull);
      expect(result!.source, 'manual');
      expect(result!.longitude, greaterThan(123.8833));
      expect(result!.latitude, greaterThan(10.2833));
      expect(result!.accuracy, isNull);
      expect(find.byType(LocationPickerScreen), findsNothing);
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets(
    'moving map updates the pin; cancel does not replace a GPS selection',
    (tester) async {
      const gps = ReportLocation.gps(
        latitude: 10.2833,
        longitude: 123.8833,
        accuracy: 5,
      );
      ReportLocation? result = gps;
      await _openPicker(
        tester,
        initial: gps,
        onResult: (location) => result = location,
      );
      await tester.drag(
        find.byKey(const ValueKey('location-map')),
        const Offset(70, 20),
      );
      await tester.pumpAndSettle();
      expect(
        tester
            .widget<Text>(find.byKey(const ValueKey('selected-coordinates')))
            .data,
        isNot('10.283300, 123.883300'),
      );
      await tester.tap(find.byType(BackButton));
      await tester.pumpAndSettle();
      expect(result, isNull);
      expect(gps.source, 'gps');
      expect(gps.latitude, 10.2833);
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets(
    'coordinates work without GPS and invalid or out-of-area pins cannot confirm',
    (tester) async {
      ReportLocation? result;
      await _openPicker(tester, onResult: (location) => result = location);
      await tester.tap(find.text('Enter coordinates instead'));
      await tester.pumpAndSettle();
      await tester.enterText(_field('Latitude'), 'NaN');
      await tester.enterText(_field('Longitude'), '181');
      await tester.tap(find.text('Set pin'));
      await tester.pumpAndSettle();
      expect(find.textContaining('Enter a number between'), findsNWidgets(2));
      await tester.enterText(_field('Latitude'), '11');
      await tester.enterText(_field('Longitude'), '123');
      await tester.tap(find.text('Set pin'));
      await tester.pumpAndSettle();
      final confirm = find.byKey(const ValueKey('confirm-location'));
      expect(find.textContaining('outside your barangay'), findsOneWidget);
      expect(tester.widget<FilledButton>(confirm).onPressed, isNull);
      await tester.tap(find.text('Enter coordinates instead'));
      await tester.pumpAndSettle();
      await tester.enterText(_field('Latitude'), '10.28331');
      await tester.enterText(_field('Longitude'), '123.88332');
      await tester.tap(find.text('Set pin'));
      await tester.pumpAndSettle();
      await tester.tap(confirm);
      await tester.pumpAndSettle();
      expect(result!.latitude, 10.28331);
      expect(result!.longitude, 123.88332);
      expect(result!.source, 'manual');
      expect(tester.takeException(), isNull);
    },
  );
}
