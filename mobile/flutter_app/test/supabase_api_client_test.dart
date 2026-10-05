import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:mangrooves_mobile/core/api_client.dart';
import 'package:mangrooves_mobile/core/supabase_api_client.dart';

import 'supabase_session_test.dart' show MemorySessionStorage;

void main() {
  test(
    'Supabase uses one HTTPS API and resolves guide and private photo paths',
    () async {
      final paths = <String>[];
      final api = SupabaseApiClient(
        projectUrl: 'https://project-one.supabase.co/',
        publishableKey: 'sb_publishable_public_test_key',
        storage: MemorySessionStorage(),
        client: MockClient((request) async {
          paths.add(request.url.path);
          expect(request.url.host, 'project-one.supabase.co');
          expect(request.url.path.contains('//'), false);
          if (request.url.path == '/auth/v1/token') {
            expect(request.headers['apikey'], 'sb_publishable_public_test_key');
            return http.Response(
              jsonEncode({
                'access_token': 'token',
                'refresh_token': 'refresh',
                'expires_in': 3600,
              }),
              200,
            );
          }
          if (request.url.path.endsWith('configuration.php')) {
            return http.Response(
              jsonEncode({
                'ok': true,
                'api_id': 'org.mangrooves.mobile-api',
                'backend': 'supabase',
                'project_id': 'project-one',
              }),
              200,
            );
          }
          expect(request.headers['authorization'], 'Bearer token');
          return http.Response(
            jsonEncode({
              'ok': true,
              'user': {'email': 'test@example.test'},
            }),
            200,
          );
        }),
      );
      await api.initialize();
      await api.login('test@example.test', 'password123');
      expect(paths, [
        '/functions/v1/api/configuration.php',
        '/auth/v1/token',
        '/functions/v1/api/me.php',
      ]);
      expect(
        api.resolve('photo.php?id=1').toString(),
        'https://project-one.supabase.co/functions/v1/api/photo.php?id=1',
      );
      expect(
        api.resolve('../assets/img/guides/roots.png').toString(),
        'https://project-one.supabase.co/storage/v1/object/public/mangrooves-reference/img/guides/roots.png',
      );
      expect(
        api
            .resolve(
              '../assets/../mobile-api/checklist-photo.php?path=checklist%2Ftest.jpg',
            )
            .toString(),
        'https://project-one.supabase.co/functions/v1/api/checklist-photo.php?path=checklist%2Ftest.jpg',
      );
      await api.logout();
      expect(paths.last, '/functions/v1/api/logout.php');
      expect(api.hasToken, false);
    },
  );
  test('privileged keys cannot be used as mobile configuration', () async {
    final serviceJwt =
        'x.${base64Url.encode(utf8.encode(jsonEncode({'role': 'service_role'})))}.x';
    for (final key in ['sb_secret_do_not_bundle', serviceJwt]) {
      final api = SupabaseApiClient(
        projectUrl: 'https://project-one.supabase.co',
        publishableKey: key,
        storage: MemorySessionStorage(),
      );
      await expectLater(api.initialize(), throwsA(isA<ApiException>()));
    }
  });
}
