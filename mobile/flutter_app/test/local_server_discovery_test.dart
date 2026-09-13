import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:mangrooves_mobile/core/api_client.dart';

void main() {
  const runLocalDiscovery = bool.fromEnvironment('RUN_LOCAL_DISCOVERY_TEST');

  test(
    'finds the ManGROOVES API when the compiled LAN address is unavailable',
    () async {
      HttpOverrides.global = null;
      final api = ApiClient();
      final configuration = await api.configuration(force: true);

      expect(configuration['api_id'], 'org.mangrooves.mobile-api');
      expect(configuration['barangays'], isNotEmpty);
      expect(api.baseUrl, isNot(ApiClient.defaultBaseUrl));
    },
    skip: !runLocalDiscovery,
  );
}
