import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mangrooves_mobile/core/api_client.dart';
import 'package:mangrooves_mobile/screens/notifications_screen.dart';
import 'package:mangrooves_mobile/screens/cloud_admin_screen.dart';
import 'package:mangrooves_mobile/screens/badges_screen.dart';

class _Api extends ApiClient {
  int reads = 0, marks = 0, all = 0;
  String? applicationUid;
  Map<String, dynamic> notice = {
    'id': 1,
    'title': 'New expert application',
    'message': 'Applicant is waiting for approval.',
    'created_at': '2026-11-07 15:00:00',
    'read_at': null,
    'target': {'page': 'expert-applications', 'uid': 'applicant-uid'},
  };
  @override
  Future<Map<String, dynamic>> notifications({int page = 1}) async {
    reads++;
    return {
      'notifications': [notice],
      'page': 1,
      'pages': 1,
      'unread': notice['read_at'] == null ? 1 : 0,
    };
  }

  @override
  Future<Map<String, dynamic>> markNotificationRead(int id) async {
    marks++;
    notice = {...notice, 'read_at': '2026-11-07 15:01:00'};
    return {'notification': notice};
  }

  @override
  Future<Map<String, dynamic>> markAllNotificationsRead() async {
    all++;
    notice = {...notice, 'read_at': '2026-11-07 15:01:00'};
    return {};
  }

  @override
  Future<Map<String, dynamic>> cloudRequest(
    String path, {
    Map<String, String>? query,
    Map<String, dynamic>? body,
    bool anonymous = false,
  }) async {
    applicationUid = query?['uid'];
    return {'items': []};
  }

  @override
  Future<Map<String, dynamic>> badges() async => {'badges': [], 'metrics': {}};
}

void main() {
  testWidgets('admin alert opens only its application and updates read state', (
    tester,
  ) async {
    final api = _Api();
    var changed = 0;
    await tester.pumpWidget(
      MaterialApp(
        home: NotificationsScreen(
          api: api,
          user: const {'role': 'system_admin'},
          onChanged: () async {
            changed++;
          },
        ),
      ),
    );
    await tester.pumpAndSettle();
    await tester.tap(find.text('New expert application'));
    await tester.pumpAndSettle();
    expect(find.byType(CloudAdminScreen), findsOneWidget);
    expect(api.applicationUid, 'applicant-uid');
    expect(api.marks, 1);
    await tester.pageBack();
    await tester.pumpAndSettle();
    expect(changed, 1);
    expect(find.text('Mark all read'), findsNothing);
    await tester.pumpWidget(const SizedBox.shrink());
  });
  for (final role in ['guardian', 'expert']) {
    testWidgets('$role badge notification opens recognition', (tester) async {
      final api = _Api()
        ..notice = {
          'id': 2,
          'title': 'Badge earned',
          'message': 'First verified report',
          'created_at': '2026-11-07 15:00:00',
          'read_at': null,
          'target': {'page': 'badges'},
        };
      await tester.pumpWidget(
        MaterialApp(
          home: NotificationsScreen(api: api, user: {'role': role}),
        ),
      );
      await tester.pumpAndSettle();
      await tester.tap(find.text('Badge earned'));
      await tester.pumpAndSettle();
      expect(find.byType(BadgesScreen), findsOneWidget);
      expect(api.marks, 1);
      await tester.pumpWidget(const SizedBox.shrink());
    });
  }
  testWidgets(
    'notifications refresh while open and resume, then stop on disposal',
    (tester) async {
      final api = _Api();
      await tester.pumpWidget(
        MaterialApp(
          home: NotificationsScreen(api: api, user: const {'role': 'guardian'}),
        ),
      );
      await tester.pumpAndSettle();
      expect(api.reads, 1);
      await tester.pump(const Duration(seconds: 21));
      await tester.pumpAndSettle();
      expect(api.reads, 2);
      tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.paused);
      await tester.pump(const Duration(seconds: 21));
      expect(api.reads, 2);
      tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.resumed);
      await tester.pumpAndSettle();
      expect(api.reads, 3);
      await tester.tap(find.text('Mark all read'));
      await tester.pumpAndSettle();
      expect(api.all, 1);
      expect(find.text('Mark all read'), findsNothing);
      await tester.pumpWidget(const SizedBox.shrink());
      final reads = api.reads;
      await tester.pump(const Duration(seconds: 21));
      expect(api.reads, reads);
    },
  );
}
