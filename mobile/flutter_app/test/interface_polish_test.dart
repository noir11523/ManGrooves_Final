import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mangrooves_mobile/core/api_client.dart';
import 'package:mangrooves_mobile/screens/reports_screen.dart';
import 'package:mangrooves_mobile/screens/validation_history_screen.dart';

class _Api extends ApiClient {
  bool fail = false;
  int loads = 0;
  @override
  Future<Map<String, dynamic>> reports({int page = 1}) async {
    loads++;
    if (fail) throw const ApiException('Could not connect. Try again.');
    return {
      'pages': 1,
      'items': [
        {
          'id': 23,
          'report_code': 'Report #23',
          'status': 'pending',
          'needs_attention': 1,
          'sitio_name': 'Coastal mangrove site',
          'display_health': 'Stressed',
          'submitted_at': '2026-10-03',
        },
      ],
    };
  }

  @override
  Future<Map<String, dynamic>> validationHistory({int page = 1}) async => {
    'items': [
      {
        'report_id': 23,
        'report_code': 'Report #23',
        'action': 'correct',
        'verifier_name': 'Clement',
        'new_status': 'verified',
        'new_health': 'Healthy',
        'created_at': '2026-10-03',
      },
    ],
  };
}

Future<void> smallPhone(WidgetTester tester, Widget child) async {
  tester.view.physicalSize = const Size(320, 800);
  tester.view.devicePixelRatio = 1;
  addTearDown(tester.view.resetPhysicalSize);
  addTearDown(tester.view.resetDevicePixelRatio);
  await tester.pumpWidget(
    MaterialApp(
      builder: (context, child) => MediaQuery(
        data: MediaQuery.of(context)
            .copyWith(textScaler: const TextScaler.linear(1.4)),
        child: child!,
      ),
      home: child,
    ),
  );
  await tester.pumpAndSettle();
}

void main() {
  testWidgets(
    'report cards fit a small phone with large text and one status tag',
    (tester) async {
      await smallPhone(tester, Scaffold(body: ReportsScreen(api: _Api())));
      final card = find.byType(ListTile);
      expect(
        find.descendant(of: card, matching: find.text('Needs attention')),
        findsOneWidget,
      );
      expect(
        find.descendant(of: card, matching: find.text('Pending')),
        findsNothing,
      );
      expect(tester.takeException(), isNull);
    },
  );
  testWidgets(
    'review history shows the saved reviewer and decision from the cloud API',
    (tester) async {
      await smallPhone(tester, ValidationHistoryScreen(api: _Api()));
      expect(find.text('Review history'), findsOneWidget);
      expect(find.textContaining('Clement'), findsOneWidget);
      expect(find.textContaining('Verified · Healthy'), findsOneWidget);
      expect(find.textContaining('null'), findsNothing);
      expect(tester.takeException(), isNull);
    },
  );
  testWidgets(
    'report connection errors have an explicit working retry button',
    (tester) async {
      final api = _Api()..fail = true;
      await smallPhone(tester, Scaffold(body: ReportsScreen(api: api)));
      expect(find.text('Try again'), findsOneWidget);
      api.fail = false;
      await tester.tap(find.text('Try again'));
      await tester.pumpAndSettle();
      expect(api.loads, 2);
      expect(find.text('Report #23'), findsOneWidget);
      expect(tester.takeException(), isNull);
    },
  );
}
