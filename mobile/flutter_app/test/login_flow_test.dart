import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mangrooves_mobile/core/api_client.dart';
import 'package:mangrooves_mobile/screens/login_screen.dart';

class _LoginApi extends ApiClient {
  int calls = 0;
  final pending = Completer<Map<String, dynamic>>();
  @override
  bool get supportsCloudAccounts => true;
  @override
  bool get supportsLocalServerSelection => false;
  @override
  Future<Map<String, dynamic>> login(String email, String password) {
    calls++;
    expect(email, 'guardian@example.test');
    return pending.future;
  }
}

void main() {
  testWidgets(
    'sign-in fits a narrow screen with larger text and prevents duplicate requests',
    (tester) async {
      tester.view.devicePixelRatio = 1;
      tester.view.physicalSize = const Size(320, 800);
      addTearDown(tester.view.resetDevicePixelRatio);
      addTearDown(tester.view.resetPhysicalSize);
      final api = _LoginApi();
      await tester.pumpWidget(
        MaterialApp(
          builder: (context, child) => MediaQuery(
            data: MediaQuery.of(context)
                .copyWith(textScaler: const TextScaler.linear(1.4)),
            child: child!,
          ),
          home: LoginScreen(api: api, onAuthenticated: (_) {}),
        ),
      );
      await tester.pumpAndSettle();
      expect(tester.takeException(), isNull);
      final email = find.byType(TextFormField).first,
          password = find.byType(TextFormField).last;
      await tester.enterText(email, 'guardian@example.test');
      await tester.enterText(password, 'password123');
      await tester.ensureVisible(find.byTooltip('Show password'));
      await tester.tap(find.byTooltip('Show password'));
      await tester.pumpAndSettle();
      expect(find.byTooltip('Hide password'), findsOneWidget);
      final submit = find.widgetWithText(FilledButton, 'Sign in');
      await tester.ensureVisible(submit);
      await tester.tap(submit);
      await tester.pump();
      expect(api.calls, 1);
      expect(
        tester.widget<FilledButton>(find.byType(FilledButton)).onPressed,
        isNull,
      );
      expect(tester.takeException(), isNull);
      api.pending.completeError(
        const ApiException('Check your email and password.'),
      );
      await tester.pumpAndSettle();
      expect(find.text('Check your email and password.'), findsOneWidget);
      expect(
        tester.widget<FilledButton>(find.byType(FilledButton)).onPressed,
        isNotNull,
      );
      expect(find.text('Forgot password?'), findsOneWidget);
      expect(find.text('Create account'), findsOneWidget);
      expect(tester.takeException(), isNull);
    },
  );
}
