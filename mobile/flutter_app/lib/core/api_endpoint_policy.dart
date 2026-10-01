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
        saved.path != configured.path) {
      return configuredUrl;
    }
    return savedUrl;
  }

  /// Accept a laptop's LAN address while keeping this app's API path.
  String localServerUrl(String address) {
    if (!allowsLanDiscovery) {
      throw const FormatException('This app uses its configured online server.');
    }
    final input = address.trim();
    final uri = Uri.tryParse(input.contains('://') ? input : 'http://$input');
    final configured = Uri.parse(configuredUrl);
    // Uri normalizes an explicit :80 away; retain it when changing from
    // a build that used another Apache port.
    final authority = input.replaceFirst(RegExp(r'^https?://'), '').split('/').first;
    final portMatch = RegExp(r':([0-9]+)$').firstMatch(authority);
    final port = portMatch == null
        ? configured.port
        : int.tryParse(portMatch.group(1)!);
    if (uri == null ||
        !_isLanHttp(uri) ||
        uri.userInfo.isNotEmpty ||
        uri.hasQuery ||
        uri.hasFragment ||
        (uri.path.isNotEmpty && uri.path != '/' &&
            uri.path.replaceAll(RegExp(r'/+$'), '') != configured.path) ||
        port == null || port < 1 || port > 65535) {
      throw const FormatException(
        'Enter the laptop\'s local IPv4 address, for example 192.168.1.20. '
        'Include :8080 only if Apache uses that port.',
      );
    }
    return configured.replace(
      host: uri.host,
      port: port,
    ).toString();
  }

  String discoveryUrl(String address, String currentUrl) =>
      Uri.parse(initialUrl(currentUrl)).replace(host: address).toString();

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
