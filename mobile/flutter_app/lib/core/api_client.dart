import 'dart:convert';
import 'dart:io';

import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:http/http.dart' as http;

class ApiException implements Exception {
  const ApiException(this.message, {this.statusCode});

  final String message;
  final int? statusCode;

  @override
  String toString() => message;
}

class ApiClient {
  static const _tokenKey = 'mangrooves_api_token';
  static const _serverKey = 'mangrooves_api_base_url';
  static const defaultBaseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'http://192.168.100.15/mangrooves_v2/public/mobile-api',
  );

  final FlutterSecureStorage _storage = const FlutterSecureStorage();

  String? _token;
  String _baseUrl = defaultBaseUrl;

  String get baseUrl => _baseUrl;
  bool get hasToken => _token != null && _token!.isNotEmpty;
  Map<String, String> get imageHeaders =>
      hasToken ? {'Authorization': 'Bearer $_token'} : const {};

  Future<void> initialize() async {
    _token = await _storage.read(key: _tokenKey);
    _baseUrl = _normalizeBaseUrl(
      await _storage.read(key: _serverKey) ?? defaultBaseUrl,
    );
  }

  Future<void> setBaseUrl(String value) async {
    final normalized = _normalizeBaseUrl(value);
    final uri = Uri.tryParse(normalized);
    if (uri == null || !uri.hasScheme || !uri.hasAuthority) {
      throw const ApiException('Enter a complete server URL.');
    }
    if (uri.scheme != 'http' && uri.scheme != 'https') {
      throw const ApiException('The server URL must use http or https.');
    }
    _baseUrl = normalized;
    await _storage.write(key: _serverKey, value: normalized);
  }

  Future<Map<String, dynamic>> configuration() => _get('configuration.php');

  Future<Map<String, dynamic>> login(String email, String password) async {
    final result = await _postJson('login.php', {
      'email': email,
      'password': password,
      'device_name': 'Flutter ${Platform.operatingSystem}',
    }, authenticated: false);
    await _saveSession(result);
    return result;
  }

  Future<Map<String, dynamic>> register(Map<String, dynamic> form) async {
    final result = await _postJson('register.php', {
      ...form,
      'device_name': 'Flutter ${Platform.operatingSystem}',
    }, authenticated: false);
    await _saveSession(result);
    return result;
  }

  Future<Map<String, dynamic>> me() => _get('me.php');
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

    final streamed = await request.send().timeout(const Duration(seconds: 60));
    final response = await http.Response.fromStream(streamed);
    return _decode(response);
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
    final response = await http
        .get(_uri(path, query: query), headers: _headers())
        .timeout(const Duration(seconds: 25));
    return _decode(response);
  }

  Future<Map<String, dynamic>> _postJson(
    String path,
    Map<String, dynamic> body, {
    bool authenticated = true,
  }) async {
    final response = await http
        .post(
          _uri(path),
          headers: _headers(authenticated: authenticated, jsonBody: true),
          body: jsonEncode(body),
        )
        .timeout(const Duration(seconds: 30));
    return _decode(response);
  }

  Future<void> _saveSession(Map<String, dynamic> result) async {
    final token = result['token'];
    if (token is! String || token.isEmpty) {
      throw const ApiException('The server did not return a mobile session.');
    }
    _token = token;
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
