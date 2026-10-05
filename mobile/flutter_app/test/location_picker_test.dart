import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:latlong2/latlong.dart';
import 'package:mangrooves_mobile/core/api_client.dart';
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

class _PlaceApi extends ApiClient {
  @override
  bool get supportsCloudAccounts => true;
  @override
  Future<Map<String, dynamic>> cloudRequest(
    String path, {
    Map<String, dynamic>? body,
    Map<String, String>? query,
    bool anonymous = false,
  }) async => {
    'places': [
      {
        'label': 'Test seaside landmark',
        'latitude': 10.284,
        'longitude': 123.884,
      },
    ],
  };
}

Future<void> _openPicker(
  WidgetTester tester, {
  ReportLocation? initial,
  String initialName = '',
  LatLng? approximateCenter,
  double? approximateAccuracy,
  ApiClient? api,
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
                      api: api,
                      initialCenter: const LatLng(10.2833, 123.8833),
                      barangayCenter: const LatLng(10.2833, 123.8833),
                      maxDistanceMeters: 5000,
                      initialLocation: initial,
                      initialName: initialName,
                      approximateCenter: approximateCenter,
                      approximateAccuracy: approximateAccuracy,
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
    'choosing an address moves the pin and returns a manual observation location',
    (tester) async {
      ReportLocation? result;
      await _openPicker(
        tester,
        api: _PlaceApi(),
        onResult: (value) => result = value,
      );
      await tester.enterText(_field('Find an address or landmark'), 'seaside');
      await tester.pump(const Duration(milliseconds: 750));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Test seaside landmark'));
      await tester.pumpAndSettle();
      await tester.tap(find.byKey(const ValueKey('confirm-location')));
      await tester.pumpAndSettle();
      expect(result?.latitude, 10.284);
      expect(result?.longitude, 123.884);
      expect(result?.source, 'manual');
      expect(result?.accuracy, isNull);
      expect(tester.takeException(), isNull);
    },
  );
  testWidgets(
    'accurate GPS shows its uncertainty circle and keeps GPS when unchanged',
    (tester) async {
      ReportLocation? result;
      const fix = ReportLocation.gps(
        latitude: 10.2833,
        longitude: 123.8833,
        accuracy: 12,
      );
      await _openPicker(
        tester,
        initial: fix,
        initialName: 'Coastal landmark',
        api: _PlaceApi(),
        onResult: (value) => result = value,
      );
      expect(find.byType(CircleLayer), findsOneWidget);
      expect(
        tester
            .widget<TextField>(_field('Find an address or landmark'))
            .controller!
            .text,
        'Coastal landmark',
      );
      expect(
        tester
            .widget<CircleLayer>(find.byType(CircleLayer))
            .circles
            .single
            .radius,
        12,
      );
      await tester.tap(find.byKey(const ValueKey('confirm-location')));
      await tester.pumpAndSettle();
      expect(result?.source, 'gps');
      expect(result?.accuracy, 12);
      expect(result?.latitude, fix.latitude);
    },
  );

  testWidgets(
    'approximate area shows a circle without accepting an automatic report pin',
    (tester) async {
      await _openPicker(
        tester,
        approximateCenter: const LatLng(10.2833, 123.8833),
        approximateAccuracy: 500,
        onResult: (_) {},
      );
      expect(find.byType(CircleLayer), findsOneWidget);
      expect(
        tester
            .widget<CircleLayer>(find.byType(CircleLayer))
            .circles
            .single
            .radius,
        500,
      );
      expect(
        tester
            .widget<FilledButton>(
              find.byKey(const ValueKey('confirm-location')),
            )
            .onPressed,
        isNull,
      );
    },
  );

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
