import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:http/http.dart' as http;

import 'api_endpoint_policy.dart';

class ApiException implements Exception {
  const ApiException(this.message, {this.statusCode});

  final String message;
  final int? statusCode;

  @override
  String toString() => message;
}

class ApiClient {
  ApiClient({String baseUrl = defaultBaseUrl})
    : _endpointPolicy = ApiEndpointPolicy(baseUrl),
      _baseUrl = baseUrl.trim().replaceAll(RegExp(r'/+$'), '');

  static const _tokenKey = 'mangrooves_api_token';
  static const _sessionServerKey = 'mangrooves_session_server';
  static const _serverKey = 'mangrooves_discovered_api_base_url_v2';
  static const _legacyServerKey = 'mangrooves_api_base_url';
  static const _apiIdentity = 'org.mangrooves.mobile-api';
  static const _localApiPath = '/mangrooves_v2/public/mobile-api';
  static const defaultBaseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'http://192.168.100.12/mangrooves_v2/public/mobile-api',
  );

  final FlutterSecureStorage _storage = const FlutterSecureStorage();
  final ApiEndpointPolicy _endpointPolicy;

  String? _token;
  String _baseUrl;
  Map<String, dynamic>? _configurationCache;

  String get baseUrl => _baseUrl;
  bool get hasToken => _token != null && _token!.isNotEmpty;
  Map<String, String> get imageHeaders =>
      hasToken ? {'Authorization': 'Bearer $_token'} : const {};

  Future<void> initialize() async {
    _token = await _storage.read(key: _tokenKey);
    final discoveredServer = await _storage.read(key: _serverKey);
    _baseUrl = _endpointPolicy.initialUrl(discoveredServer);
    // A LAN login must never be forwarded to a new hosting deployment.
    if (hasToken && await _storage.read(key: _sessionServerKey) != _baseUrl) {
      await clearSession();
    }
    await _storage.delete(key: _legacyServerKey);
  }

  Future<Map<String, dynamic>> configuration({bool force = false}) async {
    if (!force && _configurationCache != null) {
      return _configurationCache!;
    }

    final directCandidates = <String>{
      _normalizeBaseUrl(_baseUrl),
      _endpointPolicy.configuredUrl,
    };
    final directResults = await Future.wait(
      directCandidates.map(
        (candidate) => _probeConfiguration(
          candidate,
          timeout: Duration(
            seconds: _endpointPolicy.allowsLanDiscovery ? 3 : 15,
          ),
        ),
      ),
    );
    for (final result in directResults) {
      if (result != null) return _useDiscoveredServer(result);
    }

    if (_endpointPolicy.allowsLanDiscovery) {
      final discovered = await _discoverLocalServer(directCandidates);
      if (discovered != null) return _useDiscoveredServer(discovered);
    }

    throw ApiException(
      _endpointPolicy.allowsLanDiscovery
          ? 'Unable to reach ManGROOVES. Connect to the same local network as the pilot server and try again.'
          : 'Unable to reach ManGROOVES. Check your internet connection and try again shortly.',
    );
  }

  Future<Map<String, dynamic>> login(String email, String password) async {
    await _ensureConnected();
    final result = await _postJson('login.php', {
      'email': email,
      'password': password,
      'device_name': 'Flutter ${Platform.operatingSystem}',
    }, authenticated: false);
    await _saveSession(result);
    return result;
  }

  Future<Map<String, dynamic>> register(Map<String, dynamic> form) async {
    await _ensureConnected();
    final result = await _postJson('register.php', {
      ...form,
      'device_name': 'Flutter ${Platform.operatingSystem}',
    }, authenticated: false);
    await _saveSession(result);
    return result;
  }

  Future<Map<String, dynamic>> me() async {
    await _ensureConnected();
    return _get('me.php');
  }

  Future<Map<String, dynamic>> dashboard() => _get('dashboard.php');
  Future<Map<String, dynamic>> reportForm() => _get('report-form.php');
  Future<Map<String, dynamic>> badges() => _get('badges.php');
  Future<Map<String, dynamic>> profile() => _get('profile.php');
  Future<Map<String, dynamic>> verification() => _get('verification.php');
  Future<Map<String, dynamic>> analytics() => _get('analytics.php');

  Future<Map<String, dynamic>> previousReports(int clusterId) =>
      _get('previous-reports.php', query: {'cluster_id': '$clusterId'});

  Future<Map<String, dynamic>> updateProfile(Map<String, dynamic> form) =>
      _postJson('profile.php', form);

  Future<Map<String, dynamic>> reviewReport(Map<String, dynamic> form) =>
      _postJson('review.php', form);

  Future<Map<String, dynamic>> reports({int page = 1}) =>
      _get('reports.php', query: {'page': '$page'});

  Future<Map<String, dynamic>> report(int id) =>
      _get('report.php', query: {'id': '$id'});

  Future<Map<String, dynamic>> submitReport({
    required Map<String, String> fields,
    required Map<String, List<int>> observations,
    required String photoPath,
  }) async {
    return _withConnectionRecovery(() async {
      final request = http.MultipartRequest('POST', _uri('submit-report.php'));
      request.headers.addAll(_headers());
      request.fields.addAll(fields);
      for (final entry in observations.entries) {
        for (var index = 0; index < entry.value.length; index++) {
          request.fields['observations[${entry.key}][$index]'] =
              '${entry.value[index]}';
        }
      }
      request.files.add(await http.MultipartFile.fromPath('photo', photoPath));

      final streamed = await request.send().timeout(
        const Duration(seconds: 60),
      );
      final response = await http.Response.fromStream(streamed);
      return _decode(response);
    });
  }

  Future<void> logout() async {
    try {
      if (hasToken) {
        await _postJson('logout.php', const {});
      }
    } finally {
      await clearSession();
    }
  }

  Future<void> clearSession() async {
    _token = null;
    await _storage.delete(key: _tokenKey);
    await _storage.delete(key: _sessionServerKey);
  }

  Uri resolve(String relativePath) {
    if (relativePath.startsWith('http://') ||
        relativePath.startsWith('https://')) {
      return Uri.parse(relativePath);
    }
    return _uri(relativePath);
  }

  Future<Map<String, dynamic>> _get(
    String path, {
    Map<String, String>? query,
  }) async {
    return _withConnectionRecovery(() async {
      final response = await http
          .get(_uri(path, query: query), headers: _headers())
          .timeout(const Duration(seconds: 25));
      return _decode(response);
    });
  }

  Future<Map<String, dynamic>> _postJson(
    String path,
    Map<String, dynamic> body, {
    bool authenticated = true,
  }) async {
    return _withConnectionRecovery(() async {
      final response = await http
          .post(
            _uri(path),
            headers: _headers(authenticated: authenticated, jsonBody: true),
            body: jsonEncode(body),
          )
          .timeout(const Duration(seconds: 30));
      return _decode(response);
    });
  }

  Future<void> _ensureConnected() async {
    if (_configurationCache == null) await configuration();
  }

  Future<T> _withConnectionRecovery<T>(Future<T> Function() request) async {
    try {
      return await request();
    } catch (error) {
      if (!_isConnectionFailure(error)) rethrow;
      _configurationCache = null;
      await configuration(force: true);
      return request();
    }
  }

  bool _isConnectionFailure(Object error) =>
      error is SocketException ||
      error is TimeoutException ||
      error is HandshakeException ||
      error is http.ClientException ||
      (error is ApiException &&
          (error.statusCode == 404 ||
              error.message == 'The server returned an unreadable response.'));

  Future<MapEntry<String, Map<String, dynamic>>?> _probeConfiguration(
    String candidate, {
    required Duration timeout,
  }) async {
    try {
      final uri = Uri.parse('$candidate/configuration.php');
      final response = await http
          .get(uri, headers: const {'Accept': 'application/json'})
          .timeout(timeout);
      if (response.statusCode != 200) return null;
      final decoded = jsonDecode(response.body);
      if (decoded is! Map ||
          decoded['ok'] != true ||
          decoded['api_id'] != _apiIdentity) {
        return null;
      }
      return MapEntry(candidate, Map<String, dynamic>.from(decoded));
    } catch (_) {
      return null;
    }
  }

  Future<MapEntry<String, Map<String, dynamic>>?> _discoverLocalServer(
    Set<String> alreadyTried,
  ) async {
    final localAddresses = <String>[];
    try {
      final interfaces = await NetworkInterface.list(
        type: InternetAddressType.IPv4,
        includeLoopback: false,
      );
      for (final interface in interfaces) {
        for (final address in interface.addresses) {
          if (_isPrivateIpv4(address.address)) {
            localAddresses.add(address.address);
          }
        }
      }
    } catch (_) {
      return null;
    }

    localAddresses.sort((left, right) {
      final priority = _subnetPriority(left).compareTo(_subnetPriority(right));
      return priority != 0 ? priority : left.compareTo(right);
    });

    final tried = <String>{...alreadyTried};
    for (final localAddress in localAddresses) {
      final octets = localAddress.split('.');
      final prefix = '${octets[0]}.${octets[1]}.${octets[2]}';
      for (var start = 1; start <= 254; start += 32) {
        final probes = <Future<MapEntry<String, Map<String, dynamic>>?>>[];
        for (var host = start; host < start + 32 && host <= 254; host++) {
          final address = '$prefix.$host';
          final candidate = 'http://$address$_localApiPath';
          if (!tried.add(candidate)) continue;
          probes.add(
            _probeConfiguration(
              candidate,
              timeout: const Duration(milliseconds: 900),
            ),
          );
        }
        final results = await Future.wait(probes);
        for (final result in results) {
          if (result != null) return result;
        }
      }
    }
    return null;
  }

  bool _isPrivateIpv4(String address) {
    final octets = address.split('.').map(int.tryParse).toList();
    if (octets.length != 4 || octets.any((octet) => octet == null)) {
      return false;
    }
    final first = octets[0]!;
    final second = octets[1]!;
    return first == 10 ||
        (first == 172 && second >= 16 && second <= 31) ||
        (first == 192 && second == 168);
  }

  int _subnetPriority(String address) {
    if (address.startsWith('192.168.')) return 0;
    if (address.startsWith('172.')) return 1;
    return 2;
  }

  Future<Map<String, dynamic>> _useDiscoveredServer(
    MapEntry<String, Map<String, dynamic>> result,
  ) async {
    if (_baseUrl != _normalizeBaseUrl(result.key) && hasToken) {
      await clearSession();
    }
    _baseUrl = _normalizeBaseUrl(result.key);
    _configurationCache = result.value;
    try {
      await _storage.write(key: _serverKey, value: _baseUrl);
    } catch (_) {
      // The active connection still works if secure persistence is unavailable.
    }
    return result.value;
  }

  Future<void> _saveSession(Map<String, dynamic> result) async {
    final token = result['token'];
    if (token is! String || token.isEmpty) {
      throw const ApiException('The server did not return a mobile session.');
    }
    _token = token;
    await _storage.write(key: _sessionServerKey, value: _baseUrl);
    await _storage.write(key: _tokenKey, value: token);
  }

  Map<String, String> _headers({
    bool authenticated = true,
    bool jsonBody = false,
  }) {
    final headers = <String, String>{'Accept': 'application/json'};
    if (jsonBody) headers['Content-Type'] = 'application/json';
    if (authenticated && hasToken) {
      headers['Authorization'] = 'Bearer $_token';
    }
    return headers;
  }

  Uri _uri(String path, {Map<String, String>? query}) {
    final uri = Uri.parse('$_baseUrl/${path.replaceFirst(RegExp(r'^/+'), '')}');
    return query == null ? uri : uri.replace(queryParameters: query);
  }

  Map<String, dynamic> _decode(http.Response response) {
    Map<String, dynamic> data;
    try {
      final decoded = jsonDecode(response.body);
      data = decoded is Map<String, dynamic> ? decoded : <String, dynamic>{};
    } on FormatException {
      throw ApiException(
        'The server returned an unreadable response.',
        statusCode: response.statusCode,
      );
    }
    if (response.statusCode < 200 ||
        response.statusCode >= 300 ||
        data['ok'] != true) {
      if (response.statusCode == 401) {
        clearSession();
      }
      throw ApiException(
        data['message']?.toString() ??
            'Request failed (${response.statusCode}).',
        statusCode: response.statusCode,
      );
    }
    return data;
  }

  String _normalizeBaseUrl(String value) =>
      value.trim().replaceAll(RegExp(r'/+$'), '');
}
