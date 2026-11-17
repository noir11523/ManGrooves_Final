import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mangrooves_mobile/core/api_client.dart';
import 'package:mangrooves_mobile/shared/condition_score.dart';
import 'package:mangrooves_mobile/screens/verification_screen.dart';

class _Api extends ApiClient {
  _Api(this.condition, this.species);
  final String condition;
  final int? species;
  @override
  Future<Map<String, dynamic>> report(int id) async => {
    'report': {
      'id': id,
      'report_code': 'Report #8',
      'suggested_health': condition,
      'suggested_species_id': species,
      'health_score': 6,
      'health_max_score': 6,
      'observations': [],
      'status': 'pending',
    },
  };
}

void main() {
  final species = [
    {'id': 1, 'scientific_name': 'Avicennia marina', 'active': 1},
  ];
  for (final condition in ['Healthy', 'Stressed', 'At Risk', 'Unknown']) {
    for (final id in [1, null]) {
      testWidgets('review decision for $condition with species $id', (
        tester,
      ) async {
        await tester.pumpWidget(
          MaterialApp(
            home: ReviewReportScreen(
              api: _Api(condition, id),
              reportId: 8,
              species: species,
            ),
          ),
        );
        await tester.pumpAndSettle();
        final decision = find.byWidgetPredicate(
          (widget) => widget is DropdownButtonFormField<String>,
        );
        await tester.scrollUntilVisible(
          find.byType(ConditionScore),
          150,
          scrollable: find.byType(Scrollable).first,
        );
        await tester.pumpAndSettle();
        expect(find.text('Total condition score: 6 / 6'), findsOneWidget);
        await tester.ensureVisible(decision.first);
        await tester.pumpAndSettle();
        await tester.tap(decision.first);
        await tester.pumpAndSettle();
        expect(
          find.text('Confirm system suggestions'),
          condition != 'Unknown' && id != null ? findsWidgets : findsNothing,
        );
        expect(find.text('Correction'), findsWidgets);
        expect(tester.takeException(), isNull);
      });
    }
  }
  for (final width in [320.0, 390.0, 1024.0]) {
    testWidgets('score is readable at $width with large text', (tester) async {
      tester.view.physicalSize = Size(width, 900);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);
      await tester.pumpWidget(
        MaterialApp(
          home: MediaQuery(
            data: MediaQueryData(textScaler: TextScaler.linear(2)),
            child: Scaffold(
              body: SingleChildScrollView(
                child: Padding(
                  padding: EdgeInsets.all(16),
                  child: ConditionScore({
                    'health_score': null,
                    'condition_score_summary': {
                      'score': null,
                      'checks': [
                        {'name': 'Roots', 'points': null},
                      ],
                    },
                  }),
                ),
              ),
            ),
          ),
        ),
      );
      expect(find.text('Total condition score: Incomplete'), findsOneWidget);
      expect(find.text('Not scored: Roots.'), findsOneWidget);
      expect(tester.takeException(), isNull);
    });
  }
}
