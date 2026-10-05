import 'dart:async';
import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:mangrooves_mobile/core/api_client.dart';
import 'package:mangrooves_mobile/core/supabase_api_client.dart';
import 'package:mangrooves_mobile/core/supabase_session.dart';

class MemorySessionStorage implements SupabaseSessionStorage {
  final values = <String, String>{};
  @override
  Future<String?> read(String key) async => values[key];
  @override
  Future<void> write(String key, String value) async {
    values[key] = value;
  }

  @override
  Future<void> delete(String key) async {
    values.remove(key);
  }
}

class SlowSessionStorage extends MemorySessionStorage {
  final writeStarted = Completer<void>();
  final finishWrite = Completer<void>();
  @override
  Future<void> write(String key, String value) async {
    writeStarted.complete();
    await finishWrite.future;
    await super.write(key, value);
  }
}

void main() {
  test('cloud configuration rejects missing settings and has no local server selector', () async {
    final api = SupabaseApiClient(projectUrl: '', publishableKey: '');
    expect(api.supportsLocalServerSelection, false);
    await expectLater(api.initialize(), throwsA(isA<ApiException>()));
    await expectLater(
      api.connectToLocalServer('192.168.1.5'),
      throwsA(isA<ApiException>()),
    );
  });
  test('Supabase sessions refresh once for concurrent requests and never persist passwords or ID tokens', () async {
    final storage = MemorySessionStorage();
    var now = DateTime.utc(2026, 10, 2), refreshes = 0;
    final client = MockClient((request) async {
      expect(request.url.scheme, 'https');
      if (request.url.queryParameters['grant_type'] == 'password') {
        return http.Response(
          jsonEncode({
            'access_token': 'id-1',
            'refresh_token': 'refresh-1',
            'expires_in': '3600',
          }),
          200,
        );
      }
      expect(request.url.host, 'project-one.supabase.co');
      expect(request.headers['apikey'], 'public-api-key');
      expect(request.url.queryParameters['grant_type'], 'refresh_token');
      refreshes++;
      await Future<void>.delayed(const Duration(milliseconds: 5));
      return http.Response(
        jsonEncode({
          'access_token': 'id-2',
          'refresh_token': 'refresh-2',
          'expires_in': '3600',
        }),
        200,
      );
    });
    final session = SupabaseSession(
      projectUrl: 'https://project-one.supabase.co',
      publishableKey: 'public-api-key',
      client: client,
      storage: storage,
      clock: () => now,
    );
    await session.signIn('guardian@example.test', 'testpassword');
    expect(await session.token(), 'id-1');
    expect(storage.values.values.single.contains('testpassword'), false);
    expect(storage.values.values.single.contains('id-1'), false);
    now = now.add(const Duration(hours: 1));
    expect(
      await Future.wait([session.token(), session.token(), session.token()]),
      ['id-2', 'id-2', 'id-2'],
    );
    expect(refreshes, 1);
    final otherProject = SupabaseSession(
      projectUrl: 'https://project-two.supabase.co',
      publishableKey: 'public-api-key',
      client: client,
      storage: storage,
    );
    await otherProject.initialize();
    expect(otherProject.hasSession, false);
  });
  test('revoked refresh token clears the saved session', () async {
    final storage = MemorySessionStorage();
    storage.values['mangrooves_supabase_session_project-one.supabase.co'] =
        jsonEncode({
          'project': 'https://project-one.supabase.co',
          'refresh_token': 'revoked',
        });
    final session = SupabaseSession(
      projectUrl: 'https://project-one.supabase.co',
      publishableKey: 'public-api-key',
      storage: storage,
      client: MockClient(
        (request) async => http.Response(
          jsonEncode({'error_code': 'refresh_token_not_found'}),
          400,
        ),
      ),
    );
    await session.initialize();
    await expectLater(session.token(), throwsA(isA<ApiException>()));
    expect(session.hasSession, false);
    expect(storage.values, isEmpty);
  });
  test('offline refresh does not destroy a recoverable session', () async {
    final storage = MemorySessionStorage();
    storage.values['mangrooves_supabase_session_project-one.supabase.co'] =
        jsonEncode({
          'project': 'https://project-one.supabase.co',
          'refresh_token': 'still-valid',
        });
    final session = SupabaseSession(
      projectUrl: 'https://project-one.supabase.co',
      publishableKey: 'public-api-key',
      storage: storage,
      client: MockClient(
        (request) async => throw http.ClientException('offline'),
      ),
    );
    await session.initialize();
    await expectLater(session.token(), throwsA(isA<http.ClientException>()));
    expect(session.hasSession, true);
    expect(storage.values, isNotEmpty);
  });
  test('a late sign-in response cannot restore a signed-out session', () async {
    final storage = MemorySessionStorage();
    final response = Completer<http.Response>();
    final session = SupabaseSession(
      projectUrl: 'https://project-one.supabase.co',
      publishableKey: 'public-api-key',
      storage: storage,
      client: MockClient((_) => response.future),
    );
    final request = session.signIn('guardian@example.test', 'password123');
    final assertion = expectLater(request, throwsA(isA<ApiException>()));
    await session.clear();
    response.complete(
      http.Response(
        jsonEncode({
          'access_token': 'late',
          'refresh_token': 'late-refresh',
          'expires_in': '3600',
        }),
        200,
      ),
    );
    await assertion;
    expect(session.hasSession, false);
    expect(storage.values, isEmpty);
  });
  test(
    'sign out deletes credentials after an in-flight storage write',
    () async {
      final storage = SlowSessionStorage();
      final session = SupabaseSession(
        projectUrl: 'https://project-one.supabase.co',
        publishableKey: 'public-api-key',
        storage: storage,
        client: MockClient(
          (_) async => http.Response(
            jsonEncode({
              'access_token': 'token',
              'refresh_token': 'refresh',
              'expires_in': '3600',
            }),
            200,
          ),
        ),
      );
      final request = session.signIn('guardian@example.test', 'password123');
      final assertion = expectLater(request, throwsA(isA<ApiException>()));
      await storage.writeStarted.future;
      final signOut = session.clear();
      storage.finishWrite.complete();
      await signOut;
      await assertion;
      expect(session.hasSession, false);
      expect(storage.values, isEmpty);
    },
  );
  test('a late refresh cannot restore a session after sign out', () async {
    final storage = MemorySessionStorage();
    storage.values['mangrooves_supabase_session_project-one.supabase.co'] =
        jsonEncode({
          'project': 'https://project-one.supabase.co',
          'refresh_token': 'valid',
        });
    final response = Completer<http.Response>();
    final session = SupabaseSession(
      projectUrl: 'https://project-one.supabase.co',
      publishableKey: 'public-api-key',
      storage: storage,
      client: MockClient((_) => response.future),
    );
    await session.initialize();
    final request = session.token();
    final assertion = expectLater(request, throwsA(isA<ApiException>()));
    await session.clear();
    response.complete(
      http.Response(
        jsonEncode({
          'access_token': 'late',
          'refresh_token': 'late-refresh',
          'expires_in': '3600',
        }),
        200,
      ),
    );
    await assertion;
    expect(session.hasSession, false);
  });
}
