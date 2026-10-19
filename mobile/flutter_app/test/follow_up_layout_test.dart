import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mangrooves_mobile/app.dart';
import 'package:mangrooves_mobile/core/api_client.dart';
import 'package:mangrooves_mobile/shared/follow_up_card.dart';

void main() {
  const address =
      'MJ Angel Store Pardo, Natalio Bacalso Avenue, Poblacion Pardo, Cebu City, Central Visayas, Philippines';
  for (final width in [320.0, 390.0]) {
    for (final scale in [1.0, 2.0]) {
      testWidgets(
        'follow-up address and actions fit $width at text scale $scale',
        (tester) async {
          tester.view.physicalSize = Size(width, 900);
          tester.view.devicePixelRatio = 1;
          addTearDown(tester.view.resetPhysicalSize);
          addTearDown(tester.view.resetDevicePixelRatio);
          var views = 0, follows = 0;
          await tester.pumpWidget(
            Builder(
              builder: (context) {
                final app = ManGroovesApp(
                  api: ApiClient(),
                ).build(context) as MaterialApp;
                return MaterialApp(
                  theme: app.theme,
                  home: MediaQuery(
                    data: MediaQueryData(
                      size: Size(width, 900),
                      textScaler: TextScaler.linear(scale),
                    ),
                    child: Scaffold(
                      body: SingleChildScrollView(
                        padding: const EdgeInsets.all(16),
                        child: FollowUpCard(
                          report: const {
                            'id': 1,
                            'report_code': 'Report #1',
                            'cluster_name': address,
                            'follow_up_note': 'Please photograph the roots on your next visit.',
                          },
                          onView: () => views++,
                          onFollowUp: () => follows++,
                        ),
                      ),
                    ),
                  ),
                );
              },
            ),
          );
          await tester.pumpAndSettle();
          expect(tester.getSize(find.text(address)).width, greaterThan(230));
          expect(
            tester.getTopLeft(find.text('Follow up')).dy,
            greaterThan(tester.getBottomLeft(find.text(address)).dy),
          );
          await tester.ensureVisible(find.text('Follow up'));
          await tester.tap(find.text('Follow up'));
          await tester.ensureVisible(find.text('View report'));
          await tester.tap(find.text('View report'));
          expect(follows, 1);
          expect(views, 1);
          expect(tester.takeException(), isNull);
        },
      );
    }
  }
}
