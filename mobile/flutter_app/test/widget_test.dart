import 'package:flutter_test/flutter_test.dart';
import 'package:mangrooves_mobile/app.dart';
import 'package:mangrooves_mobile/core/api_client.dart';

void main() {
  testWidgets('shows the ManGROOVES sign-in screen', (tester) async {
    await tester.pumpWidget(ManGroovesApp(api: ApiClient()));
    await tester.pumpAndSettle();

    expect(find.text('ManGROOVES'), findsOneWidget);
    expect(find.text('Sign in'), findsWidgets);
    expect(find.text('Create guardian account'), findsOneWidget);
  });
}
