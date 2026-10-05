import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:mangrooves_mobile/core/api_client.dart';
import 'package:mangrooves_mobile/screens/home_shell.dart';

class _Api extends ApiClient {
  _Api(this.role);
  final String role;
  int reportLoads = 0, analyticsLoads = 0, verificationLoads = 0;
  Map<String, dynamic> get user => {
    'id': 1,
    'full_name': 'Test User',
    'first_name': 'Test',
    'last_name': 'User',
    'email': 'test@example.test',
    'role': role,
    'barangay_id': 1,
  };
  @override
  Future<Map<String, dynamic>> dashboard() async => {
    'user': user,
    'stats': {},
    'clusters': [],
  };
  @override
  Future<Map<String, dynamic>> reports({int page = 1}) async {
    reportLoads++;
    return {'items': [], 'pages': 1};
  }

  @override
  Future<Map<String, dynamic>> reportForm() async => {};
  @override
  Future<Map<String, dynamic>> badges() async => {'metrics': {}};
  @override
  Future<Map<String, dynamic>> profile() async => {
    'user': user,
    'barangays': [
      {'id': 1, 'name': 'Inayawan', 'city_municipality': 'Cebu City'},
    ],
  };
  @override
  Future<Map<String, dynamic>> verification({int page = 1}) async {
    verificationLoads++;
    return {'summary': {}, 'items': []};
  }

  @override
  Future<Map<String, dynamic>> analytics() async {
    analyticsLoads++;
    return {
      'analytics': {
        'scope': role == 'guardian' ? 'personal' : 'all_users',
        'verification': {'total': role == 'guardian' ? 3 : 12},
        'health': {},
        'capabilities': {
          'can_view_survival': role == 'system_admin',
          'can_export_pdf': role == 'system_admin',
        },
      },
    };
  }

  @override
  Future<Map<String, dynamic>> clusters({
    String query = '',
    String health = '',
  }) async => {'clusters': []};
  @override
  Future<Map<String, dynamic>> notifications({int page = 1}) async => {
    'notifications': [],
    'page': 1,
    'pages': 1,
    'unread': 0,
  };
}

void main() {
  setUp(() => FlutterSecureStorage.setMockInitialValues({}));
  for (final role in ['guardian', 'expert', 'system_admin']) {
    testWidgets(
      '$role small-phone shell has usable back and menu controls and fresh tabs',
      (tester) async {
        tester.view.devicePixelRatio = 1;
        tester.view.physicalSize = const Size(320, 800);
        addTearDown(tester.view.resetPhysicalSize);
        addTearDown(tester.view.resetDevicePixelRatio);
        final api = _Api(role);
        var signOuts = 0;
        await tester.pumpWidget(
          MaterialApp(
            home: HomeShell(
              api: api,
              user: api.user,
              onSignedOut: () async {
                signOuts++;
              },
            ),
          ),
        );
        await tester.pumpAndSettle();
        expect(tester.takeException(), isNull);
        expect(find.text('Report map'), findsOneWidget);
        expect(find.byTooltip('Notifications'), findsOneWidget);
        await tester.tap(find.byTooltip('Analytics and timelines'));
        await tester.pumpAndSettle();
        expect(find.byType(PopupMenuItem<String>).first, findsOneWidget);
        expect(
          tester
              .widget<PopupMenuItem<String>>(
                find.byType(PopupMenuItem<String>).first,
              )
              .value,
          'analytics',
        );
        await tester.tap(
          find.widgetWithText(PopupMenuItem<String>, 'Analytics'),
        );
        await tester.pumpAndSettle();
        expect(
          find.text(
            role == 'guardian' ? 'My analytics' : 'Community analytics',
          ),
          findsOneWidget,
        );
        expect(
          find.text(
            role == 'guardian'
                ? 'Your reports only.'
                : 'Reports from all users.',
          ),
          findsOneWidget,
        );
        expect(find.text(role == 'guardian' ? '3' : '12'), findsOneWidget);
        expect(
          find.text('Generate PDF'),
          role == 'system_admin' ? findsOneWidget : findsNothing,
        );
        expect(tester.takeException(), isNull);
        await tester.tap(find.byType(BackButton));
        await tester.pumpAndSettle();
        await tester.tap(find.byTooltip('Analytics and timelines'));
        await tester.pumpAndSettle();
        await tester.tap(find.text('Growth timeline'));
        await tester.pumpAndSettle();
        expect(find.text('Growth timeline'), findsOneWidget);
        await tester.tap(find.byType(BackButton));
        await tester.pumpAndSettle();
        await tester.tap(find.byTooltip('Notifications'));
        await tester.pumpAndSettle();
        await tester.tap(find.byType(BackButton));
        await tester.pumpAndSettle();
        for (final label
            in role == 'guardian'
                ? ['Reports', 'Observe', 'Badges', 'Account']
                : ['Reports', 'Review', 'Analytics', 'Account']) {
          await tester.tap(
            find.descendant(
              of: find.byType(NavigationBar),
              matching: find.text(label),
            ),
          );
          await tester.pumpAndSettle();
          expect(find.byType(BackButton), findsOneWidget);
          if (label == 'Reports') {
            expect(find.text('Report map'), findsNothing);
          }
          if (label == 'Observe') {
            expect(find.text('Back to dashboard'), findsNothing);
          }
          if (label == 'Account') {
            await tester.scrollUntilVisible(
              find.text('Sign out'),
              400,
              scrollable: find.byType(Scrollable).first,
            );
            expect(find.text('Sign out'), findsOneWidget);
          }
          expect(
            tester.takeException(),
            isNull,
            reason: '$role $label must fit a small phone',
          );
          await tester.tap(find.byType(BackButton));
          await tester.pumpAndSettle();
        }
        final priorLoads = api.reportLoads;
        await tester.tap(
          find.descendant(
            of: find.byType(NavigationBar),
            matching: find.text('Reports'),
          ),
        );
        await tester.pumpAndSettle();
        expect(
          api.reportLoads,
          greaterThan(priorLoads),
          reason: 'Returning to a tab must refresh server changes',
        );
        if (role != 'guardian') {
          final analyticsLoads = api.analyticsLoads,
              verificationLoads = api.verificationLoads;
          for (final label in ['Analytics', 'Review']) {
            await tester.tap(
              find.descendant(
                of: find.byType(NavigationBar),
                matching: find.text(label),
              ),
            );
            await tester.pumpAndSettle();
          }
          expect(api.analyticsLoads, greaterThan(analyticsLoads));
          expect(api.verificationLoads, greaterThan(verificationLoads));
        }
        await tester.tap(
          find.descendant(
            of: find.byType(NavigationBar),
            matching: find.text('Account'),
          ),
        );
        await tester.pumpAndSettle();
        await tester.scrollUntilVisible(
          find.text('Sign out'),
          400,
          scrollable: find.byType(Scrollable).first,
        );
        await tester.tap(find.text('Sign out'));
        await tester.pumpAndSettle();
        expect(
          signOuts,
          1,
          reason: '$role keeps a working Sign out in Account',
        );
      },
    );
  }
}
