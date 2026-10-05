import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:mangrooves_mobile/core/api_client.dart';
import 'package:mangrooves_mobile/screens/email_account_screen.dart';
import 'package:mangrooves_mobile/app.dart';
import 'package:mangrooves_mobile/screens/home_shell.dart';
import 'package:mangrooves_mobile/screens/login_screen.dart';

class _EmailApi extends ApiClient {
  final calls = <String>[];
  int logins = 0;
  bool failLogin = false, expireProof = false;
  Map<String, dynamic>? registration, completed;
  @override
  bool get supportsCloudAccounts => true;
  @override
  Future<Map<String, dynamic>> configuration({bool force = false}) async => {
    'barangays': [
      {'id': 1, 'name': 'Inayawan'},
    ],
  };
  @override
  Future<Map<String, dynamic>> cloudRequest(
    String path, {
    Map<String, dynamic>? body,
    Map<String, String>? query,
    bool anonymous = false,
  }) async {
    calls.add(path);
    expect(anonymous, isTrue);
    if (path == 'register.php') {
      registration = Map.of(body!);
      expect(body['stage'], 'account');
      expect(body.containsKey('barangay_id'), false);
      expect(body['privacy_consent'], true);
    }
    if (path == 'verify-email.php' || path == 'reset-password.php') {
      if (body?['code'] != '123456') {
        throw const ApiException(
          'That code is invalid or expired. Request a new one.',
        );
      }
    }
    return {'verification_token': 'email-proof'};
  }

  @override
  Future<Map<String, dynamic>> cloudUpload(
    String path,
    Map<String, dynamic> input,
    Map<String, String> files, {
    String? token,
  }) async {
    calls.add(path);
    expect(token, 'email-proof');
    expect(input['first_name'], 'Test');
    expect(files, isEmpty);
    completed = Map.of(input);
    if (expireProof) {
      throw const ApiException('Verification expired.', statusCode: 401);
    }
    return {'pending_approval': input['role'] == 'expert'};
  }

  @override
  Future<Map<String, dynamic>> login(String email, String password) async {
    logins++;
    if (failLogin) throw const ApiException('Connection lost.');
    return {
      'user': {'id': 1, 'first_name': 'Test', 'role': 'guardian'},
    };
  }

  @override
  Future<Map<String, dynamic>> dashboard() async => {
    'user': {
      'id': 1,
      'first_name': 'Test',
      'full_name': 'Test Guardian',
      'role': 'guardian',
    },
    'stats': <String, dynamic>{},
  };
}

Finder field(String label) => find.byWidgetPredicate(
  (w) => w is TextField && w.decoration?.labelText == label,
);
Future<void> tap(WidgetTester tester, Finder finder) async {
  await tester.ensureVisible(finder);
  await tester.tap(finder);
  await tester.pumpAndSettle();
}

Future<void> _open(
  WidgetTester tester,
  _EmailApi api, {
  bool recovery = false,
}) async {
  tester.view.devicePixelRatio = 1;
  tester.view.physicalSize = const Size(320, 800);
  addTearDown(tester.view.resetPhysicalSize);
  addTearDown(tester.view.resetDevicePixelRatio);
  await tester.pumpWidget(
    MaterialApp(
      home: Builder(
        builder: (context) => Scaffold(
          body: TextButton(
            onPressed: () => Navigator.push(
              context,
              MaterialPageRoute<void>(
                builder: (_) =>
                    EmailAccountScreen(api: api, recovery: recovery),
              ),
            ),
            child: const Text('Open account'),
          ),
        ),
      ),
    ),
  );
  await tap(tester, find.text('Open account'));
}

Future<void> fillDetails(WidgetTester tester) async {
  await tester.enterText(field('First name'), 'Test');
  await tester.enterText(field('Last name'), 'Guardian');
  await tester.enterText(field('Email'), 'guardian@example.test');
  await tester.enterText(field('Password'), 'password123');
  await tester.enterText(field('Confirm password'), 'password123');
  await tap(tester, find.byType(CheckboxListTile));
}

void main() {
  setUp(() => FlutterSecureStorage.setMockInitialValues({}));
  testWidgets(
    'creating a verified guardian account opens the real dashboard without another sign-in',
    (tester) async {
      final api = _EmailApi();
      await tester.pumpWidget(ManGroovesApp(api: api));
      await tester.pumpAndSettle();
      await tap(tester, find.text('Create account'));
      await fillDetails(tester);
      await tap(tester, find.text('Continue'));
      await tester.enterText(field('Verification code'), '123456');
      await tap(tester, find.text('Verify code'));
      await tap(tester, find.byType(DropdownButtonFormField<int>));
      await tap(tester, find.text('Inayawan').last);
      await tap(tester, find.text('Finish registration'));
      expect(api.logins, 1);
      expect(find.byType(HomeShell), findsOneWidget);
      expect(find.byType(LoginScreen), findsNothing);
      expect(find.byType(EmailAccountScreen), findsNothing);
      expect(find.text('Dashboard'), findsOneWidget);
      expect(tester.takeException(), isNull);
    },
  );
  testWidgets(
    'registration password visibility, length guidance, and privacy notice work on a narrow screen',
    (tester) async {
      final api = _EmailApi();
      await _open(tester, api);
      await tester.enterText(field('Password'), 'abcdefgh');
      await tester.pumpAndSettle();
      expect(
        find.text('Password length accepted. No special symbols required.'),
        findsOneWidget,
      );
      await tap(tester, find.byTooltip('Show password'));
      expect(tester.widget<TextField>(field('Password')).obscureText, isFalse);
      expect(
        tester.widget<TextField>(field('Confirm password')).obscureText,
        isTrue,
      );
      await tap(tester, find.byTooltip('Hide password'));
      expect(tester.widget<TextField>(field('Password')).obscureText, isTrue);
      await tap(tester, find.text('Read privacy notice'));
      expect(find.byType(AlertDialog), findsOneWidget);
      await tap(tester, find.text('Close'));
      expect(
        tester.widget<CheckboxListTile>(find.byType(CheckboxListTile)).value,
        isFalse,
      );
      expect(api.calls, isEmpty);
      expect(tester.takeException(), isNull);
    },
  );
  testWidgets(
    'guardian follows three steps and cannot finish with invalid code or missing profile',
    (tester) async {
      final api = _EmailApi();
      await _open(tester, api);
      expect(find.byType(DropdownButtonFormField<int>), findsNothing);
      await fillDetails(tester);
      await tester.enterText(field('Confirm password'), 'different');
      await tap(tester, find.text('Continue'));
      expect(api.calls, isEmpty);
      await tester.enterText(field('Confirm password'), 'password123');
      await tap(tester, find.text('Continue'));
      expect(api.calls, ['register.php']);
      expect(field('First name'), findsNothing);
      expect(field('Verification code'), findsOneWidget);
      await tester.enterText(field('Verification code'), '000000');
      await tap(tester, find.text('Verify code'));
      expect(find.textContaining('invalid or expired'), findsOneWidget);
      expect(api.completed, isNull);
      await tester.enterText(field('Verification code'), '123456');
      await tap(tester, find.text('Verify code'));
      expect(field('Verification code'), findsNothing);
      expect(api.logins, 0);
      await tap(tester, find.text('Finish registration'));
      expect(api.completed, isNull);
      await tap(tester, find.byType(DropdownButtonFormField<int>));
      await tap(tester, find.text('Inayawan').last);
      await tap(tester, find.text('Finish registration'));
      expect(api.calls.last, 'complete-registration.php');
      expect(api.logins, 1);
      expect(find.byType(EmailAccountScreen), findsNothing);
      expect(tester.takeException(), isNull);
    },
  );
  testWidgets(
    'expert adds ID after verifying and Back preserves details without sending another code',
    (tester) async {
      final api = _EmailApi();
      await _open(tester, api);
      await fillDetails(tester);
      await tap(tester, find.text('Continue'));
      await tester.enterText(field('Verification code'), '123456');
      await tap(tester, find.text('Verify code'));
      await tap(tester, find.byType(DropdownButtonFormField<String>));
      await tap(tester, find.text('Expert').last);
      await tap(tester, find.byType(DropdownButtonFormField<int>));
      await tap(tester, find.text('Inayawan').last);
      await tap(tester, find.text('Submit expert application'));
      expect(find.text('Enter your expert ID code.'), findsOneWidget);
      expect(api.completed, isNull);
      await tester.enterText(field('Expert ID code'), ' WORK-2026/001 ');
      await tap(tester, find.text('Back to account'));
      expect(
        tester.widget<TextField>(field('First name')).controller!.text,
        'Test',
      );
      await tap(tester, find.text('Continue'));
      expect(api.calls.where((c) => c == 'register.php').length, 1);
      expect(
        tester.widget<TextField>(field('Expert ID code')).controller!.text,
        ' WORK-2026/001 ',
      );
      await tap(tester, find.text('Submit expert application'));
      expect(api.completed?['expert_id_code'], 'WORK-2026/001');
      expect(find.text('Application sent'), findsOneWidget);
      expect(api.logins, 0);
      await tap(
        tester,
        find.descendant(
          of: find.byType(AlertDialog),
          matching: find.text('Back to sign in'),
        ),
      );
      expect(find.byType(EmailAccountScreen), findsNothing);
      expect(tester.takeException(), isNull);
    },
  );
  testWidgets(
    'change email clears proof and cooldown prevents repeated code requests',
    (tester) async {
      final api = _EmailApi();
      await _open(tester, api);
      await fillDetails(tester);
      await tap(tester, find.text('Continue'));
      final resend = find.widgetWithText(OutlinedButton, 'Resend in 59s');
      expect(tester.widget<OutlinedButton>(resend).onPressed, isNull);
      await tap(tester, find.text('Change email'));
      expect(
        tester.widget<TextField>(field('Password')).controller!.text,
        'password123',
      );
      await tester.enterText(field('Email'), 'changed@example.test');
      await tap(tester, find.text('Continue'));
      expect(api.calls, ['register.php']);
      expect(find.textContaining('Wait a minute'), findsOneWidget);
      expect(field('Verification code'), findsNothing);
      expect(tester.takeException(), isNull);
    },
  );
  testWidgets(
    'expired verification keeps profile and returns to the code step',
    (tester) async {
      final api = _EmailApi()..expireProof = true;
      await _open(tester, api);
      await fillDetails(tester);
      await tap(tester, find.text('Continue'));
      await tester.enterText(field('Verification code'), '123456');
      await tap(tester, find.text('Verify code'));
      await tap(tester, find.byType(DropdownButtonFormField<int>));
      await tap(tester, find.text('Inayawan').last);
      await tap(tester, find.text('Finish registration'));
      expect(field('Verification code'), findsOneWidget);
      expect(api.logins, 0);
      expect(find.text('Verification expired.'), findsOneWidget);
      expect(tester.takeException(), isNull);
    },
  );
  testWidgets(
    'successful account creation handles a failed automatic sign-in without duplicate registration',
    (tester) async {
      final api = _EmailApi()..failLogin = true;
      await _open(tester, api);
      await fillDetails(tester);
      await tap(tester, find.text('Continue'));
      await tester.enterText(field('Verification code'), '123456');
      await tap(tester, find.text('Verify code'));
      await tap(tester, find.byType(DropdownButtonFormField<int>));
      await tap(tester, find.text('Inayawan').last);
      await tap(tester, find.text('Finish registration'));
      expect(find.text('Account created'), findsOneWidget);
      expect(field('Password'), findsNothing);
      expect(api.logins, 1);
      api.failLogin = false;
      await tap(tester, find.text('Continue to dashboard'));
      expect(api.logins, 2);
      expect(
        api.calls.where((c) => c == 'complete-registration.php').length,
        1,
      );
      expect(find.byType(EmailAccountScreen), findsNothing);
    },
  );
  testWidgets('password reset uses recovery code and returns to sign in', (
    tester,
  ) async {
    final api = _EmailApi();
    await _open(tester, api, recovery: true);
    await tester.enterText(field('Email'), 'guardian@example.test');
    await tap(tester, find.text('Send reset code'));
    expect(api.calls, ['forgot-password.php']);
    await tester.enterText(field('Email code'), '000000');
    await tester.enterText(field('New password'), 'newpassword123');
    await tester.enterText(field('Confirm password'), 'newpassword123');
    await tap(tester, find.widgetWithText(FilledButton, 'Reset password'));
    expect(find.textContaining('invalid or expired'), findsOneWidget);
    await tester.enterText(field('Email code'), '123456');
    await tap(tester, find.widgetWithText(FilledButton, 'Reset password'));
    expect(find.text('Password changed'), findsOneWidget);
    await tap(
      tester,
      find.descendant(
        of: find.byType(AlertDialog),
        matching: find.text('Back to sign in'),
      ),
    );
    expect(find.byType(EmailAccountScreen), findsNothing);
    expect(api.logins, 0);
    expect(tester.takeException(), isNull);
  });
}
