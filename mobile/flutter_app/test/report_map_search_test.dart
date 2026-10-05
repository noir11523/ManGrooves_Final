import 'dart:async';
import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mangrooves_mobile/core/api_client.dart';
import 'package:mangrooves_mobile/screens/report_map_screen.dart';

const _place = {
  'label': 'Parkmall, Mandaue',
  'latitude': 10.3264,
  'longitude': 123.9347,
};
const _report = {
  'id': 1,
  'report_code': 'Report #1',
  'status': 'verified',
  'display_health': 'Healthy',
  'sitio_name': 'Saved coast',
  'latitude': 10.28,
  'longitude': 123.88,
};

class _Tiles extends TileProvider {
  final image = MemoryImage(
    base64Decode(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
    ),
  );
  @override
  ImageProvider getImage(TileCoordinates coordinates, TileLayer options) =>
      image;
}

class _Api extends ApiClient {
  Completer<Map<String, dynamic>>? delayedReports;
  final searches = <String, Completer<Map<String, dynamic>>>{};
  final reportQueries = <Map<String, dynamic>>[];
  bool failReports = false, failSearch = false;
  List<Map<String, dynamic>> items = [_report];
  @override
  bool get supportsCloudAccounts => true;
  @override
  Future<Map<String, dynamic>> reportMap({
    int page = 1,
    String status = '',
    String health = '',
    String query = '',
  }) async {
    reportQueries.add({
      'page': page,
      'status': status,
      'health': health,
      'q': query,
    });
    if (delayedReports != null) return delayedReports!.future;
    if (failReports) throw ApiException('Connection interrupted.');
    return {'items': items, 'page': page, 'pages': 2, 'total': 2};
  }

  @override
  Future<Map<String, dynamic>> cloudRequest(
    String path, {
    Map<String, dynamic>? body,
    Map<String, String>? query,
    bool anonymous = false,
  }) async {
    expect(path, 'places.php');
    if (failSearch) throw ApiException('Address search is unavailable.');
    return searches[query!['q']]?.future ??
        Future.value({
          'places': [
            _place,
            {'label': 'Bad point', 'latitude': 999, 'longitude': 0},
          ],
        });
  }
}

Future<void> _open(WidgetTester tester, _Api api) async {
  tester.view.devicePixelRatio = 1;
  tester.view.physicalSize = const Size(360, 800);
  addTearDown(tester.view.resetPhysicalSize);
  addTearDown(tester.view.resetDevicePixelRatio);
  await tester.pumpWidget(
    MaterialApp(
      home: ReportMapScreen(api: api, tileProvider: _Tiles()),
    ),
  );
  await tester.pump();
  await tester.pump(const Duration(milliseconds: 30));
}

Finder get _searchField => find.byType(TextField);
MapController _controller(WidgetTester tester) =>
    tester.widget<FlutterMap>(find.byType(FlutterMap)).mapController!;
Future<void> _search(WidgetTester tester, String value) async {
  await _scrollPage(tester);
  await tester.enterText(_searchField, value);
  await tester.pump(const Duration(milliseconds: 750));
  await tester.pump(const Duration(milliseconds: 30));
}

// Scroll the page itself; dragging inside FlutterMap intentionally pans the map.
Future<void> _scrollPage(WidgetTester tester, {bool bottom = false}) async {
  for (var i = 0; i < 2; i++) {
    final position = tester
        .state<ScrollableState>(find.byType(Scrollable).first)
        .position;
    position.jumpTo(bottom ? position.maxScrollExtent : 0);
    await tester.pump(const Duration(milliseconds: 250));
  }
}

void main() {
  testWidgets(
    'map appears while reports load, place selection centers it and survives filters and pages',
    (tester) async {
      final wait = Completer<Map<String, dynamic>>(), api = _Api();
      api.delayedReports = wait;
      await _open(tester, api);
      expect(find.byType(FlutterMap), findsOneWidget);
      expect(find.text('Loading reports...'), findsOneWidget);
      await _search(tester, 'Parkmall');
      expect(find.text('Bad point'), findsNothing);
      await tester.tap(find.text('Parkmall, Mandaue'));
      await tester.pump(const Duration(milliseconds: 300));
      expect(
        _controller(tester).camera.center.latitude,
        closeTo(10.3264, .0000001),
      );
      expect(
        _controller(tester).camera.center.longitude,
        closeTo(123.9347, .0000001),
      );
      api.delayedReports = null;
      wait.complete({
        'items': [_report],
        'page': 1,
        'pages': 2,
        'total': 2,
      });
      await tester.pumpAndSettle();
      expect(
        find.byKey(const ValueKey('searched-location-pin')),
        findsOneWidget,
      );
      expect(
        _controller(tester).camera.center.latitude,
        closeTo(10.3264, .0000001),
      );
      await tester.ensureVisible(
        find.byType(DropdownButtonFormField<String>).first,
      );
      await tester.tap(find.byType(DropdownButtonFormField<String>).first);
      await tester.pumpAndSettle();
      await tester.tap(find.text('Verified').last);
      await tester.pumpAndSettle();
      expect(api.reportQueries.last['status'], 'verified');
      expect(
        api.reportQueries.last['q'],
        '',
        reason: 'Address search must not filter reports by the address text',
      );
      await _scrollPage(tester, bottom: true);
      await tester.tap(find.byTooltip('Next page'));
      await tester.pumpAndSettle();
      expect(api.reportQueries.last['page'], 2);
      expect(
        _controller(tester).camera.center.latitude,
        closeTo(10.3264, .0000001),
      );
      await _scrollPage(tester);
      await tester.tap(find.byTooltip('Clear location'));
      await tester.pumpAndSettle();
      expect(find.byKey(const ValueKey('searched-location-pin')), findsNothing);
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets(
    'out-of-order search and leaving the screen cannot replace the selected location',
    (tester) async {
      final api = _Api(),
          old = Completer<Map<String, dynamic>>(),
          late = Completer<Map<String, dynamic>>();
      api.searches['Old coast'] = old;
      api.searches['Late coast'] = late;
      await _open(tester, api);
      await tester.pumpAndSettle();
      await _search(tester, 'Old coast');
      await _search(tester, 'Parkmall');
      await tester.tap(find.text('Parkmall, Mandaue'));
      await tester.pumpAndSettle();
      old.complete({
        'places': [
          {..._place, 'label': 'Old coast'},
        ],
      });
      await tester.pumpAndSettle();
      await _scrollPage(tester);
      expect(
        tester.widget<TextField>(_searchField).controller!.text,
        'Parkmall, Mandaue',
      );
      expect(find.text('Old coast'), findsNothing);
      await _search(tester, 'Late coast');
      await tester.pumpWidget(const SizedBox.shrink());
      late.complete({
        'places': [_place],
      });
      await tester.pumpAndSettle();
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets(
    'failed report loading can retry and search still works with no reports or network geocoding',
    (tester) async {
      final api = _Api()..failReports = true;
      await _open(tester, api);
      await tester.pumpAndSettle();
      expect(find.byType(FlutterMap), findsOneWidget);
      await _search(tester, 'Parkmall');
      await tester.tap(find.text('Parkmall, Mandaue'));
      await tester.pumpAndSettle();
      expect(
        find.byKey(const ValueKey('searched-location-pin')),
        findsOneWidget,
      );
      api.failReports = false;
      await tester.ensureVisible(
        find.text('Connection interrupted. Tap to retry.'),
      );
      await tester.tap(find.text('Connection interrupted. Tap to retry.'));
      await tester.pumpAndSettle();
      api.failSearch = true;
      await _search(tester, 'Saved coast');
      expect(find.widgetWithText(ListTile, 'Saved coast'), findsOneWidget);
      await tester.tap(find.widgetWithText(ListTile, 'Saved coast'));
      await tester.pumpAndSettle();
      expect(
        _controller(tester).camera.center.latitude,
        closeTo(10.28, .0000001),
      );
      api.items = [];
      await _scrollPage(tester);
      await tester.ensureVisible(
        find.byType(DropdownButtonFormField<String>).first,
      );
      await tester.tap(find.byType(DropdownButtonFormField<String>).first);
      await tester.pumpAndSettle();
      await tester.tap(find.text('Rejected').last);
      await tester.pumpAndSettle();
      expect(find.byType(FlutterMap), findsOneWidget);
      expect(
        find.byKey(const ValueKey('searched-location-pin')),
        findsOneWidget,
      );
      expect(tester.takeException(), isNull);
    },
  );
}
