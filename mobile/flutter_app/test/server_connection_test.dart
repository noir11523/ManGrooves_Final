import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mangrooves_mobile/core/api_client.dart';
import 'package:mangrooves_mobile/screens/login_screen.dart';

class _ConnectionApi extends ApiClient {
  _ConnectionApi() : super(baseUrl: 'http://192.168.1.2/mobile-api');
  String? checkedAddress;
  bool fail = false;

  @override
  Future<void> connectToLocalServer(String address) async {
    checkedAddress = address;
    if (fail) throw const ApiException('Server is not reachable.');
  }
}

void main() {
  testWidgets('user can correct server before signing in', (tester) async {
    final api = _ConnectionApi();
    await tester.pumpWidget(MaterialApp(
      home: LoginScreen(api: api, onAuthenticated: (_) {}),
    ));
    expect(find.text('Server connection'), findsNothing);
    await tester.ensureVisible(find.byTooltip('Server connection'));
    await tester.tap(find.byTooltip('Server connection'));
    await tester.pumpAndSettle();
    expect(find.byType(BottomSheet), findsOneWidget);
    expect(find.text('Connect to your laptop'), findsOneWidget);
    await tester.enterText(
      find.descendant(of: find.byType(BottomSheet), matching: find.byType(TextField)),
      '192.168.213.53',
    );
    await tester.ensureVisible(find.text('Check and connect'));
    api.fail = true;
    await tester.tap(find.text('Check and connect'));
    await tester.pumpAndSettle();
    expect(find.text('Server is not reachable.'), findsOneWidget);
    api.fail = false;
    await tester.ensureVisible(find.text('Check and connect'));
    await tester.tap(find.text('Check and connect'));
    await tester.pumpAndSettle();
    expect(api.checkedAddress, '192.168.213.53');
    expect(find.byType(BottomSheet), findsNothing);
    expect(find.text('Welcome back'), findsOneWidget);
    expect(find.text('Connected to ManGROOVES. You can sign in now.'), findsOneWidget);
  });
}
