import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mangrooves_mobile/core/api_client.dart';
import 'package:mangrooves_mobile/screens/dashboard_screen.dart';
import 'package:mangrooves_mobile/screens/cluster_health_map.dart';

class _Api extends ApiClient {
  _Api(this.role);
  final String role;
  String? status;
  bool? attention;
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
      '$role totals open filtered reports and clusters scroll to map',
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
        await tester.tap(find.text('Verified'));
        await tester.pumpAndSettle();
        expect(api.status, 'verified');
        expect(find.text('No reports found.'), findsOneWidget);
        await tester.tap(find.byType(BackButton));
        await tester.pumpAndSettle();
        await tester.ensureVisible(find.text('Needs attention'));
        await tester.tap(find.text('Needs attention'));
        await tester.pumpAndSettle();
        expect(api.attention, true);
        await tester.tap(find.byType(BackButton));
        await tester.pumpAndSettle();
        await tester.ensureVisible(find.text('Clusters'));
        await tester.tap(find.text('Clusters'));
        await tester.pumpAndSettle();
        expect(find.text('Cluster health map').hitTestable(), findsOneWidget);
        expect(
          tester.getTopLeft(find.text('Cluster health map')).dy,
          greaterThan(tester.getTopLeft(find.text('Latest reports')).dy),
        );
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
}
