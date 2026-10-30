import 'dart:io';
import 'dart:ui' as ui;

import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mangrooves_mobile/app.dart';
import 'package:mangrooves_mobile/core/api_client.dart';
import 'package:mangrooves_mobile/screens/management_screen.dart';
import 'package:mangrooves_mobile/screens/sites_screen.dart';

class _CatalogApi extends ApiClient {
  final writes = <Map<String, dynamic>>[];
  final sites = <Map<String, dynamic>>[
    {
      'id': 7,
      'version': 'v1',
      'name': 'Bulacao River Mouth / Boundary Swamp',
      'sitio_name':
          'Inayawan–Cogon Pardo boundary coastline (confirm when pinning)',
      'barangay_id': 1,
      'barangay_name': 'Inayawan',
      'created_by_name': 'Administrator',
      'visibility': 'shared',
      'location_pending': true,
      'active': 0,
    },
    {
      'id': 8,
      'version': 'v2',
      'name': 'Coastal nursery boardwalk',
      'sitio_name': 'Coastal nursery boardwalk',
      'barangay_id': 1,
      'barangay_name': 'Inayawan',
      'visibility': 'personal',
      'location_pending': false,
      'active': 1,
      'center_lat': 10.28,
      'center_lng': 123.88,
      'radius_meters': 75,
    },
  ];
  @override
  Future<Map<String, dynamic>> cloudRequest(
    String path, {
    Map<String, dynamic>? body,
    Map<String, String>? query,
    bool anonymous = false,
  }) async {
    if (body != null) {
      writes.add(body);
      if (body['active'] != null) {
        sites.firstWhere((s) => s['id'] == body['id'])['active'] =
            body['active'];
      }
    }
    return {
      'species': [
        for (final id in [1, 2])
          {
            'id': id,
            'local_name': id == 1
                ? 'Miapi, Bungalon, Api-api'
                : 'Culasi, Tabao',
            'common_name': 'White Mangrove',
            'scientific_name': 'Avicennia rumphiana',
            'root_type': 'Pneumatophores (pencil-like projections)',
            'leaf_shape': 'Elliptic',
            'bark_texture': 'Slightly rough, brown',
            'active': 1,
          },
      ],
      'sites': sites,
      'barangays': [
        {
          'id': 1,
          'name': 'Inayawan',
          'center_lat': 10.28,
          'center_lng': 123.88,
        },
      ],
    };
  }
}

Future<void> _show(
  WidgetTester tester,
  _CatalogApi api,
  double width,
  double scale,
) async {
  tester.view.physicalSize = Size(width, 1000);
  tester.view.devicePixelRatio = 1;
  addTearDown(tester.view.resetPhysicalSize);
  addTearDown(tester.view.resetDevicePixelRatio);
  await tester.pumpWidget(
    Builder(
      builder: (context) => MaterialApp(
        theme: (ManGroovesApp(api: api).build(context) as MaterialApp).theme,
        builder: (context, child) => MediaQuery(
          data: MediaQuery.of(context)
              .copyWith(textScaler: TextScaler.linear(scale)),
          child: RepaintBoundary(
            key: const ValueKey('catalog-capture'),
            child: child!,
          ),
        ),
        home: ManagementScreen(api: api, page: 'species'),
      ),
    ),
  );
  await tester.pumpAndSettle();
}

Future<void> _capture(WidgetTester tester, String name) async {
  if (!const bool.fromEnvironment('CAPTURE_CATALOG')) return;
  final boundary = tester.renderObject<RenderRepaintBoundary>(
    find.byKey(const ValueKey('catalog-capture')),
  );
  await tester.runAsync(() async {
    final image = await boundary.toImage();
    final bytes = await image.toByteData(format: ui.ImageByteFormat.png);
    final file = File('../../tmp/v54-native/$name.png');
    await file.parent.create(recursive: true);
    await file.writeAsBytes(bytes!.buffer.asUint8List());
    image.dispose();
  });
}

void main() {
  setUpAll(() async {
    const fontPath = String.fromEnvironment('CATALOG_FONT');
    if (fontPath.isEmpty) return;
    final font = FontLoader('Roboto')
      ..addFont(
        File(fontPath)
            .readAsBytes()
            .then((bytes) => ByteData.sublistView(bytes)),
      );
    await font.load();
    // Widget tests use Ahem for explicitly styled button labels. Use the same
    // Android font for optional visual captures; ordinary tests retain Ahem.
    await (FontLoader('Ahem')..addFont(
          File(fontPath)
              .readAsBytes()
              .then((bytes) => ByteData.sublistView(bytes)),
        ))
        .load();
    final icons = File(
      '${File(fontPath).parent.path}/MaterialIcons-Regular.otf',
    );
    if (await icons.exists()) {
      await (FontLoader('MaterialIcons')..addFont(
            icons.readAsBytes().then((bytes) => ByteData.sublistView(bytes)),
          ))
          .load();
    }
  });
  for (final (width, scale) in [(320.0, 1.0), (390.0, 1.6), (900.0, 1.0)]) {
    testWidgets(
      'catalog tabs and cards remain readable at $width and ${scale}x text',
      (tester) async {
        final api = _CatalogApi();
        await _show(tester, api, width, scale);
        final selectedSpecies = find.descendant(
          of: find.byType(FilledButton),
          matching: find.text('Species'),
        );
        expect(selectedSpecies, findsOneWidget);
        await _capture(tester, 'species-${width.toInt()}');
        await tester.enterText(find.byType(TextField).first, 'Miapi');
        await tester.tap(find.text('Filter'));
        await tester.pumpAndSettle();
        expect(find.byKey(const ValueKey('species-2')), findsNothing);
        await tester.tap(find.text('Sites'));
        await tester.pumpAndSettle();
        expect(find.byType(SitesScreen), findsOneWidget);
        expect(
          find.descendant(
            of: find.byType(FilledButton),
            matching: find.text('Sites'),
          ),
          findsOneWidget,
        );
        expect(find.text('Needs map location'), findsOneWidget);
        expect(find.text('Add to site list'), findsNothing);
        await tester.enterText(
          find.byType(TextField).first,
          'Coastal nursery boardwalk',
        );
        await tester.tap(find.text('Filter'));
        await tester.pumpAndSettle();
        expect(find.text('Awaiting report verification'), findsOneWidget);
        await tester.tap(find.text('Reset'));
        await tester.pumpAndSettle();
        await _capture(tester, 'sites-${width.toInt()}');
        await tester.scrollUntilVisible(
          find.text('Set map location'),
          180,
          scrollable: find.byType(Scrollable).last,
        );
        await tester.pumpAndSettle();
        await tester.tap(find.text('Set map location'));
        await tester.pumpAndSettle();
        expect(find.text('Edit site'), findsOneWidget);
        await tester.scrollUntilVisible(
          find.text('Save site'),
          180,
          scrollable: find.byType(Scrollable).last,
        );
        await tester.pumpAndSettle();
        await tester.tap(find.text('Save site'));
        await tester.pumpAndSettle();
        expect(
          find.text('Choose the site location on the map.'),
          findsOneWidget,
        );
        expect(api.writes, isEmpty);
        await tester.pageBack();
        await tester.pumpAndSettle();
        await tester.tap(find.text('Species'));
        await tester.pumpAndSettle();
        expect(find.byType(SitesScreen), findsNothing);
        expect(
          find.text('Miapi'),
          findsOneWidget,
        ); // Search survives the tab round trip.
        expect(find.byKey(const ValueKey('species-2')), findsNothing);
        expect(tester.takeException(), isNull);
      },
    );
  }

  testWidgets('site status filter and archive action keep the correct record', (
    tester,
  ) async {
    final api = _CatalogApi();
    await _show(tester, api, 390, 1);
    await tester.tap(find.text('Sites'));
    await tester.pumpAndSettle();
    await tester.enterText(find.byType(TextField).first, 'Coastal nursery');
    await tester.tap(find.text('Filter'));
    await tester.pumpAndSettle();
    expect(find.byKey(const ValueKey('site-7')), findsNothing);
    expect(
      find.text('Coastal nursery boardwalk'),
      findsOneWidget,
    ); // No duplicate address.
    await tester.ensureVisible(find.text('Delete'));
    await tester.tap(find.text('Delete'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Cancel'));
    await tester.pumpAndSettle();
    expect(api.writes, isEmpty);
    await tester.ensureVisible(find.text('Archive'));
    await tester.tap(find.text('Archive'));
    await tester.pumpAndSettle();
    await tester.tap(find.widgetWithText(FilledButton, 'Archive'));
    await tester.pumpAndSettle();
    expect(api.writes.single['id'], 8);
    expect(api.writes.single['version'], 'v2');
    expect(api.writes.single['active'], 0);
    expect(find.text('Restore'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });
}
