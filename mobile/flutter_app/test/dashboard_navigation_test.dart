import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mangrooves_mobile/core/api_client.dart';
import 'package:mangrooves_mobile/screens/dashboard_screen.dart';
import 'package:mangrooves_mobile/screens/verification_screen.dart';
import 'package:mangrooves_mobile/screens/cluster_health_map.dart';
import 'package:mangrooves_mobile/screens/cluster_timeline_screen.dart';

class _Api extends ApiClient {
  _Api(this.role);
  final String role;
  String? status;
  bool? attention;
  bool reviewOpened = false;
  @override
  Future<Map<String, dynamic>> verification({
    int page = 1,
    String query = '',
    String health = '',
    String status = 'pending',
    bool verifiedAttention = false,
    String dateFrom = '',
    String dateTo = '',
  }) async {
    this.status = status;
    attention = false;
    reviewOpened = true;
    return {
      'items': [],
      'page': 1,
      'pages': 1,
      'total': 0,
      'summary': {'pending': 0},
    };
  }

  int? openedCluster;
  @override
  Future<Map<String, dynamic>> clusters({
    String query = '',
    String health = '',
  }) async => {'clusters': []};
  @override
  Future<Map<String, dynamic>> cluster(int id) async {
    openedCluster = id;
    return {
      'cluster': {'id': id, 'name': 'Selected mangrove site'},
      'timeline': [],
    };
  }

  @override
  Future<Map<String, dynamic>> dashboard() async => {
    'user': {'role': role, 'full_name': 'Test User'},
    'stats': <String, dynamic>{},
    'clusters': [],
  };
  @override
  Future<Map<String, dynamic>> filteredReports({
    int page = 1,
    String status = '',
    bool needsAttention = false,
    int? clusterId,
    String query = '',
    String health = '',
    String dateFrom = '',
    String dateTo = '',
  }) async {
    this.status = status;
    attention = needsAttention;
    return {'items': [], 'pages': 1};
  }
}

class _Tiles extends TileProvider {
  @override
  ImageProvider getImage(TileCoordinates coordinates, TileLayer options) =>
      MemoryImage(
        base64Decode(
          'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
        ),
      );
}

void main() {
  for (final role in ['guardian', 'expert', 'system_admin']) {
    testWidgets(
      '$role totals open filtered reports and clusters open the scoped list',
      (tester) async {
        tester.view.devicePixelRatio = 1;
        tester.view.physicalSize = const Size(360, 800);
        addTearDown(tester.view.resetPhysicalSize);
        addTearDown(tester.view.resetDevicePixelRatio);
        final api = _Api(role);
        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(body: DashboardScreen(api: api)),
          ),
        );
        await tester.pumpAndSettle();
        await tester.tap(find.text('Verified reports'));
        await tester.pumpAndSettle();
        expect(api.status, 'verified');
        expect(find.text('No reports match this filter.'), findsOneWidget);
        await tester.tap(find.byType(BackButton));
        await tester.pumpAndSettle();
        for (final status in ['pending', 'rejected']) {
          final label = status == 'pending' ? 'Pending' : 'Rejected';
          await tester.ensureVisible(find.text(label));
          await tester.tap(find.text(label));
          await tester.pumpAndSettle();
          expect(api.status, status);
          if (status == 'pending') {
            expect(api.reviewOpened, false);
            expect(find.byType(VerificationScreen), findsNothing);
          }
          expect(api.attention, false);
          await tester.tap(find.byType(BackButton));
          await tester.pumpAndSettle();
        }
        await tester.ensureVisible(find.text('Needs attention'));
        await tester.tap(find.text('Needs attention'));
        await tester.pumpAndSettle();
        expect(api.attention, true);
        await tester.tap(find.byType(BackButton));
        await tester.pumpAndSettle();
        await tester.ensureVisible(find.text('Monitored clusters'));
        await tester.tap(find.text('Monitored clusters'));
        await tester.pumpAndSettle();
        expect(find.byType(ClustersScreen), findsOneWidget);
        expect(find.text('No clusters found.'), findsOneWidget);
        expect(tester.takeException(), isNull);
      },
    );
  }
  testWidgets(
    'cluster markers show health and open the selected cluster reports',
    (tester) async {
      int? opened;
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: ClusterHealthMap(
              tileProvider: _Tiles(),
              onOpenReports: (id) => opened = id,
              clusters: [
                {
                  'id': 7,
                  'name': 'Seaside',
                  'latitude': '10.2833',
                  'longitude': '123.8833',
                  'latest_health': 'Healthy',
                  'barangay_name': 'Inayawan',
                },
              ],
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();
      await tester.tap(find.byTooltip('Seaside: Healthy'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('View reports'));
      await tester.pumpAndSettle();
      expect(opened, 7);
      expect(tester.takeException(), isNull);
    },
  );
  for (final scale in [1.0, 1.6]) {
    testWidgets(
      'site pin details and timeline work on a small phone at text scale $scale',
      (tester) async {
        tester.view.devicePixelRatio = 1;
        tester.view.physicalSize = const Size(320, 640);
        addTearDown(tester.view.resetPhysicalSize);
        addTearDown(tester.view.resetDevicePixelRatio);
        final api = _Api('guardian');
        const name =
            'MJ Angel Store Pardo, Natalio Bacalso Avenue, Poblacion Pardo, Cebu City, Central Visayas, Philippines';
        await tester.pumpWidget(
          MaterialApp(
            builder: (context, child) => MediaQuery(
              data: MediaQuery.of(context)
                  .copyWith(textScaler: TextScaler.linear(scale)),
              child: child!,
            ),
            home: Builder(
              builder: (context) => Scaffold(
                body: SingleChildScrollView(
                  child: ClusterHealthMap(
                    tileProvider: _Tiles(),
                    clusters: const [
                      {
                        'id': 7,
                        'name': name,
                        'latitude': 10.28,
                        'longitude': 123.88,
                        'latest_health': 'Healthy',
                        'cluster_code': 'MGC-1713',
                        'barangay_name': 'Inayawan',
                        'scientific_name': 'Avicennia rumphiana',
                      },
                    ],
                    onOpenReports: (_) {},
                    onOpenTimeline: (id, tab) => Navigator.push(
                      context,
                      MaterialPageRoute<void>(
                        builder: (_) => ClusterTimelineScreen(
                          api: api,
                          clusterId: id,
                          initialTab: tab,
                        ),
                      ),
                    ),
                  ),
                ),
              ),
            ),
          ),
        );
        await tester.pumpAndSettle();
        await tester.tap(find.byTooltip('$name: Healthy'));
        await tester.pumpAndSettle();
        expect(find.text(name), findsOneWidget);
        expect(find.text('MGC-1713 · Inayawan'), findsOneWidget);
        expect(find.text('Avicennia rumphiana'), findsOneWidget);
        await tester.ensureVisible(find.text('Health history'));
        await tester.pumpAndSettle();
        await tester.tap(find.text('Health history'));
        await tester.pumpAndSettle();
        expect(api.openedCluster, 7);
        expect(find.text('Mangrove timeline'), findsOneWidget);
        expect(find.text('Selected mangrove site'), findsOneWidget);
        expect(tester.takeException(), isNull);
      },
    );
  }
}
