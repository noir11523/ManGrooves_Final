import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mangrooves_mobile/core/api_client.dart';
import 'package:mangrooves_mobile/screens/management_screen.dart';

class _Api extends ApiClient {
  bool deleted = false, fail = false;
  final writes = <Map<String, dynamic>>[];
  @override
  Future<Map<String, dynamic>> cloudRequest(
    String path, {
    Map<String, dynamic>? body,
    Map<String, String>? query,
    bool anonymous = false,
  }) async {
    if (body != null) {
      writes.add(body);
      if (fail) throw const ApiException('Could not delete user. Try again.');
      deleted = true;
      return {};
    }
    return {
      'items': deleted
          ? []
          : [
              {
                'id': 2,
                'full_name': 'Test Guardian',
                'email': 'guardian@example.test',
                'role': 'guardian',
                'status': 'inactive',
                'can_delete': true,
              },
            ],
      'page': 1,
      'pages': 1,
      'total': deleted ? 0 : 1,
    };
  }
}

void main() {
  testWidgets(
    'delete user requires confirmation, handles failure and removes the row after success',
    (tester) async {
      tester.view.devicePixelRatio = 1;
      tester.view.physicalSize = const Size(320, 700);
      addTearDown(tester.view.resetDevicePixelRatio);
      addTearDown(tester.view.resetPhysicalSize);
      final api = _Api();
      await tester.pumpWidget(
        MaterialApp(
          home: ManagementScreen(api: api, page: 'users'),
        ),
      );
      await tester.pumpAndSettle();
      Future<void> openDelete() async {
        await tester.scrollUntilVisible(
          find.widgetWithText(TextButton, 'Delete user'),
          250,
          scrollable: find.byType(Scrollable).first,
        );
        await tester.pumpAndSettle();
        await tester.tap(find.widgetWithText(TextButton, 'Delete user'));
        await tester.pumpAndSettle();
      }

      await openDelete();
      expect(
        find.textContaining('guardian@example.test', findRichText: true),
        findsWidgets,
      );
      await tester.tap(find.text('Cancel'));
      await tester.pumpAndSettle();
      expect(api.writes, isEmpty);
      api.fail = true;
      await openDelete();
      await tester.tap(find.widgetWithText(FilledButton, 'Delete user'));
      await tester.pumpAndSettle();
      expect(api.deleted, false);
      expect(find.text('Could not delete user. Try again.'), findsOneWidget);
      api.fail = false;
      await openDelete();
      await tester.tap(find.widgetWithText(FilledButton, 'Delete user'));
      await tester.pumpAndSettle();
      expect(api.writes.last, {
        'action': 'delete',
        'id': 2,
        'confirm_email': 'guardian@example.test',
      });
      expect(find.text('Test Guardian'), findsNothing);
      expect(tester.takeException(), isNull);
    },
  );
}
