import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mangrooves_mobile/core/api_client.dart';
import 'package:mangrooves_mobile/screens/profile_screen.dart';

class _AccountApi extends ApiClient {
  _AccountApi(this.role);
  final String role;
  bool rejectPassword = false;
  bool cleared = false;
  int changes = 0;
  Map<String, dynamic>? submitted;
  Map<String, dynamic> get user => {
    'id': 1,
    'first_name': 'Test',
    'last_name': 'User',
    'email': 'test@example.test',
    'role': role,
    'barangay_id': 1,
  };
  @override
  Future<Map<String, dynamic>> profile() async => {
    'user': user,
    'barangays': [
      {'id': 1, 'name': 'Test', 'city_municipality': 'City'},
    ],
  };
  @override
  Future<Map<String, dynamic>> updateAccountSecurity(
    Map<String, dynamic> form,
  ) async {
    changes++;
    submitted = form;
    if (rejectPassword) {
      throw const ApiException('Your current password is incorrect.');
    }
    return {'ok': true, 'message': 'Password changed. Sign in again.'};
  }

  @override
  Future<void> clearSession() async {
    cleared = true;
  }
}

Finder _field(String label) => find.byWidgetPredicate(
  (widget) => widget is TextField && widget.decoration?.labelText == label,
);

void main() {
  for (final role in ['guardian', 'expert', 'system_admin']) {
    testWidgets(
      '$role has locked email, no deactivation and can change password',
      (tester) async {
        tester.view.physicalSize = const Size(420, 1200);
        tester.view.devicePixelRatio = 1;
        addTearDown(tester.view.resetPhysicalSize);
        addTearDown(tester.view.resetDevicePixelRatio);
        final api = _AccountApi(role);
        var signedOut = false;
        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: ProfileScreen(
                api: api,
                initialUser: api.user,
                onSignedOut: () async {
                  signedOut = true;
                },
                onUserChanged: (_) {},
              ),
            ),
          ),
        );
        await tester.pumpAndSettle();
        expect(
          tester.widget<TextField>(_field('Email address')).readOnly,
          isTrue,
        );
        expect(find.textContaining('Deactivate'), findsNothing);
        expect(
          find.text('Health checklist'),
          role == 'system_admin' ? findsOneWidget : findsNothing,
        );
        await tester.ensureVisible(find.text('Change password'));
        await tester.tap(find.text('Change password'));
        await tester.pumpAndSettle();
        expect(find.byType(BackButton), findsOneWidget);
        await tester.enterText(_field('Current password'), 'oldpassword');
        await tester.enterText(_field('New password'), 'simplepass');
        await tester.enterText(_field('Confirm new password'), 'mismatch');
        await tester.tap(find.text('Update password'));
        await tester.pumpAndSettle();
        expect(find.text('The new passwords do not match.'), findsOneWidget);
        expect(api.changes, 0);
        await tester.enterText(_field('Confirm new password'), 'simplepass');
        await tester.tap(find.text('Update password'));
        await tester.pumpAndSettle();
        await tester.tap(find.text('Cancel'));
        await tester.pumpAndSettle();
        expect(api.changes, 0);
        api.rejectPassword = true;
        await tester.tap(find.text('Update password'));
        await tester.pumpAndSettle();
        await tester.tap(find.text('Confirm'));
        await tester.pumpAndSettle();
        expect(
          find.text('Your current password is incorrect.'),
          findsOneWidget,
        );
        expect(signedOut, isFalse);
        expect(api.cleared, isFalse);
        api.rejectPassword = false;
        await tester.tap(find.text('Update password'));
        await tester.pumpAndSettle();
        await tester.tap(find.text('Confirm'));
        await tester.pumpAndSettle();
        expect(api.submitted, {
          'action': 'password',
          'current_password': 'oldpassword',
          'new_password': 'simplepass',
          'new_password_confirmation': 'simplepass',
        });
        expect(api.cleared, isTrue);
        expect(signedOut, isTrue);
        expect(find.text('Update password'), findsNothing);
        expect(tester.takeException(), isNull);
      },
    );
  }
}
