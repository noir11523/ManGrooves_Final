import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:mangrooves_mobile/core/api_client.dart';
import 'package:mangrooves_mobile/core/api_endpoint_policy.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  const online = 'https://mangrooves.example.org/mobile-api';
  const local = 'http://192.168.100.12/mangrooves_v2/public/mobile-api';
  const moved = 'http://192.168.100.15/mangrooves_v2/public/mobile-api';

  test('online deployment ignores saved LAN and previous public servers', () {
    final policy = ApiEndpointPolicy(online);
    expect(policy.allowsLanDiscovery, isFalse);
    expect(policy.initialUrl(moved), online);
    expect(policy.initialUrl('https://old.example.org/mobile-api'), online);
    expect(
      policy.initialUrl('http://mangrooves.example.org/mobile-api'),
      online,
    );
  });

  test('LAN pilot remembers DHCP changes but not unrelated endpoints', () {
    final policy = ApiEndpointPolicy(local);
    expect(policy.allowsLanDiscovery, isTrue);
    expect(policy.initialUrl(moved), moved);
    expect(policy.initialUrl(online), local);
    expect(policy.initialUrl('http://192.168.100.15/another-app'), local);
    expect(policy.initialUrl('$moved?redirect=elsewhere'), local);
    expect(
      ApiEndpointPolicy('http://example.org/mobile-api').allowsLanDiscovery,
      isFalse,
    );
  });

  test('migration to hosting discards the saved local session', () async {
    FlutterSecureStorage.setMockInitialValues({
      'mangrooves_api_token': 'local-test-token',
      'mangrooves_discovered_api_base_url_v2': moved,
      'mangrooves_session_server': moved,
    });
    final api = ApiClient(baseUrl: online);
    await api.initialize();
    expect(api.baseUrl, online);
    expect(api.hasToken, isFalse);
    expect(
      await const FlutterSecureStorage().read(key: 'mangrooves_api_token'),
      isNull,
    );
  });

  test('same hosted server restores its own session', () async {
    FlutterSecureStorage.setMockInitialValues({
      'mangrooves_api_token': 'hosted-test-token',
      'mangrooves_discovered_api_base_url_v2': moved,
      'mangrooves_session_server': online,
    });
    final api = ApiClient(baseUrl: online);
    await api.initialize();
    expect(api.baseUrl, online);
    expect(api.hasToken, isTrue);
  });

  test('manual LAN address and discovery preserve the API path and port', () {
    final policy = ApiEndpointPolicy(
      'http://192.168.1.2:8085/mobile-api',
    );
    expect(policy.localServerUrl('192.168.213.53'),
        'http://192.168.213.53:8085/mobile-api');
    expect(policy.localServerUrl('192.168.213.53:8080'),
        'http://192.168.213.53:8080/mobile-api');
    expect(policy.localServerUrl('192.168.213.53:80'),
        'http://192.168.213.53/mobile-api');
    expect(policy.initialUrl('http://192.168.213.53:8080/mobile-api'),
        'http://192.168.213.53:8080/mobile-api');
    expect(policy.discoveryUrl('192.168.213.54',
        'http://192.168.213.53:8080/mobile-api'),
        'http://192.168.213.54:8080/mobile-api');
    for (final invalid in ['example.com', '127.0.0.1', '8.8.8.8',
      'http://user:pass@192.168.1.2', '192.168.1.2/wrong-path',
      '192.168.1.2?redirect=elsewhere']) {
      expect(() => policy.localServerUrl(invalid), throwsFormatException);
    }
    expect(() => ApiEndpointPolicy(online).localServerUrl('192.168.1.2'),
        throwsFormatException);
  });

  test('verified manual server is remembered and clears the old session', () async {
    FlutterSecureStorage.setMockInitialValues({
      'mangrooves_api_token': 'old-server-token',
      'mangrooves_session_server': local,
    });
    final api = ApiClient(baseUrl: local, probeClientFactory: () => MockClient((request) async {
      expect(request.url.toString(),
          'http://192.168.213.53:8080/mangrooves_v2/public/mobile-api/configuration.php');
      expect(request.headers.containsKey('Authorization'), isFalse);
      return http.Response('{"ok":true,"api_id":"org.mangrooves.mobile-api","barangays":[]}', 200);
    }));
    await api.initialize();
    expect(api.hasToken, isTrue);
    await api.connectToLocalServer('192.168.213.53:8080');
    expect(api.hasToken, isFalse);
    final restarted = ApiClient(baseUrl: local);
    await restarted.initialize();
    expect(restarted.baseUrl, api.baseUrl);
    expect((await api.configuration())['api_id'], 'org.mangrooves.mobile-api');
  });

  test('failed or unrelated server does not replace a working address or token', () async {
    for (final response in [
      http.Response('{"ok":true,"api_id":"another-app"}', 200),
      http.Response('Not found', 404),
      http.Response('Service unavailable', 503),
    ]) {
      FlutterSecureStorage.setMockInitialValues({
        'mangrooves_api_token': 'old-server-token',
        'mangrooves_session_server': local,
      });
      final api = ApiClient(baseUrl: local,
          probeClientFactory: () => MockClient((_) async => response));
      await api.initialize();
      await expectLater(api.connectToLocalServer('192.168.213.53'),
          throwsA(isA<ApiException>()));
      expect(api.baseUrl, local);
      expect(api.hasToken, isTrue);
    }
  });
}
