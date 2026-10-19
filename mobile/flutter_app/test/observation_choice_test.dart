import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mangrooves_mobile/app.dart';
import 'package:mangrooves_mobile/core/api_client.dart';
import 'package:mangrooves_mobile/shared/observation_choice.dart';

void main() {
  for (final sample in [
    (const Size(320, 720), 1.0),
    (const Size(390, 800), 2.0),
    (const Size(800, 360), 1.4),
  ]) {
    testWidgets(
      'preview and selection fit ${sample.$1} at ${sample.$2}x text',
      (tester) async {
        tester.view.physicalSize = sample.$1;
        tester.view.devicePixelRatio = 1;
        addTearDown(tester.view.resetPhysicalSize);
        addTearDown(tester.view.resetDevicePixelRatio);
        var selected = false;
        const label = 'Gaspang, naay lanot, brown ug lawom nga liki';
        await tester.pumpWidget(
          Builder(
            builder: (context) {
              final theme = (ManGroovesApp(
                api: ApiClient(),
              ).build(context) as MaterialApp).theme;
              return MaterialApp(
                theme: theme,
                builder: (context, child) => MediaQuery(
                  data: MediaQuery.of(context)
                      .copyWith(textScaler: TextScaler.linear(sample.$2)),
                  child: child!,
                ),
                home: Scaffold(
                  body: StatefulBuilder(
                    builder: (context, update) => ListView(
                      padding: const EdgeInsets.all(20),
                      children: [
                        ObservationChoice(
                          label: label,
                          selected: selected,
                          thumbnail: Image.asset('assets/traits/elliptic.png'),
                          picture: Image.asset('assets/traits/elliptic.png'),
                          onToggle: () => update(() => selected = !selected),
                        ),
                      ],
                    ),
                  ),
                ),
              );
            },
          ),
        );
        await tester.pumpAndSettle();
        final circle = find.byKey(const ValueKey('choice-circle-$label'));
        expect(find.text('View photo'), findsNothing);
        expect(find.text('Select'), findsNothing);
        expect(
          tester.getRect(circle).top,
          greaterThan(tester.getRect(find.text(label)).bottom),
        );
        expect(tester.widget<IconButton>(circle).isSelected, false);
        final preview = find.bySemanticsLabel('Preview $label');
        await tester.ensureVisible(preview);
        await tester.pumpAndSettle();
        await tester.tap(preview);
        await tester.pumpAndSettle();
        expect(selected, false);
        expect(tester.takeException(), isNull);
        final dialog = find.byType(Dialog);
        final bounds = tester.getRect(dialog);
        expect(bounds.left, greaterThanOrEqualTo(0));
        expect(bounds.right, lessThanOrEqualTo(sample.$1.width));
        final select = find.descendant(
          of: dialog,
          matching: find.text('Select'),
        );
        expect(select.hitTestable(), findsOneWidget);
        final close = find.descendant(of: dialog, matching: find.text('Close'));
        expect(
          tester.getCenter(close).dy,
          closeTo(tester.getCenter(select).dy, 1),
        );
        expect(
          tester.getCenter(close).dx,
          lessThan(tester.getCenter(select).dx),
        );
        if (sample.$1.height > sample.$1.width) {
          expect(
            tester.getSize(find.byType(InteractiveViewer)).height,
            greaterThan(200),
          );
        }
        await tester.tap(
          find.descendant(of: dialog, matching: find.text('Close')),
        );
        await tester.pumpAndSettle();
        expect(selected, false);
        await tester.tap(preview);
        await tester.pumpAndSettle();
        await tester.tap(select);
        await tester.pumpAndSettle();
        expect(selected, true);
        expect(dialog, findsNothing);
        expect(tester.widget<IconButton>(circle).isSelected, true);
        expect(tester.widget<IconButton>(circle).tooltip, 'Deselect $label');
        await tester.ensureVisible(preview);
        await tester.pumpAndSettle();
        await tester.tap(preview);
        await tester.pumpAndSettle();
        final deselect = find.descendant(
          of: dialog,
          matching: find.text('Deselect'),
        );
        expect(select, findsNothing);
        expect(deselect.hitTestable(), findsOneWidget);
        expect(
          tester.getCenter(close).dy,
          closeTo(tester.getCenter(deselect).dy, 1),
        );
        expect(
          tester.getCenter(close).dx,
          lessThan(tester.getCenter(deselect).dx),
        );
        await tester.tap(close);
        await tester.pumpAndSettle();
        expect(selected, true);
        await tester.tap(preview);
        await tester.pumpAndSettle();
        await tester.tap(deselect);
        await tester.pumpAndSettle();
        expect(selected, false);
        expect(dialog, findsNothing);
        expect(tester.widget<IconButton>(circle).isSelected, false);
        expect(tester.widget<IconButton>(circle).tooltip, 'Select $label');
        await tester.ensureVisible(circle);
        await tester.pumpAndSettle();
        await tester.tap(circle);
        await tester.pumpAndSettle();
        expect(selected, true);
        await tester.tap(circle);
        await tester.pumpAndSettle();
        expect(selected, false);
        expect(tester.takeException(), isNull);
      },
    );
  }
}
