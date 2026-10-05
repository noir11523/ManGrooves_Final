import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mangrooves_mobile/core/api_client.dart';
import 'package:mangrooves_mobile/screens/cloud_admin_screen.dart';

class _AdminApi extends ApiClient {
  Map<String, dynamic>? decision, signer;
  @override
  Future<Map<String, dynamic>> cloudRequest(
    String path, {
    Map<String, dynamic>? body,
    Map<String, String>? query,
    bool anonymous = false,
  }) async {
    if (path == 'certificate-settings.php') {
      return {
        'settings':
            signer ??
            {'signer_name': '', 'signer_title': '', 'has_signature': false},
      };
    }
    if (body != null) decision = body;
    return {
      'items': [
        {
          'uid': 'applicant',
          'full_name': 'Test Expert',
          'email': 'test@example.test',
          'status': decision == null ? 'pending' : 'approved',
          'id_code': 'WORK-2026/001',
          'has_id_photo': false,
        },
      ],
    };
  }

  @override
  Future<Map<String, dynamic>> cloudUpload(
    String path,
    Map<String, dynamic> input,
    Map<String, String> files, {
    String? token,
  }) async {
    signer = {...input, 'has_signature': false};
    return {};
  }
}

Finder _field(String label) => find.byWidgetPredicate(
  (w) => w is TextField && w.decoration?.labelText == label,
);
Future<void> _open(
  WidgetTester tester,
  _AdminApi api, {
  bool certificates = false,
}) async {
  tester.view.devicePixelRatio = 1;
  tester.view.physicalSize = const Size(320, 800);
  addTearDown(tester.view.resetPhysicalSize);
  addTearDown(tester.view.resetDevicePixelRatio);
  await tester.pumpWidget(
    MaterialApp(
      home: CloudAdminScreen(api: api, certificates: certificates),
    ),
  );
  await tester.pumpAndSettle();
}

void main() {
  testWidgets(
    'administrator sets signer name and title and retains saved values',
    (tester) async {
      final api = _AdminApi();
      await _open(tester, api, certificates: true);
      await tester.enterText(_field('Signer name'), 'Authorized Signer');
      await tester.enterText(
        _field('Position or title'),
        'Program Coordinator',
      );
      await tester.ensureVisible(find.text('Save signer'));
      await tester.tap(find.text('Save signer'));
      await tester.pumpAndSettle();
      expect(api.signer?['signer_name'], 'Authorized Signer');
      expect(api.signer?['signer_title'], 'Program Coordinator');
      expect(
        tester.widget<TextField>(_field('Signer name')).controller!.text,
        'Authorized Signer',
      );
      expect(tester.takeException(), isNull);
    },
  );
  testWidgets(
    'expert approval waits for confirmation and keeps the administrator note',
    (tester) async {
      final api = _AdminApi();
      await _open(tester, api);
      expect(find.text('WORK-2026/001'), findsOneWidget);
      expect(find.text('View previous ID photo'), findsNothing);
      await tester.tap(find.text('Approve'));
      await tester.pumpAndSettle();
      expect(api.decision, isNull);
      await tester.tap(find.text('Cancel'));
      await tester.pumpAndSettle();
      expect(api.decision, isNull);
      await tester.tap(find.text('Approve'));
      await tester.pumpAndSettle();
      await tester.enterText(_field('Note (optional)'), 'ID checked.');
      await tester.tap(
        find.descendant(
          of: find.byType(AlertDialog),
          matching: find.text('Approve'),
        ),
      );
      await tester.pumpAndSettle();
      expect(api.decision, {
        'uid': 'applicant',
        'action': 'approve',
        'note': 'ID checked.',
      });
      expect(find.text('Approved'), findsOneWidget);
      expect(find.text('Approve'), findsNothing);
      expect(tester.takeException(), isNull);
    },
  );
}
