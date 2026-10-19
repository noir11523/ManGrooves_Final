import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mangrooves_mobile/app.dart';
import 'package:mangrooves_mobile/core/api_client.dart';
import 'package:mangrooves_mobile/shared/content_width.dart';

void main() {
  for (final width in [320.0, 1024.0]) {
    for (final scale in [1.0, 2.0]) {
      testWidgets('form and primary actions fit $width at text scale $scale', (
        tester,
      ) async {
        tester.view.devicePixelRatio = 1;
        tester.view.physicalSize = Size(width, 1000);
        addTearDown(tester.view.resetPhysicalSize);
        addTearDown(tester.view.resetDevicePixelRatio);
        var tapped = false;
        await tester.pumpWidget(
          Builder(
            builder: (context) {
              final app =
                  ManGroovesApp(api: ApiClient()).build(context) as MaterialApp;
              return MaterialApp(
                theme: app.theme,
                home: MediaQuery(
                  data: MediaQueryData(
                    size: Size(width, 1000),
                    textScaler: TextScaler.linear(scale),
                  ),
                  child: Scaffold(
                    body: ContentWidth(
                      maxWidth: 600,
                      child: ListView(
                        padding: const EdgeInsets.all(20),
                        children: [
                          const TextField(
                            decoration: InputDecoration(labelText: 'Site name'),
                          ),
                          const SizedBox(height: 16),
                          Wrap(
                            spacing: 12,
                            runSpacing: 12,
                            children: [
                              FilledButton(
                                onPressed: () {
                                  tapped = true;
                                },
                                child: const Text('Save'),
                              ),
                              OutlinedButton(
                                onPressed: () {},
                                child: const Text('Cancel'),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              );
            },
          ),
        );
        await tester.pumpAndSettle();
        expect(
          tester.getSize(find.byType(TextField)).width,
          lessThanOrEqualTo(560),
        );
        expect(
          tester.getSize(find.widgetWithText(FilledButton, 'Save')).height,
          greaterThanOrEqualTo(52),
        );
        await tester.tap(find.text('Save'));
        expect(tapped, isTrue);
        expect(tester.takeException(), isNull);
      });
    }
  }
}
