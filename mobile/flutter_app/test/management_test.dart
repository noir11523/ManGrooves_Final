import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mangrooves_mobile/core/api_client.dart';
import 'package:mangrooves_mobile/screens/management_screen.dart';

class _Api extends ApiClient {
  final calls = <Map<String, String>>[];
  @override
  Future<Map<String, dynamic>> cloudRequest(
    String path, {
    Map<String, dynamic>? body,
    Map<String, String>? query,
    bool anonymous = false,
  }) async {
    calls.add(query ?? {});
    return {
      'items': [
        {
          'id': 1,
          'full_name': 'Sample Guardian',
          'email': 'sample@example.test',
          'role': 'guardian',
          'status': 'active',
          'barangay_name': 'Inayawan',
        },
      ],
      'species': [
        {
          'id': 1,
          'common_name': 'Grey mangrove',
          'scientific_name': 'Avicennia marina',
          'root_type': 'Pneumatophores',
          'leaf_shape': 'Oval',
          'active': 1,
        },
      ],
      'badges': [
        {
          'id': 1,
          'badge_name': 'First Report',
          'metric': 'verified_reports',
          'target_value': 1,
          'earned_count': 7,
          'active': 1,
        },
      ],
      'barangays': [
        {'id': 1, 'name': 'Inayawan'},
      ],
      'total': 1,
      'page': 1,
      'pages': 1,
    };
  }
}

void main() {
  testWidgets(
    'Users has staff creation and sends search to the server on a small phone',
    (tester) async {
      tester.view.physicalSize = const Size(320, 700);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);
      final api = _Api();
      await tester.pumpWidget(
        MaterialApp(
          home: ManagementScreen(api: api, page: 'users'),
        ),
      );
      await tester.pumpAndSettle();
      expect(find.text('Create staff account'), findsOneWidget);
      await tester.enterText(find.byType(TextField).first, 'sample');
      await tester.tap(find.text('Apply'));
      await tester.pumpAndSettle();
      expect(api.calls.last['q'], 'sample');
      expect(api.calls.last['page'], '1');
      await tester.tap(find.text('Create staff account'));
      await tester.pumpAndSettle();
      expect(find.text('First name'), findsOneWidget);
      expect(find.text('Expert credential ID'), findsOneWidget);
      expect(tester.takeException(), isNull);
    },
  );
  for (final page in ['species', 'badge-settings']) {
    testWidgets('$page keeps editor closed until needed and filters locally', (
      tester,
    ) async {
      final api = _Api();
      await tester.pumpWidget(
        MaterialApp(
          home: ManagementScreen(api: api, page: page),
        ),
      );
      await tester.pumpAndSettle();
      expect(find.text('Create staff account'), findsNothing);
      expect(find.byTooltip('Edit'), findsOneWidget);
      await tester.enterText(find.byType(TextField).first, 'missing');
      await tester.tap(find.text('Apply'));
      await tester.pumpAndSettle();
      expect(find.byTooltip('Edit'), findsNothing);
      expect(api.calls.length, 1);
      expect(tester.takeException(), isNull);
    });
  }
}
