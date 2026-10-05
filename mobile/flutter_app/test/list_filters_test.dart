import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mangrooves_mobile/core/api_client.dart';
import 'package:mangrooves_mobile/screens/validation_history_screen.dart';
import 'package:mangrooves_mobile/screens/verification_screen.dart';
import 'package:mangrooves_mobile/screens/reports_screen.dart';

class _Api extends ApiClient {
  final calls = <Map<String, dynamic>>[];
  Map<String, dynamic> result = {
    'items': [],
    'page': 1,
    'pages': 2,
    'total': 21,
    'summary': {'pending': 21},
  };
  @override
  Future<Map<String, dynamic>> verification({
    int page = 1,
    String query = '',
    String health = '',
  }) async {
    calls.add({'page': page, 'q': query, 'filter': health});
    return {...result, 'page': page};
  }

  @override
  Future<Map<String, dynamic>> validationHistory({
    int page = 1,
    String query = '',
    String action = '',
  }) async {
    calls.add({'page': page, 'q': query, 'filter': action});
    return {...result, 'page': page};
  }

  @override
  Future<Map<String, dynamic>> reports({int page = 1}) async =>
      filteredReports(page: page);
  @override
  Future<Map<String, dynamic>> filteredReports({
    int page = 1,
    String status = '',
    bool needsAttention = false,
    int? clusterId,
    String query = '',
    String health = '',
  }) async {
    calls.add({'page': page, 'q': query, 'filter': health});
    return {...result, 'page': page};
  }
}

void main() {
  testWidgets(
    'report search remains usable with the keyboard on a short phone',
    (tester) async {
      tester.view.physicalSize = const Size(320, 568);
      tester.view.devicePixelRatio = 1;
      tester.view.viewInsets = const FakeViewPadding(bottom: 280);
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);
      addTearDown(tester.view.resetViewInsets);
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(body: ReportsScreen(api: _Api())),
        ),
      );
      await tester.pumpAndSettle();
      expect(tester.takeException(), isNull);
    },
  );
  for (final screen in ['Reports', 'Review queue', 'Review history']) {
    testWidgets(
      '$screen applies search, retains filters on pagination, and clear restores all results',
      (tester) async {
        tester.view.physicalSize = const Size(320, 800);
        tester.view.devicePixelRatio = 1;
        addTearDown(tester.view.resetPhysicalSize);
        addTearDown(tester.view.resetDevicePixelRatio);
        final api = _Api();
        final child = switch (screen) {
          'Reports' => Scaffold(body: ReportsScreen(api: api)),
          'Review queue' => Scaffold(body: VerificationScreen(api: api)),
          _ => ValidationHistoryScreen(api: api),
        };
        await tester.pumpWidget(MaterialApp(home: child));
        await tester.pumpAndSettle();
        await tester.enterText(find.byType(TextField), '  coast  ');
        tester.testTextInput.hide();
        await tester.tap(find.byType(DropdownButtonFormField<String>));
        await tester.pumpAndSettle();
        await tester.tap(
          find.text(screen == 'Review history' ? 'Corrected' : 'Unknown').last,
        );
        await tester.pumpAndSettle();
        await tester.ensureVisible(find.text('Apply'));
        await tester.tap(find.text('Apply'));
        await tester.pumpAndSettle();
        expect(api.calls.last, {
          'page': 1,
          'q': 'coast',
          'filter': screen == 'Review history' ? 'correct' : 'Unknown',
        });
        final next = find.byTooltip('Next page');
        if (screen == 'Review queue') {
          final scroll = tester
              .state<ScrollableState>(find.byType(Scrollable).first)
              .position;
          scroll.jumpTo(scroll.maxScrollExtent);
          await tester.pumpAndSettle();
        }
        await tester.ensureVisible(next);
        await tester.tap(next);
        await tester.pumpAndSettle();
        expect(api.calls.last['page'], 2);
        expect(api.calls.last['q'], 'coast');
        if (screen == 'Review queue' || screen == 'Review history') {
          tester
              .state<ScrollableState>(find.byType(Scrollable).first)
              .position
              .jumpTo(0);
          await tester.pumpAndSettle();
        }
        await tester.ensureVisible(find.text('Clear'));
        expect(
          tester
              .widget<TextField>(find.byType(TextField))
              .controller!
              .text
              .trim(),
          'coast',
        );
        await tester.tap(find.text('Clear'));
        await tester.pumpAndSettle();
        expect(api.calls.last, {'page': 1, 'q': '', 'filter': ''});
        expect(tester.takeException(), isNull);
      },
    );
  }
}
