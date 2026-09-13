import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mangrooves_mobile/app.dart';
import 'package:mangrooves_mobile/core/api_client.dart';
import 'package:mangrooves_mobile/screens/home_shell.dart';
import 'package:mangrooves_mobile/screens/register_screen.dart';

class _RegistrationApi extends ApiClient {
  final registration = Completer<Map<String, dynamic>>();
  int registrationCalls = 0;
  static const user = {
    'id': 42,
    'full_name': 'Test Guardian',
    'email': 'guardian@example.test',
    'role': 'guardian',
    'barangay_id': 1,
  };
  static const barangays = [
    {'id': 1, 'name': 'Inayawan', 'city_municipality': 'Cebu City'},
  ];

  @override
  Future<Map<String, dynamic>> configuration({bool force = false}) async => {
    'barangays': barangays,
  };

  @override
  Future<Map<String, dynamic>> register(Map<String, dynamic> form) {
    registrationCalls++;
    return registration.future;
  }

  @override
  Future<Map<String, dynamic>> dashboard() async => {
    'user': user,
    'stats': <String, dynamic>{},
  };

  @override
  Future<Map<String, dynamic>> reports({int page = 1}) async => {};

  @override
  Future<Map<String, dynamic>> reportForm() async => {};

  @override
  Future<Map<String, dynamic>> badges() async => {
    'metrics': <String, dynamic>{},
  };

  @override
  Future<Map<String, dynamic>> profile() async => {
    'user': user,
    'barangays': barangays,
  };
}

Finder _field(String label) => find.byWidgetPredicate(
  (widget) => widget is TextField && widget.decoration?.labelText == label,
);

Future<void> _fillRegistration(
  WidgetTester tester,
  _RegistrationApi api, {
  String email = 'guardian@example.test',
}) async {
  tester.view.devicePixelRatio = 1;
  tester.view.physicalSize = const Size(420, 1000);
  addTearDown(tester.view.resetPhysicalSize);
  addTearDown(tester.view.resetDevicePixelRatio);
  await tester.pumpWidget(ManGroovesApp(api: api));
  await tester.pumpAndSettle();
  await tester.tap(find.text('Create guardian account'));
  await tester.pumpAndSettle();
  await tester.enterText(_field('Full name'), 'Test Guardian');
  await tester.enterText(_field('Email address'), email);
  await tester.tap(find.byType(DropdownButtonFormField<int>));
  await tester.pumpAndSettle();
  await tester.tap(find.text('Inayawan, Cebu City').last);
  await tester.pumpAndSettle();
  await tester.enterText(_field('Password'), 'test-password-123');
  await tester.enterText(_field('Confirm password'), 'test-password-123');
  await tester.ensureVisible(find.byType(CheckboxListTile));
  await tester.tap(find.byType(CheckboxListTile));
  await tester.ensureVisible(find.byType(FilledButton));
  await tester.pumpAndSettle();
}

void main() {
  testWidgets('registration opens dashboard and removes the form route', (
    tester,
  ) async {
    final api = _RegistrationApi();
    await _fillRegistration(tester, api);
    await tester.tap(find.byType(FilledButton));
    await tester.pump();
    expect(api.registrationCalls, 1);
    expect(
      tester.widget<FilledButton>(find.byType(FilledButton)).onPressed,
      isNull,
    );
    api.registration.complete({'ok': true, 'user': _RegistrationApi.user});
    await tester.pumpAndSettle();

    expect(find.byType(HomeShell), findsOneWidget);
    expect(find.text('Dashboard'), findsOneWidget);
    expect(find.text('Hello, Test'), findsOneWidget);
    expect(find.byType(RegisterScreen, skipOffstage: false), findsNothing);
    expect(
      Navigator.of(tester.element(find.byType(HomeShell))).canPop(),
      isFalse,
    );
    expect(tester.takeException(), isNull);
  });

  testWidgets('server rejection keeps entered information for correction', (
    tester,
  ) async {
    final api = _RegistrationApi();
    await _fillRegistration(tester, api);
    await tester.tap(find.byType(FilledButton));
    await tester.pump();
    api.registration.completeError(
      const ApiException('This email is already registered.'),
    );
    await tester.pumpAndSettle();

    expect(find.byType(RegisterScreen), findsOneWidget);
    expect(find.byType(HomeShell), findsNothing);
    expect(find.text('This email is already registered.'), findsOneWidget);
    expect(
      tester.widget<TextField>(_field('Email address')).controller!.text,
      'guardian@example.test',
    );
    expect(
      tester.widget<FilledButton>(find.byType(FilledButton)).onPressed,
      isNotNull,
    );
    expect(tester.takeException(), isNull);
  });

  testWidgets('invalid email does not send registration to the server', (
    tester,
  ) async {
    final api = _RegistrationApi();
    await _fillRegistration(tester, api, email: 'test02');
    await tester.tap(find.byType(FilledButton));
    await tester.pumpAndSettle();
    expect(find.text('Enter a valid email address.'), findsOneWidget);
    expect(api.registrationCalls, 0);
    expect(find.byType(RegisterScreen), findsOneWidget);
  });
}
