import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mangrooves_mobile/core/api_client.dart';
import 'package:mangrooves_mobile/screens/report_map_screen.dart';
import 'package:mangrooves_mobile/screens/cluster_timeline_screen.dart';
import 'package:mangrooves_mobile/screens/validation_history_screen.dart';
import 'package:mangrooves_mobile/screens/verification_screen.dart';

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
  String? status, health;
  int? page;
  Map<String, dynamic>? decision;
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
    this.page = page;
    return {
      'page': page,
      'pages': 3,
      'total': 51,
      'summary': {'pending': 51},
      'items': [
        {'id': page, 'report_code': 'Queue page $page'},
      ],
    };
  }

  @override
  Future<Map<String, dynamic>> reportMap({
    int page = 1,
    String status = '',
    String health = '',
    String query = '',
  }) async {
    this.status = status;
    this.health = health;
    this.page = page;
    return {
      'total': 2,
      'pages': 2,
      'page': page,
      'items': [
        {
          'id': page,
          'report_code': 'MG-$page',
          'latitude': '10.28',
          'longitude': '123.88',
          'display_health': 'Stressed',
          'status': 'pending',
          'sitio_name': 'Seaside',
        },
      ],
    };
  }

  @override
  Future<Map<String, dynamic>> report(int id) async => {
    'report': {
      'id': id,
      'report_code': 'MG-$id',
      'status': 'pending',
      'suggested_health': 'Stressed',
      'suggested_species_id': 1,
      'suggested_species_name': 'Species one',
      'rarity_level': 'Common',
      'health_score': 4,
      'health_max_score': 6,
      'observations': [],
      'verification_history': [
        {
          'action': 'correct',
          'verifier_name': 'Expert',
          'previous_status': 'pending',
          'new_status': 'verified',
          'previous_health': 'At Risk',
          'new_health': 'Stressed',
          'previous_species_name': 'Species one',
          'new_species_name': 'Species two',
          'created_at': '2026-09-27',
          'comment': 'Roots are stable.',
        },
      ],
    },
  };
  @override
  Future<Map<String, dynamic>> cluster(int id) async => {
    'cluster': {'id': id, 'name': 'Seaside'},
    'timeline': [
      {
        'id': 1,
        'submitted_at': '2026-09-01',
        'health': 'Stressed',
        'observed_alive_count': 10,
        'can_view_details': false,
      },
      {
        'id': 2,
        'report_code': 'Report #7',
        'submitted_at': '2026-09-20',
        'health': 'Healthy',
        'observed_alive_count': 12,
        'parent_report_id': 1,
        'can_view_details': true,
      },
    ],
  };
  @override
  Future<Map<String, dynamic>> reviewReport(Map<String, dynamic> form) async {
    decision = form;
    return {'message': 'Review saved.'};
  }
}

Future<void> _phone(WidgetTester tester, Widget screen) async {
  tester.view.devicePixelRatio = 1;
  tester.view.physicalSize = const Size(360, 800);
  addTearDown(tester.view.resetPhysicalSize);
  addTearDown(tester.view.resetDevicePixelRatio);
  await tester.pumpWidget(MaterialApp(home: screen));
  await tester.pumpAndSettle();
}

Future<void> _tap(WidgetTester tester, Finder finder) async {
  if (finder.evaluate().isEmpty) {
    await tester.scrollUntilVisible(
      finder,
      180,
      scrollable: find.byType(Scrollable).first,
    );
  }
  await tester.ensureVisible(finder);
  await tester.pumpAndSettle();
  await tester.tap(finder);
  await tester.pumpAndSettle();
}

void main() {
  testWidgets(
    'review queue reaches older pages and returns to previous pages',
    (tester) async {
      final api = _Api();
      await _phone(tester, Scaffold(body: VerificationScreen(api: api)));
      await tester.scrollUntilVisible(
        find.text('Queue page 1'),
        200,
        scrollable: find.byType(Scrollable).first,
      );
      expect(find.text('Queue page 1'), findsOneWidget);
      await _tap(tester, find.byTooltip('Next page'));
      expect(api.page, 2);
      expect(find.text('Queue page 2'), findsOneWidget);
      await _tap(tester, find.byTooltip('Next page'));
      expect(api.page, 3);
      expect(
        tester
            .widget<IconButton>(
              find.byWidgetPredicate(
                (widget) =>
                    widget is IconButton && widget.tooltip == 'Next page',
              ),
            )
            .onPressed,
        isNull,
      );
      await _tap(tester, find.byTooltip('Previous page'));
      expect(api.page, 2);
      expect(tester.takeException(), isNull);
    },
  );
  testWidgets(
    'report map pins open reports and filters and pages request matching data',
    (tester) async {
      final api = _Api();
      await _phone(tester, ReportMapScreen(api: api, tileProvider: _Tiles()));
      expect(find.byType(MarkerLayer), findsOneWidget);
      await _tap(tester, find.byTooltip('MG-1: Stressed'));
      expect(find.text('Health is a system suggestion.'), findsOneWidget);
      await _tap(tester, find.text('View report'));
      expect(find.text('Health score: 4 / 6'), findsOneWidget);
      await tester.tap(find.byType(BackButton));
      await tester.pumpAndSettle();
      tester
          .state<ScrollableState>(find.byType(Scrollable).first)
          .position
          .jumpTo(0);
      await tester.pumpAndSettle();
      await _tap(tester, find.byType(DropdownButtonFormField<String>).first);
      await _tap(tester, find.text('Verified').last);
      expect(api.status, 'verified');
      await _tap(tester, find.byType(DropdownButtonFormField<String>).last);
      await _tap(tester, find.text('Healthy').last);
      expect(api.health, 'Healthy');
      final scroll = tester
          .state<ScrollableState>(find.byType(Scrollable).first)
          .position;
      scroll.jumpTo(scroll.maxScrollExtent);
      await tester.pumpAndSettle();
      await _tap(tester, find.byTooltip('Next page'));
      expect(api.page, 2);
      expect(tester.takeException(), isNull);
    },
  );
  testWidgets(
    'health and growth pages stay separate and redact private report links',
    (tester) async {
      await _phone(tester, ClusterTimelineScreen(api: _Api(), clusterId: 1));
      expect(find.text('Community observation'), findsOneWidget);
      expect(find.text('View Report #7'), findsOneWidget);
      expect(find.text('View Report #1'), findsNothing);
      expect(find.text('Growth timeline'), findsNothing);
      expect(find.byType(TabBar), findsNothing);
      await tester.pumpWidget(
        MaterialApp(
          home: ClusterTimelineScreen(
            key: const ValueKey('growth'),
            api: _Api(),
            clusterId: 1,
            initialTab: 1,
          ),
        ),
      );
      await tester.pumpAndSettle();
      expect(find.text('Health history'), findsNothing);
      expect(find.byType(TabBar), findsNothing);
      expect(find.text('10 living mangroves'), findsOneWidget);
      expect(find.text('+2 since last visit'), findsOneWidget);
      expect(tester.takeException(), isNull);
    },
  );
  testWidgets(
    'validation card shows reviewer, changed health and changed species',
    (tester) async {
      final report = (await _Api().report(1))['report'] as Map<String, dynamic>;
      await _phone(
        tester,
        Scaffold(
          body: ListView(children: [ValidationHistoryCard(report: report)]),
        ),
      );
      expect(find.text('Corrected · Expert'), findsOneWidget);
      expect(find.textContaining('Species one → Species two'), findsOneWidget);
      expect(find.textContaining('Roots are stable.'), findsOneWidget);
    },
  );
  testWidgets(
    'edited assessment disables confirm and saves an explicit correction',
    (tester) async {
      final api = _Api();
      await _phone(
        tester,
        ReviewReportScreen(
          api: api,
          reportId: 1,
          species: const [
            {'id': 1, 'common_name': 'One', 'scientific_name': 'Species one'},
          ],
        ),
      );
      await _tap(tester, find.byType(DropdownButtonFormField<String>).first);
      await _tap(tester, find.text('Healthy').last);
      final confirm = find.widgetWithText(FilledButton, 'Confirm suggestion');
      await tester.ensureVisible(confirm);
      expect(tester.widget<FilledButton>(confirm).onPressed, isNull);
      await _tap(tester, find.text('Save correction and verify'));
      expect(find.textContaining('Health: Healthy'), findsOneWidget);
      await _tap(tester, find.text('Cancel'));
      expect(api.decision, isNull);
      await _tap(tester, find.text('Save correction and verify'));
      await _tap(tester, find.text('Continue'));
      expect(api.decision?['action'], 'correct');
      expect(api.decision?['final_health'], 'Healthy');
      expect(tester.takeException(), isNull);
    },
  );
}
