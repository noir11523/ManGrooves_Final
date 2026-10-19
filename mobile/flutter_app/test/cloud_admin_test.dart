import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mangrooves_mobile/core/api_client.dart';
import 'package:mangrooves_mobile/screens/cloud_admin_screen.dart';

class _AdminApi extends ApiClient {
  Map<String, dynamic>? decision, signer;
  List<Map<String, dynamic>>? applications;
  bool failRetry = false;
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
    if (body?['action'] == 'retry_email') {
      if (failRetry) {
        throw const ApiException('Could not send the email. Try again.');
      }
      applications!.firstWhere(
        (item) => item['uid'] == body!['uid'],
      )['email_status'] = 'sent';
      return {'message': 'Email sent.'};
    }
    if (body != null) decision = body;
    if (applications != null) return {'items': applications};
    return {
      'items': [
        {
          'uid': 'applicant',
          'full_name': 'Test Expert',
          'email': 'test@example.test',
          'status': decision == null
              ? 'pending'
              : decision?['action'] == 'reject'
              ? 'rejected'
              : 'approved',
          'note': decision?['note'],
          'email_status': decision == null ? null : 'sent',
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
  Size size = const Size(320, 800),
  double textScale = 1,
}) async {
  tester.view.devicePixelRatio = 1;
  tester.view.physicalSize = size;
  addTearDown(tester.view.resetPhysicalSize);
  addTearDown(tester.view.resetDevicePixelRatio);
  await tester.pumpWidget(
    MaterialApp(
      builder: (context, child) => MediaQuery(
        data: MediaQuery.of(context)
            .copyWith(textScaler: TextScaler.linear(textScale)),
        child: child!,
      ),
      home: CloudAdminScreen(api: api, certificates: certificates),
    ),
  );
  await tester.pumpAndSettle();
}

void main() {
  testWidgets('declining keeps the dialog open until a reason is entered', (
    tester,
  ) async {
    final api = _AdminApi();
    await _open(tester, api);
    await tester.tap(find.text('Decline'));
    await tester.pumpAndSettle();
    final decline = find.descendant(
      of: find.byType(AlertDialog),
      matching: find.text('Decline'),
    );
    await tester.tap(decline);
    await tester.pumpAndSettle();
    expect(api.decision, isNull);
    expect(find.text('Add a reason for declining.'), findsOneWidget);
    await tester.enterText(
      _field('Message to applicant'),
      'Please provide a current ID.',
    );
    await tester.tap(decline);
    await tester.pumpAndSettle();
    expect(api.decision?['note'], 'Please provide a current ID.');
    expect(find.text('Please provide a current ID.'), findsOneWidget);
    expect(find.text('Decline reason'), findsOneWidget);
    expect(find.text('Declined'), findsOneWidget);
    expect(find.text('Email sent'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });
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
      await tester.tap(find.text('Approve expert'));
      await tester.pumpAndSettle();
      expect(api.decision, isNull);
      await tester.tap(find.text('Cancel'));
      await tester.pumpAndSettle();
      expect(api.decision, isNull);
      await tester.tap(find.text('Approve expert'));
      await tester.pumpAndSettle();
      await tester.enterText(
        _field('Message to applicant (optional)'),
        'ID checked.',
      );
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
      expect(find.text('Approve expert'), findsNothing);
      expect(tester.takeException(), isNull);
    },
  );
  testWidgets(
    'reviewed cards omit sender setup and an email failure can be retried',
    (tester) async {
      final api = _AdminApi()
        ..applications = [
          {
            'uid': 'declined',
            'full_name': 'Sample Applicant',
            'email': 'applicant@example.test',
            'status': 'rejected',
            'email_status': 'not_configured',
            'note': 'Please provide a current ID.',
            'reviewer_name': 'Test Admin',
            'reviewed_at': '2026-10-16T00:00:00Z',
          },
        ]
        ..failRetry = true;
      await _open(tester, api);
      expect(find.text('Connect the email sender'), findsNothing);
      expect(find.text('Decline reason'), findsOneWidget);
      await tester.scrollUntilVisible(
        find.text('Retry email'),
        200,
        scrollable: find.byType(Scrollable).first,
      );
      await tester.pumpAndSettle();
      await tester.tap(find.text('Retry email'));
      await tester.pumpAndSettle();
      expect(find.text('Could not send the email. Try again.'), findsOneWidget);
      await tester.pump(const Duration(seconds: 5));
      await tester.pumpAndSettle();
      api.failRetry = false;
      await tester.scrollUntilVisible(
        find.text('Retry email'),
        200,
        scrollable: find.byType(Scrollable).first,
      );
      await tester.pumpAndSettle();
      await tester.tap(find.text('Retry email'));
      await tester.pumpAndSettle();
      expect(find.text('Email sent'), findsOneWidget);
      expect(find.text('Retry email'), findsNothing);
      expect(tester.takeException(), isNull);
    },
  );
  testWidgets(
    'application cards stay bounded on tablet and wrap long content at large text sizes',
    (tester) async {
      for (final width in [320.0, 1024.0]) {
        final api = _AdminApi()
          ..applications = [
            {
              'uid': 'long',
              'full_name': 'Sample Applicant With A Long Name',
              'email': 'long.registered.email.address@example.test',
              'id_code': 'WORK-2026/001',
              'status': 'rejected',
              'email_status': 'failed',
              'note': 'Please provide your current professional credentials.',
            },
          ];
        await _open(tester, api, size: Size(width, 1200), textScale: 2);
        final card = find.byKey(const ValueKey('application-long'));
        await tester.ensureVisible(card);
        await tester.pumpAndSettle();
        expect(tester.getSize(card).width, lessThanOrEqualTo(760));
        expect(find.text('Declined'), findsOneWidget);
        expect(tester.takeException(), isNull);
        await tester.pumpWidget(const SizedBox());
      }
    },
  );
}
