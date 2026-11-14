import 'package:flutter/material.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mangrooves_mobile/core/app_theme.dart';
import 'package:mangrooves_mobile/shared/observation_choice.dart';
import 'package:mangrooves_mobile/shared/species_names.dart';

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

  testWidgets('dark choice cards and species names use readable theme colors', (
    tester,
  ) async {
    final colors = ColorScheme.fromSeed(
      seedColor: const Color(0xffa6d3a0),
      brightness: Brightness.dark,
    );
    await tester.pumpWidget(
      MaterialApp(
        theme: ThemeData(colorScheme: colors),
        home: Scaffold(
          body: Column(
            children: [
              ObservationChoice(
                label: 'Oval leaves',
                selected: true,
                hasPhoto: false,
                thumbnail: const SizedBox(),
                picture: const SizedBox(),
                onToggle: () {},
              ),
              const SpeciesNames({'local_name': 'Miapi'}),
            ],
          ),
        ),
      ),
    );
    final label = tester.widget<Text>(find.text('Oval leaves'));
    double contrast(Color a, Color b) {
      final x = a.computeLuminance(), y = b.computeLuminance();
      return ((x > y ? x : y) + .05) / ((x > y ? y : x) + .05);
    }

    expect(
      contrast(label.style!.color!, colors.secondaryContainer),
      greaterThanOrEqualTo(4.5),
    );
    expect(
      contrast(
        tester.widget<Text>(find.text('Miapi')).style!.color!,
        colors.surface,
      ),
      greaterThanOrEqualTo(4.5),
    );
    expect(tester.takeException(), isNull);
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
