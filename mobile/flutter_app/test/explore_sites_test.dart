import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mangrooves_mobile/core/api_client.dart';
import 'package:mangrooves_mobile/screens/explore_sites_screen.dart';

class _Tiles extends TileProvider {
  @override
  ImageProvider getImage(TileCoordinates coordinates, TileLayer options) =>
      MemoryImage(
        base64Decode(
          'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
        ),
      );
}

class _Api extends ApiClient {
  @override
  Future<Map<String, dynamic>> cloudRequest(
    String path, {
    Map<String, String>? query,
    Map<String, dynamic>? body,
    bool anonymous = false,
  }) async => path == 'clusters.php'
      ? {
          'clusters': [
            {'id': 1},
          ],
        }
      : {
          'species': [
            {
              'id': 1,
              'scientific_name': 'Avicennia marina',
              'local_name': 'Bungalon',
            },
            {'id': 2, 'scientific_name': 'Rhizophora apiculata'},
          ],
          'clusters': [
            {
              'id': 1,
              'name': 'Cebu coast',
              'barangay_id': 1,
              'barangay_name': 'Poblacion',
              'city_municipality': 'Cebu City',
              'species_id': 1,
              'latest_health': 'Healthy',
              'verified_count': 2,
              'latitude': 10.28,
              'longitude': 123.88,
            },
            {
              'id': 2,
              'name': 'Danao coast',
              'barangay_id': 2,
              'barangay_name': 'Poblacion',
              'city_municipality': 'Danao City',
              'species_id': 2,
              'latest_health': 'Stressed',
              'verified_count': 1,
              'latitude': 10.3,
              'longitude': 123.9,
            },
          ],
        };
}

void main() {
  testWidgets(
    'Explore filters shared sites, distinguishes locations and limits guardian timeline actions on a small phone',
    (tester) async {
      tester.view.devicePixelRatio = 1;
      tester.view.physicalSize = const Size(320, 800);
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);
      await tester.pumpWidget(
        MaterialApp(
          home: ExploreSitesScreen(
            api: _Api(),
            user: const {'role': 'guardian', 'barangay_id': 1},
            tileProvider: _Tiles(),
          ),
        ),
      );
      await tester.pumpAndSettle();
      expect(find.text('Manage species and sites'), findsNothing);
      await tester.enterText(find.byType(TextField).first, 'Danao');
      await tester.pumpAndSettle();
      await tester.scrollUntilVisible(
        find.text('1 shared site · Verified reports only'),
        200,
        scrollable: find.byType(Scrollable).first,
      );
      expect(
        find.text('1 shared site · Verified reports only'),
        findsOneWidget,
      );
      await tester.ensureVisible(find.byType(FlutterMap));
      await tester.pumpAndSettle();
      await tester.tap(find.byTooltip('Danao coast: Stressed'));
      await tester.pumpAndSettle();
      expect(find.textContaining('outside your barangay'), findsOneWidget);
      expect(find.text('Health history'), findsNothing);
      await tester.tap(find.byTooltip('Close'));
      await tester.pumpAndSettle();
      tester
          .state<ScrollableState>(find.byType(Scrollable).first)
          .position
          .jumpTo(0);
      await tester.pumpAndSettle();
      await tester.ensureVisible(find.text('Reset filters'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Reset filters'));
      await tester.pumpAndSettle();
      expect(
        find.text('2 shared sites · Verified reports only'),
        findsOneWidget,
      );
      final species = find.byKey(const ValueKey('Species-'));
      tester
          .state<ScrollableState>(find.byType(Scrollable).first)
          .position
          .jumpTo(0);
      await tester.pumpAndSettle();
      await tester.ensureVisible(species);
      await tester.pumpAndSettle();
      await tester.tap(species);
      await tester.pumpAndSettle();
      await tester.tap(find.text('Avicennia marina').last);
      await tester.pumpAndSettle();
      expect(
        find.text('1 shared site · Verified reports only'),
        findsOneWidget,
      );
      expect(tester.takeException(), isNull);
    },
  );
}
