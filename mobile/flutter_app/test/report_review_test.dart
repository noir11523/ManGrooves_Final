import 'dart:io';
import 'dart:convert';
import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:geolocator/geolocator.dart';
import 'package:mangrooves_mobile/core/api_client.dart';
import 'package:mangrooves_mobile/core/report_draft_store.dart';
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

class _DeniedGps extends _Gps {
  int requests = 0;
  bool grantOnRequest = false;
  @override
  Future<LocationPermission> checkPermission() async =>
      LocationPermission.denied;
  @override
  Future<LocationPermission> requestPermission() async {
    requests++;
    return grantOnRequest
        ? LocationPermission.whileInUse
        : LocationPermission.denied;
  }
}

class _AreaApi extends _Api {
  int lookups = 0;
  @override
  Future<Map<String, dynamic>> approximateArea() async {
    lookups++;
    return {'latitude': 10.28, 'longitude': 123.88, 'accuracy': 15000.0};
  }
}

class _SiteApi extends _Api {
  @override
  Future<Map<String, dynamic>> reportForm() async => {
    ...await super.reportForm(),
    'clusters': [
      {
        'id': 1,
        'name': 'Coastal nursery',
        'sitio_name': 'Nursery boardwalk',
        'center_lat': 10.2833,
        'center_lng': 123.8833,
        'radius_meters': 100,
      },
    ],
  };
  @override
  Future<Map<String, dynamic>> previousReports(int clusterId) async => {
    'reports': [],
  };
}

class _Api extends ApiClient {
  bool failSubmit = false;
  int submissions = 0;
  int previews = 0;
  Map<String, String>? sent;
  @override
  Future<Map<String, dynamic>> reportPreview(Map<String, dynamic> input) async {
    previews++;
    return {
      'classification': {
        'status':
            ((input['observations'] as Map?)?['bio_indicators'] as List? ?? [])
                .contains(6)
            ? 'Unknown'
            : 'Healthy',
        'health_score':
            ((input['observations'] as Map?)?['bio_indicators'] as List? ?? [])
                .contains(6)
            ? null
            : 6,
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
          {'id': 6, 'code': 'unknown', 'label': 'Not Sure'},
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
    String? closeupPhotoPath,
    List<String> extraPhotoPaths = const [],
  }) async {
    submissions++;
    sent = fields;
    if (failSubmit) {
      throw const ApiException('Connection interrupted. Try again.');
    }
    return {
      'report': {'report_code': 'MG-8', 'status': 'verified'},
    };
  }
}

class _SearchApi extends _Api {
  @override
  bool get supportsCloudAccounts => true;
  @override
  Future<Map<String, dynamic>> cloudRequest(
    String path, {
    Map<String, dynamic>? body,
    Map<String, String>? query,
    bool anonymous = false,
  }) async => {
    'places': query?['q'] == null
        ? []
        : [
            {
              'label': 'Pier 3, Cebu City',
              'latitude': 10.3012345,
              'longitude': 123.9012345,
            },
          ],
  };
}

class _LiveGps extends _Gps {
  final positions = StreamController<Position>.broadcast();
  @override
  Stream<Position> getPositionStream({LocationSettings? locationSettings}) =>
      positions.stream;
  void send(double accuracy, {bool stale = false}) => positions.add(
    Position(
      latitude: 10.2833,
      longitude: 123.8833,
      timestamp: DateTime.now().subtract(Duration(minutes: stale ? 2 : 0)),
      accuracy: accuracy,
      altitude: 0,
      altitudeAccuracy: 0,
      heading: 0,
      headingAccuracy: 0,
      speed: 0,
      speedAccuracy: 0,
    ),
  );
}

class _Drafts extends ReportDraftStore {
  final Map<String, Map<String, dynamic>> saved = {};
  @override
  Future<Map<String, dynamic>?> load(String scope) async => saved[scope];
  @override
  Future<void> save(String scope, Map<String, dynamic> values) async {
    saved[scope] = Map<String, dynamic>.from(
      jsonDecode(jsonEncode(values)) as Map,
    );
  }

  @override
  String? photoPath(String scope) => saved[scope]?['photo_path'] as String?;
  @override
  Future<void> clear(String scope) async {
    saved.remove(scope);
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

Future<void> chooseObservation(WidgetTester tester, String label) async {
  await tap(tester, find.text(label).first);
  await tap(tester, find.text('Select this choice'));
}

bool observationSelected(WidgetTester tester, String code, int id) => tester
    .widget<Semantics>(find.byKey(ValueKey('observation-$code-$id')))
    .properties
    .selected!;

Future<void> chooseCategory(WidgetTester tester, String label) async {
  await tap(tester, find.widgetWithText(ChoiceChip, label));
}

Future<void> openLocation(WidgetTester tester) async {
  tester.widget<Stepper>(find.byType(Stepper)).onStepTapped!(1);
  await tester.pumpAndSettle();
}

void main() {
  testWidgets(
    'selected site fills the location and Cancel clears the saved report only after confirmation',
    (tester) async {
      final drafts = _Drafts();
      int exits = 0;
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: SubmitReportScreen(
              api: _SiteApi(),
              draftOwner: 'cancel-test',
              draftStore: drafts,
              initialClusterId: 1,
              onSubmitted: () {},
              onExit: () => exits++,
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();
      await openLocation(tester);
      expect(
        tester
            .widget<TextField>(field('Sitio or location name'))
            .controller!
            .text,
        'Nursery boardwalk',
      );
      expect(find.text('Previous report'), findsNothing);
      await tester.enterText(field('Living mangroves observed'), '12');
      await tester.pumpAndSettle();
      expect(drafts.saved, isNotEmpty);
      await tap(tester, find.widgetWithText(TextButton, 'Cancel'));
      await tap(tester, find.text('Keep editing'));
      expect(drafts.saved, isNotEmpty);
      expect(exits, 0);
      await tap(tester, find.widgetWithText(TextButton, 'Cancel'));
      await tap(tester, find.widgetWithText(FilledButton, 'Cancel report'));
      expect(drafts.saved, isEmpty);
      expect(exits, 1);
      expect(tester.takeException(), isNull);
    },
  );
  testWidgets(
    'system Back returns to the previous report step and preserves an unknown count draft',
    (tester) async {
      tester.view.devicePixelRatio = 1;
      tester.view.physicalSize = const Size(320, 800);
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);
      final drafts = _Drafts();
      int exits = 0;
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: SubmitReportScreen(
              api: _SiteApi(),
              draftOwner: 'back-test',
              draftStore: drafts,
              initialClusterId: 1,
              onSubmitted: () {},
              onExit: () => exits++,
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();
      await openLocation(tester);
      await tap(
        tester,
        find.widgetWithText(CheckboxListTile, 'Unable to count'),
      );
      expect(
        tester.widget<TextField>(field('Living mangroves observed')).enabled,
        false,
      );
      await tester.binding.handlePopRoute();
      await tester.pumpAndSettle();
      expect(find.text('1. Photos'), findsOneWidget);
      expect(exits, 0);
      expect(drafts.saved.values.single['count_unknown'], '1');
      expect(drafts.saved.values.single['cluster_id'], 1);
      await tester.binding.handlePopRoute();
      await tester.pumpAndSettle();
      expect(exits, 1);
      expect(drafts.saved, isNotEmpty);
      expect(tester.takeException(), isNull);
    },
  );
  testWidgets(
    'mobile skips IP fallback after denial and retry can recover device location',
    (tester) async {
      final old = GeolocatorPlatform.instance, gps = _DeniedGps();
      GeolocatorPlatform.instance = gps;
      addTearDown(() => GeolocatorPlatform.instance = old);
      final api = _AreaApi(), drafts = _Drafts();
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: SubmitReportScreen(
              api: api,
              draftOwner: 'fallback-user',
              draftStore: drafts,
              onSubmitted: () {},
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();
      await openLocation(tester);
      expect(gps.requests, 1);
      expect(api.lookups, 0);
      expect(find.text('Find approximate area'), findsNothing);
      expect(find.text('Find my location'), findsNothing);
      expect(find.text('Try again'), findsOneWidget);
      expect(find.text('Place a pin'), findsOneWidget);
      expect(
        drafts.saved.values.every((draft) => draft['location'] == null),
        isTrue,
      );
      gps.grantOnRequest = true;
      await tap(tester, find.byKey(const ValueKey('device-location')));
      await tester.runAsync(() async {
        await Future<void>.delayed(const Duration(milliseconds: 50));
      });
      await tester.pumpAndSettle();
      expect(gps.requests, 2);
      expect(api.lookups, 0);
      expect(find.text('Use my location'), findsOneWidget);
      expect(find.text('Adjust pin'), findsOneWidget);
      expect(
        find.textContaining('Device location: 10.283300, 123.883300'),
        findsOneWidget,
      );
      await tester.pumpWidget(const SizedBox.shrink());
      await tester.pump();
    },
  );
  testWidgets(
    'location-name suggestion saves a manual pin and late GPS cannot replace it',
    (tester) async {
      tester.view.devicePixelRatio = 1;
      tester.view.physicalSize = const Size(360, 800);
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);
      final old = GeolocatorPlatform.instance, gps = _LiveGps();
      GeolocatorPlatform.instance = gps;
      addTearDown(() async {
        GeolocatorPlatform.instance = old;
        await gps.positions.close();
      });
      final api = _SearchApi(), drafts = _Drafts();
      Future<void> open() async {
        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: SubmitReportScreen(
                api: api,
                draftOwner: 'search-user',
                draftStore: drafts,
                onSubmitted: () {},
              ),
            ),
          ),
        );
        await tester.pump();
        await tester.pump(const Duration(milliseconds: 100));
      }

      await open();
      await openLocation(tester);
      gps.send(3, stale: true);
      await tester.pump();
      expect(
        find.byKey(const ValueKey('report-location-summary')),
        findsNothing,
      );
      gps.send(250);
      await tester.pump();
      expect(
        find.byKey(const ValueKey('report-location-summary')),
        findsNothing,
      );
      await tester.ensureVisible(field('Sitio or location name'));
      await tester.enterText(field('Sitio or location name'), 'Pier');
      await tester.pump(const Duration(milliseconds: 750));
      await tester.pump();
      await tap(tester, find.text('Pier 3, Cebu City'));
      gps.send(1);
      await tester.pump();
      expect(find.textContaining('Manual pin: 10.301'), findsOneWidget);
      final saved = drafts.saved.entries
          .where((e) => !e.key.endsWith(':closeup'))
          .single
          .value;
      expect((saved['location'] as Map)['location_source'], 'manual');
      expect((saved['location'] as Map)['latitude'], '10.30123450');
      GeolocatorPlatform.instance = _DeniedGps();
      await tap(tester, find.byKey(const ValueKey('device-location')));
      expect(find.text('Try again'), findsOneWidget);
      expect(
        find.textContaining('Your selected pin is unchanged'),
        findsOneWidget,
      );
      expect(find.textContaining('Manual pin: 10.301'), findsOneWidget);
      GeolocatorPlatform.instance = gps;
      await tester.pumpWidget(const SizedBox.shrink());
      await tester.pump();
      await open();
      await tester.pumpAndSettle();
      expect(find.textContaining('Manual pin: 10.301'), findsOneWidget);
      await tester.enterText(field('Sitio or location name'), 'New landmark');
      await tester.pump();
      expect(
        find.byKey(const ValueKey('report-location-summary')),
        findsNothing,
      );
      await tester.pumpWidget(const SizedBox.shrink());
      await tester.pump();
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets(
    'fresh accurate GPS is saved while stale and broad readings are not accepted',
    (tester) async {
      final old = GeolocatorPlatform.instance, gps = _LiveGps();
      GeolocatorPlatform.instance = gps;
      addTearDown(() async {
        GeolocatorPlatform.instance = old;
        await gps.positions.close();
      });
      final drafts = _Drafts();
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: SubmitReportScreen(
              api: _Api(),
              draftOwner: 'gps-user',
              draftStore: drafts,
              onSubmitted: () {},
            ),
          ),
        ),
      );
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 100));
      await openLocation(tester);
      gps.send(4, stale: true);
      await tester.pump();
      gps.send(500);
      await tester.pump();
      expect(
        find.byKey(const ValueKey('report-location-summary')),
        findsNothing,
      );
      gps.send(9);
      await tester.pump();
      await tester.runAsync(() async {
        await Future<void>.delayed(const Duration(milliseconds: 50));
      });
      await tester.pump(const Duration(milliseconds: 100));
      expect(
        find.textContaining('Device location: 10.283300, 123.883300'),
        findsOneWidget,
      );
      expect(
        (drafts.saved.entries
                .where((e) => !e.key.endsWith(':closeup'))
                .single
                .value['location']
            as Map)['location_accuracy'],
        '9.00',
      );
      await tester.pumpWidget(const SizedBox.shrink());
      await tester.pump();
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets(
    'review keeps edits, selects the eligible follow-up and sends only after final confirmation',
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
      final drafts = _Drafts();
      int exits = 0;
      int submitted = 0;
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: SubmitReportScreen(
              api: api,
              draftOwner: 'guardian-a',
              draftStore: drafts,
              initialClusterId: 1,
              initialParentReportId: 7,
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
      await tap(tester, find.text('Gallery').first);
      await tap(tester, find.text('Gallery').last);
      await tap(tester, find.widgetWithText(FilledButton, 'Continue').first);
      expect(find.text('Previous report'), findsOneWidget);
      expect(find.text('This is a follow-up'), findsNothing);
      expect(
        tester.widget<TextField>(field('Sitio or location name')).readOnly,
        isTrue,
      );
      await tester.enterText(field('Living mangroves observed'), '12');
      await tap(tester, find.widgetWithText(FilledButton, 'Continue').first);
      await chooseObservation(tester, 'Green');
      await chooseCategory(tester, 'Animals seen');
      await chooseObservation(tester, 'Crabs');
      await chooseObservation(tester, 'None of the above');
      expect(observationSelected(tester, 'bio_indicators', 2), false);
      await chooseObservation(tester, 'All of the above');
      expect(observationSelected(tester, 'bio_indicators', 3), false);
      await chooseObservation(tester, 'Not Sure');
      await tester.pump(const Duration(milliseconds: 400));
      await tester.pumpAndSettle();
      expect(observationSelected(tester, 'bio_indicators', 4), false);
      expect(find.text('Unknown - needs review'), findsOneWidget);
      expect(find.textContaining('null/6'), findsNothing);
      await chooseObservation(tester, 'All of the above');
      await chooseCategory(tester, 'Warning signs');
      await chooseObservation(tester, 'No animals');
      await chooseCategory(tester, 'Animals seen');
      expect(observationSelected(tester, 'bio_indicators', 4), false);
      await chooseObservation(tester, 'Crabs');
      await chooseCategory(tester, 'Warning signs');
      expect(observationSelected(tester, 'negative_signs', 5), false);
      for (final choice in {
        'Roots': 'Prop',
        'Leaves': 'Oval',
        'Bark': 'Smooth',
      }.entries) {
        await chooseCategory(tester, choice.key);
        await chooseObservation(tester, choice.value);
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
      // Recreate the screen to simulate an app restart, retaining only stored data.
      await tester.pumpWidget(const SizedBox.shrink());
      await tester.pump();
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: SubmitReportScreen(
              api: api,
              draftOwner: 'guardian-a',
              draftStore: drafts,
              onSubmitted: () => submitted++,
              onExit: () => exits++,
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();
      expect(find.text('Notes: Updated note'), findsOneWidget);
      expect(find.textContaining('Manual pin'), findsNothing);
      expect(find.text('Discard draft'), findsNothing);
      expect(find.text('Draft saved on this device.'), findsNothing);
      expect(
        find.text('Draft restored. Continue where you left off.'),
        findsNothing,
      );
      await tap(tester, find.text('These details are from this visit.'));
      await tap(tester, find.text('Submit report'));
      expect(find.text('Submit report?'), findsOneWidget);
      expect(api.submissions, 0);
      await tap(tester, find.text('Keep editing'));
      expect(api.submissions, 0);
      await tap(tester, find.text('Submit report'));
      api.failSubmit = true;
      await tap(tester, find.widgetWithText(FilledButton, 'Submit'));
      expect(find.text('Connection interrupted. Try again.'), findsOneWidget);
      expect(
        drafts.saved.entries
            .where((e) => !e.key.endsWith(':closeup'))
            .single
            .value['guardian_remarks'],
        'Updated note',
      );
      api.failSubmit = false;
      await tap(tester, find.text('Submit report'));
      await tap(tester, find.widgetWithText(FilledButton, 'Submit'));
      expect(api.submissions, 2);
      expect(drafts.saved, isEmpty);
      expect(api.previews, greaterThan(0));
      expect(submitted, 1);
      expect(api.sent!['guardian_remarks'], 'Updated note');
      expect(api.sent!['parent_report_id'], '7');
      expect(find.text('Back to dashboard'), findsNothing);
      tester
          .state<SubmitReportScreenState>(find.byType(SubmitReportScreen))
          .goBack();
      await tester.pumpAndSettle();
      expect(exits, 1);
      expect(tester.takeException(), isNull);
    },
  );
}
