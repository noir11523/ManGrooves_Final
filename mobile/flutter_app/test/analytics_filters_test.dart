import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mangrooves_mobile/core/api_client.dart';
import 'package:mangrooves_mobile/screens/analytics_screen.dart';

class _AnalyticsApi extends ApiClient {
  Map<String, String>? applied;
  Map<String, dynamic> result(Map<String, String> filters) => {
    'analytics': {
      'scope': 'all_users',
      'filters': {
        'date_from': '2026-08-01',
        'date_to': '2026-10-21',
        ...filters,
      },
      'options': {
        'clusters': [
          {'id': 1, 'name': 'Inayawan monitoring site'},
        ],
        'species': [],
      },
      'verification': {'verified': 0},
      'latest_health': {
        'Healthy': 0,
        'Stressed': 0,
        'At Risk': 0,
        'Unknown': 0,
      },
      'capabilities': {'can_export_pdf': false},
      'growth': [],
      'map': [],
      'priority_areas': [],
      'clusters': [],
      'progress': {},
      'methodology': {},
      'survival_reason': 'Comparable measurements are required.',
    },
  };
  @override
  Future<Map<String, dynamic>> analytics() async => result({});
  @override
  Future<Map<String, dynamic>> filteredAnalytics(
    Map<String, String> filters,
  ) async {
    applied = Map.of(filters);
    return result(filters);
  }
}

void main() {
  testWidgets(
    'small-phone analytics applies site and condition filters without inventing survival',
    (tester) async {
      tester.view.devicePixelRatio = 1;
      tester.view.physicalSize = const Size(320, 850);
      addTearDown(tester.view.resetDevicePixelRatio);
      addTearDown(tester.view.resetPhysicalSize);
      final api = _AnalyticsApi();
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(body: AnalyticsScreen(api: api)),
        ),
      );
      await tester.pumpAndSettle();
      expect(find.text('Survival rate'), findsNothing);
      expect(find.text('Methods and data limitations'), findsNothing);
      expect(find.text('100%'), findsNothing);
      await tester.tap(find.text('Filters'));
      await tester.pumpAndSettle();
      final site = find.byType(DropdownButtonFormField<String>).at(0);
      await tester.ensureVisible(site);
      await tester.tap(site);
      await tester.pumpAndSettle();
      await tester.tap(find.text('Inayawan monitoring site').last);
      await tester.pumpAndSettle();
      final health = find.byType(DropdownButtonFormField<String>).at(2);
      await tester.ensureVisible(health);
      await tester.tap(health);
      await tester.pumpAndSettle();
      await tester.tap(find.text('At Risk').last);
      await tester.pumpAndSettle();
      await tester.ensureVisible(find.text('Apply filters'));
      await tester.tap(find.text('Apply filters'));
      await tester.pumpAndSettle();
      expect(api.applied, {
        'date_from': '2026-08-01',
        'date_to': '2026-10-21',
        'cluster_id': '1',
        'health': 'At Risk',
      });
      expect(tester.takeException(), isNull);
    },
  );
}
