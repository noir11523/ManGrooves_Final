import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:geolocator/geolocator.dart';
import 'package:mangrooves_mobile/core/api_client.dart';
import 'package:mangrooves_mobile/screens/submit_report_screen.dart';

class _Gps extends GeolocatorPlatform {
  @override
  Future<LocationPermission> checkPermission() async =>
      LocationPermission.whileInUse;
  @override
  Future<bool> isLocationServiceEnabled() async => true;
  @override
  Stream<Position> getPositionStream({LocationSettings? locationSettings}) =>
      Stream.value(
        Position(
          latitude: 10.2833,
          longitude: 123.8833,
          timestamp: DateTime.now(),
          accuracy: 10,
          altitude: 0,
          altitudeAccuracy: 0,
          heading: 0,
          headingAccuracy: 0,
          speed: 0,
          speedAccuracy: 0,
        ),
      );
}

class _Api extends ApiClient {
  int submissions = 0;
  int previews = 0;
  Map<String, String>? sent;
  @override
  Future<Map<String, dynamic>> reportPreview(Map<String, dynamic> input) async {
    previews++;
    return {
      'classification': {
        'status': 'Healthy',
        'health_score': 6,
        'health_max_score': 6,
        'breakdown': [
          {'name': 'Leaf color', 'answer': 'Green', 'points': 2},
        ],
      },
      'species': {
        'best': {'scientific_name': 'Test species', 'confidence': 100},
      },
    };
  }

  @override
  Future<Map<String, dynamic>> reportForm() async => {
    'clusters': [
      {'id': 1, 'name': 'Seaside'},
    ],
    'traits': {
      'root_type': ['Prop'],
      'leaf_shape': ['Oval'],
      'bark_texture': ['Smooth'],
    },
    'criteria': [
      {
        'code': 'leaf_color',
        'name': 'Leaf color',
        'selection_mode': 'single',
        'question_text': 'Choose a color.',
        'options': [
          {'id': 1, 'code': 'green', 'label': 'Green'},
        ],
      },
      {
        'code': 'bio_indicators',
        'name': 'Animals seen',
        'question_text': 'What did you see?',
        'selection_mode': 'multiple',
        'options': [
          {'id': 2, 'code': 'crabs', 'label': 'Crabs'},
          {'id': 3, 'code': 'none_of_the_above', 'label': 'None of the above'},
          {'id': 4, 'code': 'all_of_the_above', 'label': 'All of the above'},
        ],
      },
      {
        'code': 'negative_signs',
        'name': 'Warning signs',
        'question_text': 'Any concerns?',
        'selection_mode': 'multiple',
        'options': [
          {'id': 5, 'code': 'no_animals', 'label': 'No animals'},
        ],
      },
    ],
  };
  @override
  Future<Map<String, dynamic>> previousReports(int clusterId) async => {
    'reports': [
      {'id': 7, 'report_code': 'MG-7', 'health': 'Healthy'},
    ],
  };
  @override
  Future<Map<String, dynamic>> submitReport({
    required Map<String, String> fields,
    required Map<String, List<int>> observations,
    required String photoPath,
  }) async {
    submissions++;
    sent = fields;
    return {
      'report': {'report_code': 'MG-8', 'status': 'verified'},
    };
  }
}

Finder field(String label) => find.byWidgetPredicate(
  (widget) => widget is TextField && widget.decoration?.labelText == label,
);
Future<void> tap(WidgetTester tester, Finder finder) async {
  await tester.ensureVisible(finder);
  await tester.pumpAndSettle();
  await tester.tap(finder);
  await tester.pumpAndSettle();
}

void main() {
  testWidgets(
    'review keeps edits, hides unused follow-up and sends only after final confirmation',
    (tester) async {
      tester.view.devicePixelRatio = 1;
      tester.view.physicalSize = const Size(360, 800);
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);
      final oldGps = GeolocatorPlatform.instance;
      GeolocatorPlatform.instance = _Gps();
      addTearDown(() => GeolocatorPlatform.instance = oldGps);
      final messenger =
          TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger;
      const channel = MethodChannel('plugins.flutter.io/image_picker');
      messenger.setMockMethodCallHandler(
        channel,
        (_) async =>
            File('../../public/assets/img/guides/leaf-color.png').absolute.path,
      );
      addTearDown(() => messenger.setMockMethodCallHandler(channel, null));
      final api = _Api();
      int exits = 0;
      int submitted = 0;
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: SubmitReportScreen(
              api: api,
              initialClusterId: 1,
              onSubmitted: () => submitted++,
              onExit: () => exits++,
            ),
          ),
        ),
      );
      await tester.pump(const Duration(seconds: 1));
      await tester.runAsync(() async {
        await Future<void>.delayed(const Duration(milliseconds: 50));
      });
      await tester.pumpAndSettle(
        const Duration(milliseconds: 100),
        EnginePhase.sendSemanticsUpdate,
        const Duration(seconds: 35),
      );
      expect(find.text('Previous report'), findsNothing);
      await tap(tester, find.text('This is a follow-up'));
      expect(find.text('Previous report'), findsOneWidget);
      await tap(tester, find.text('This is a follow-up'));
      expect(find.text('Previous report'), findsNothing);
      await tap(tester, find.text('Gallery'));
      await tester.enterText(field('Sitio or location name'), 'Seaside');
      await tester.enterText(field('Living mangroves observed'), '12');
      await tap(tester, find.widgetWithText(FilledButton, 'Continue').first);
      await tap(tester, find.text('Green').first);
      await tap(tester, find.text('Crabs'));
      await tap(tester, find.text('None of the above'));
      expect(
        tester
            .widget<CheckboxListTile>(
              find.widgetWithText(CheckboxListTile, 'Crabs'),
            )
            .value,
        false,
      );
      await tap(tester, find.text('All of the above'));
      expect(
        tester
            .widget<CheckboxListTile>(
              find.widgetWithText(CheckboxListTile, 'None of the above'),
            )
            .value,
        false,
      );
      await tap(tester, find.text('No animals'));
      expect(
        tester
            .widget<CheckboxListTile>(
              find.widgetWithText(CheckboxListTile, 'All of the above'),
            )
            .value,
        false,
      );
      await tap(tester, find.text('Crabs'));
      expect(
        tester
            .widget<CheckboxListTile>(
              find.widgetWithText(CheckboxListTile, 'No animals'),
            )
            .value,
        false,
      );
      await tap(tester, find.widgetWithText(FilledButton, 'Continue').last);
      for (final label in ['Root type', 'Leaf shape', 'Bark texture']) {
        final dropdown = find.byKey(ValueKey('$label-null'));
        await tap(tester, dropdown);
        await tap(
          tester,
          find
              .text(
                {
                  'Root type': 'Prop',
                  'Leaf shape': 'Oval',
                  'Bark texture': 'Smooth',
                }[label]!,
              )
              .last,
        );
      }
      await tester.enterText(field('Notes (optional)'), 'First note');
      await tap(tester, find.text('Review report'));
      expect(api.submissions, 0);
      expect(find.text('Notes: First note'), findsOneWidget);
      await tap(tester, find.text('Edit details'));
      await tester.enterText(field('Notes (optional)'), 'Updated note');
      await tap(tester, find.text('Review report'));
      expect(find.text('Notes: Updated note'), findsOneWidget);
      expect(find.text('Notes: First note'), findsNothing);
      await tap(tester, find.text('These details are from this visit.'));
      await tap(tester, find.text('Submit report'));
      expect(find.text('Submit report?'), findsOneWidget);
      expect(api.submissions, 0);
      await tap(tester, find.text('Keep editing'));
      expect(api.submissions, 0);
      await tap(tester, find.text('Submit report'));
      await tap(tester, find.widgetWithText(FilledButton, 'Submit'));
      expect(api.submissions, 1);
      expect(api.previews, greaterThan(0));
      expect(submitted, 1);
      expect(api.sent!['guardian_remarks'], 'Updated note');
      expect(api.sent!.containsKey('parent_report_id'), false);
      await tap(tester, find.text('Back to dashboard'));
      expect(exits, 1);
      expect(tester.takeException(), isNull);
    },
  );
}
