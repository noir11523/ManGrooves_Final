import 'package:flutter/material.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mangrooves_mobile/core/app_theme.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  setUp(() {
    FlutterSecureStorage.setMockInitialValues({});
    appTheme.value = 'light';
  });
  tearDown(() => appTheme.value = 'light');
  test('theme survives a new session and rejects invalid values', () async {
    await setAppTheme('dark');
    appTheme.value = 'light';
    await loadAppTheme();
    expect(appTheme.value, 'dark');
    await setAppTheme('invalid');
    expect(appTheme.value, 'dark');
  });
  testWidgets('theme choices fit a small screen and select only one theme', (
    tester,
  ) async {
    tester.view.devicePixelRatio = 1;
    tester.view.physicalSize = const Size(320, 640);
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    await tester.pumpWidget(
      const MaterialApp(home: Scaffold(body: ThemePicker())),
    );
    await tester.tap(find.text('Gold'));
    await tester.pumpAndSettle();
    expect(appTheme.value, 'gold');
    expect(
      tester
          .widgetList<ChoiceChip>(find.byType(ChoiceChip))
          .where((c) => c.selected)
          .length,
      1,
    );
    expect(tester.takeException(), isNull);
  });
}
