import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:flutter_test/flutter_test.dart';
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
}
