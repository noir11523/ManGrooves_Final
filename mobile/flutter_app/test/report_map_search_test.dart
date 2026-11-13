import 'dart:async';
import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mangrooves_mobile/core/api_client.dart';
import 'package:mangrooves_mobile/screens/report_map_screen.dart';

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
  final reportQueries = <Map<String, dynamic>>[];
  bool failReports = false;
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
}

Future<void> _open(
  WidgetTester tester,
  _Api api, {
  double scale = 1,
  Size size = const Size(360, 800),
}) async {
  tester.view.devicePixelRatio = 1;
  tester.view.physicalSize = size;
  addTearDown(tester.view.resetPhysicalSize);
  addTearDown(tester.view.resetDevicePixelRatio);
  await tester.pumpWidget(
    MaterialApp(
      builder: (context, child) => MediaQuery(
        data: MediaQuery.of(context)
            .copyWith(textScaler: TextScaler.linear(scale)),
        child: child!,
      ),
      home: ReportMapScreen(api: api, tileProvider: _Tiles()),
    ),
  );
  await tester.pump();
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
  for (final scale in [1.0, 1.6]) {
    testWidgets(
      'long report pin details stay readable and can close at text scale $scale',
      (tester) async {
        const name =
            'MJ Angel Store Pardo, Natalio Bacalso Avenue, Poblacion Pardo, Cebu City, Central Visayas, Philippines';
        final api = _Api()
          ..items = [
            {..._report, 'cluster_name': name, 'status': 'pending'},
          ];
        await _open(tester, api, scale: scale, size: const Size(320, 640));
        await tester.pumpAndSettle();
        await tester.scrollUntilVisible(
          find.byType(FlutterMap),
          300,
          scrollable: find.byType(Scrollable).first,
        );
        final pin = find.byTooltip('Report #1: Healthy · Pending');
        await tester.pumpAndSettle();
        await Scrollable.ensureVisible(
          tester.element(find.byType(FlutterMap)),
          alignment: .5,
        );
        await tester.pumpAndSettle();
        await tester.tap(pin);
        await tester.pumpAndSettle();
        expect(find.text(name), findsOneWidget);
        expect(find.text('Pending review'), findsOneWidget);
        expect(find.text('Suggested condition: Healthy'), findsOneWidget);
        await tester.ensureVisible(find.text('View report'));
        await tester.pumpAndSettle();
        expect(tester.takeException(), isNull);
        await tester.ensureVisible(find.byTooltip('Close'));
        await tester.pumpAndSettle();
        await tester.tap(find.byTooltip('Close'));
        await tester.pumpAndSettle();
        expect(find.text('Pending review'), findsNothing);
        expect(find.byType(FlutterMap), findsOneWidget);
        expect(tester.takeException(), isNull);
      },
    );
  }
  testWidgets('map loads, report search and filters persist across pages', (
    tester,
  ) async {
    final wait = Completer<Map<String, dynamic>>(), api = _Api();
    api.delayedReports = wait;
    await _open(tester, api);
    expect(find.byType(FlutterMap), findsOneWidget);
    expect(find.text('Loading reports...'), findsOneWidget);
    expect(find.byKey(const ValueKey('map-place-search')), findsNothing);
    api.delayedReports = null;
    wait.complete({
      'items': [_report],
      'page': 1,
      'pages': 2,
      'total': 2,
    });
    await tester.pumpAndSettle();
    await _scrollPage(tester);
    await tester.enterText(
      find.byKey(const ValueKey('map-report-search')),
      'Saved coast',
    );
    await tester.testTextInput.receiveAction(TextInputAction.done);
    await tester.pumpAndSettle();
    expect(api.reportQueries.last['q'], 'Saved coast');
    await tester.tap(find.byType(DropdownButtonFormField<String>).first);
    await tester.pumpAndSettle();
    await tester.tap(find.text('Verified').last);
    await tester.pumpAndSettle();
    expect(api.reportQueries.last['status'], 'verified');
    await _scrollPage(tester, bottom: true);
    await tester.ensureVisible(find.byTooltip('Next page'));
    await tester.tap(find.byTooltip('Next page'));
    await tester.pumpAndSettle();
    expect(api.reportQueries.last, {
      'page': 2,
      'q': 'Saved coast',
      'health': '',
      'status': 'verified',
    });
    expect(tester.takeException(), isNull);
  });
  testWidgets('report loading can retry and an empty result keeps the map', (
    tester,
  ) async {
    final api = _Api()..failReports = true;
    await _open(tester, api);
    await tester.pumpAndSettle();
    expect(find.byType(FlutterMap), findsOneWidget);
    api.failReports = false;
    api.items = [];
    final retry = find.text('Connection interrupted. Tap to retry.');
    await tester.ensureVisible(retry);
    await tester.tap(retry);
    await tester.pumpAndSettle();
    expect(find.byType(FlutterMap), findsOneWidget);
    expect(api.reportQueries.length, 2);
    expect(tester.takeException(), isNull);
  });
  testWidgets('leaving the map during a request is safe', (tester) async {
    final wait = Completer<Map<String, dynamic>>(),
        api = _Api()..delayedReports = Completer<Map<String, dynamic>>();
    api.delayedReports = wait;
    await _open(tester, api);
    await tester.pumpWidget(const SizedBox.shrink());
    wait.complete({
      'items': [_report],
      'page': 1,
      'pages': 1,
      'total': 1,
    });
    await tester.pumpAndSettle();
    expect(tester.takeException(), isNull);
  });
}
