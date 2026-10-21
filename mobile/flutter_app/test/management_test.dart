import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mangrooves_mobile/core/api_client.dart';
import 'package:mangrooves_mobile/screens/management_screen.dart';

class _Api extends ApiClient {
  final calls = <Map<String, String>>[];
  final writes = <Map<String, dynamic>>[];
  bool deleted = false, failDelete = false;
  @override
  Future<Map<String, dynamic>> cloudRequest(
    String path, {
    Map<String, dynamic>? body,
    Map<String, String>? query,
    bool anonymous = false,
  }) async {
    calls.add(query ?? {});
    if (body != null) {
      writes.add(body);
      if (body['action'] == 'delete') {
        if (failDelete) throw const ApiException('Please try again.');
        deleted = true;
      }
    }
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
      'species': deleted
          ? []
          : [
              {
                'id': 1,
                'common_name': 'Grey mangrove',
                'local_name': 'Bungalon',
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
    'species names are local-first and deletion can cancel, fail, retry and refresh',
    (tester) async {
      final api = _Api();
      await tester.pumpWidget(
        MaterialApp(
          home: ManagementScreen(api: api, page: 'species'),
        ),
      );
      await tester.pumpAndSettle();
      await tester.ensureVisible(find.byTooltip('Edit'));
      await tester.pumpAndSettle();
      await tester.tap(find.byTooltip('Edit'));
      await tester.pumpAndSettle();
      expect(
        tester.getTopLeft(find.text('Local name')).dy,
        lessThan(tester.getTopLeft(find.text('Common name')).dy),
      );
      expect(
        tester.getTopLeft(find.text('Common name')).dy,
        lessThan(tester.getTopLeft(find.text('Scientific name')).dy),
      );
      final localField = find
          .descendant(
            of: find.byType(BottomSheet),
            matching: find.byType(TextFormField),
          )
          .first;
      await tester.enterText(localField, 'Unsaved name');
      Future<void> delete() async {
        await tester.ensureVisible(find.text('Delete species'));
        await tester.tap(find.text('Delete species'));
        await tester.pumpAndSettle();
      }

      await delete();
      await tester.tap(find.text('Cancel'));
      await tester.pumpAndSettle();
      expect(api.writes, isEmpty);
      expect(find.text('Unsaved name'), findsOneWidget);
      api.failDelete = true;
      await delete();
      await tester.tap(find.text('Delete'));
      await tester.pumpAndSettle();
      expect(find.text('Please try again.'), findsOneWidget);
      expect(find.byType(BottomSheet), findsOneWidget);
      api.failDelete = false;
      await delete();
      await tester.tap(find.text('Delete'));
      await tester.pumpAndSettle();
      expect(api.writes.last, {'id': 1, 'action': 'delete'});
      expect(find.byTooltip('Edit'), findsNothing);
      await tester.tap(find.text('Add species'));
      await tester.pumpAndSettle();
      expect(find.text('Delete species'), findsNothing);
      expect(tester.takeException(), isNull);
    },
  );
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
      await tester.tap(find.text('Filter'));
      await tester.pumpAndSettle();
      expect(api.calls.last['q'], 'sample');
      expect(api.calls.last['page'], '1');
      await tester.tap(find.text('Create staff account'));
      await tester.pumpAndSettle();
      expect(find.text('First name'), findsOneWidget);
      expect(find.text('Upload work or professional ID photo'), findsOneWidget);
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
      await tester.tap(find.text('Filter'));
      await tester.pumpAndSettle();
      expect(find.byTooltip('Edit'), findsNothing);
      expect(api.calls.length, 1);
      expect(tester.takeException(), isNull);
    });
  }
}
