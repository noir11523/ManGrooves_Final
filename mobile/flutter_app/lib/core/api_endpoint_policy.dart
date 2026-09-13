import 'dart:io';

/// Online builds stay on their configured origin; LAN discovery is pilot-only.
class ApiEndpointPolicy {
  ApiEndpointPolicy(String configuredUrl)
    : configuredUrl = configuredUrl.trim().replaceAll(RegExp(r'/+$'), '') {
    final uri = Uri.tryParse(this.configuredUrl);
    if (uri == null ||
        !uri.hasAuthority ||
        !const ['http', 'https'].contains(uri.scheme) ||
        uri.userInfo.isNotEmpty ||
        uri.hasQuery ||
        uri.hasFragment) {
      throw ArgumentError('A complete HTTP(S) API base URL is required.');
    }
  }

  final String configuredUrl;

  bool get allowsLanDiscovery => _isLanHttp(Uri.parse(configuredUrl));

  String initialUrl(String? savedUrl) {
    if (!allowsLanDiscovery || savedUrl == null) return configuredUrl;
    final saved = Uri.tryParse(savedUrl);
    final configured = Uri.parse(configuredUrl);
    if (saved == null ||
        !_isLanHttp(saved) ||
        saved.userInfo.isNotEmpty ||
        saved.hasQuery ||
        saved.hasFragment ||
        saved.path != configured.path ||
        saved.port != configured.port) {
      return configuredUrl;
    }
    return savedUrl;
  }

  bool _isLanHttp(Uri uri) {
    final ip = InternetAddress.tryParse(uri.host);
    if (uri.scheme != 'http' || ip?.type != InternetAddressType.IPv4) {
      return false;
    }
    final octets = ip!.rawAddress;
    return octets[0] == 10 ||
        (octets[0] == 172 && octets[1] >= 16 && octets[1] <= 31) ||
        (octets[0] == 192 && octets[1] == 168);
  }
}
