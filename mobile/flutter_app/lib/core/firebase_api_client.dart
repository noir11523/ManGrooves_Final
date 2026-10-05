import 'dart:convert';
import 'dart:typed_data';

import 'package:http/http.dart' as http;

import 'api_client.dart';
import 'firebase_session.dart';

/// Shared cloud API on Firebase Hosting; no LAN discovery or editable server IP.
class FirebaseApiClient extends ApiClient {
  FirebaseApiClient({
    this.projectId = const String.fromEnvironment('FIREBASE_PROJECT_ID'),
    this.apiKey = const String.fromEnvironment('FIREBASE_API_KEY'),
    http.Client? client,
    FirebaseSessionStorage? storage,
  }) : _client = client ?? http.Client(),
       super(baseUrl: 'https://firebase-setup-required.invalid/mobile-api') {
    _session = FirebaseSession(
      projectId: projectId,
      apiKey: apiKey,
      client: _client,
      storage: storage,
    );
  }

  final String projectId, apiKey;
  final http.Client _client;
  late final FirebaseSession _session;
  Map<String, dynamic>? _config;
  Map<String, dynamic>? _checklistVersions;
  @override
  String get baseUrl => 'https://$projectId.web.app/mobile-api';
  @override
  bool get supportsLocalServerSelection => false;
  @override
  bool get hasToken => _session.hasSession;
  @override
  Map<String, String> get imageHeaders => _session.cachedToken == null
      ? const {}
      : {'Authorization': 'Bearer ${_session.cachedToken}'};

  @override
  Future<void> initialize() async {
    if (!RegExp(r'^[a-z][a-z0-9-]{4,28}[a-z0-9]$').hasMatch(projectId) ||
        apiKey.isEmpty) {
      throw const ApiException(
        'Firebase setup is not finished. Build this app with your Firebase project configuration.',
      );
    }
    await _session.initialize();
  }

  @override
  Future<void> connectToLocalServer(String address) async =>
      throw const ApiException(
        'This app connects to Firebase over the internet.',
      );
  @override
  Future<Map<String, dynamic>> configuration({bool force = false}) async {
    if (!force && _config != null) return _config!;
    final data = await _request('configuration.php', authenticated: false);
    if (data['backend'] != 'firebase' ||
        data['project_id'] != projectId ||
        data['api_id'] != 'org.mangrooves.mobile-api') {
      throw const ApiException('This Firebase deployment is not ready.');
    }
    _config = data;
    return data;
  }

  @override
  Future<Map<String, dynamic>> login(String email, String password) async {
    await configuration();
    await _session.signIn(email, password);
    try {
      return await me();
    } catch (_) {
      await clearSession();
      rethrow;
    }
  }

  @override
  Future<Map<String, dynamic>> register(Map<String, dynamic> form) async {
    await configuration();
    await _request('register.php', body: form, authenticated: false);
    return login('${form['email']}', '${form['password']}');
  }

  @override
  Future<Map<String, dynamic>> me() => _request('me.php');
  @override
  Future<Map<String, dynamic>> dashboard() => _request('dashboard.php');
  @override
  Future<Map<String, dynamic>> reportForm() async {
    final data = await _request('report-form.php');
    _checklistVersions = {
      for (final c in data['criteria'] as List) '${c['id']}': c['version'],
    };
    return data;
  }

  @override
  Future<Map<String, dynamic>> badges() => _request('badges.php');
  @override
  Future<Map<String, dynamic>> profile() => _request('profile.php');
  @override
  Future<Map<String, dynamic>> updateProfile(Map<String, dynamic> form) =>
      _request('profile.php', body: form);
  @override
  Future<Map<String, dynamic>> checklist() => _request('checklist.php');
  @override
  Future<Map<String, dynamic>> verification({
    int page = 1,
    String query = '',
    String health = '',
  }) => _request(
    'verification.php',
    query: {'page': '$page', 'q': query, 'health': health},
  );
  @override
  Future<Map<String, dynamic>> analytics() => _request('analytics.php');
  @override
  Future<Map<String, dynamic>> notifications({int page = 1}) =>
      _request('notifications.php', query: {'page': '$page'});
  @override
  Future<Map<String, dynamic>> markNotificationRead(int id) =>
      _request('notifications.php', body: {'action': 'mark_read', 'id': id});
  @override
  Future<Map<String, dynamic>> markAllNotificationsRead() =>
      _request('notifications.php', body: {'action': 'mark_all'});
  @override
  Future<Map<String, dynamic>> previousReports(int clusterId) =>
      _request('previous-reports.php', query: {'cluster_id': '$clusterId'});
  @override
  Future<Map<String, dynamic>> reviewReport(Map<String, dynamic> form) =>
      _request('review.php', body: form);
  @override
  Future<Map<String, dynamic>> reports({int page = 1}) =>
      filteredReports(page: page);
  @override
  Future<Map<String, dynamic>> filteredReports({
    int page = 1,
    String status = '',
    bool needsAttention = false,
    int? clusterId,
    String query = '',
    String health = '',
  }) => _request(
    'reports.php',
    query: {
      'page': '$page',
      'q': query,
      'health': health,
      'status': status,
      if (needsAttention) 'needs_attention': '1',
      if (clusterId != null) 'cluster_id': '$clusterId',
    },
  );
  @override
  Future<Map<String, dynamic>> report(int id) =>
      _request('report.php', query: {'id': '$id'});
  @override
  Future<Map<String, dynamic>> reportMap({
    int page = 1,
    String status = '',
    String health = '',
    String query = '',
  }) => _request(
    'reports.php',
    query: {'page': '$page', 'status': status, 'health': health, 'q': query},
  );
  @override
  Future<Map<String, dynamic>> clusters({
    String query = '',
    String health = '',
  }) => _request('clusters.php', query: {'q': query, 'health': health});
  @override
  Future<Map<String, dynamic>> cluster(int id) =>
      _request('cluster.php', query: {'id': '$id'});
  @override
  Future<Map<String, dynamic>> validationHistory({
    int page = 1,
    String query = '',
    String action = '',
  }) => _request(
    'validation-history.php',
    query: {'page': '$page', 'q': query, 'action': action},
  );
  @override
  Future<Map<String, dynamic>> reportPreview(Map<String, dynamic> input) async {
    final data = await _request(
      'report-preview.php',
      body: {...input, 'checklist_versions': _checklistVersions},
    );
    _checklistVersions = Map<String, dynamic>.from(
      data['checklist_versions'] as Map,
    );
    return data;
  }

  @override
  Future<Map<String, dynamic>> updateAccountSecurity(
    Map<String, dynamic> form,
  ) async {
    if (form['action'] != 'password') {
      throw const ApiException('Choose a valid account action.');
    }
    if (form['current_password'] == form['new_password']) {
      throw const ApiException('Choose a different new password.');
    }
    final user = (await me())['user'] as Map;
    // Reauthentication issues a fresh auth_time. The API independently checks
    // this before allowing a password change and revokes all previous sessions.
    await _session.signIn('${user['email']}', '${form['current_password']}');
    final result = await _request(
      'account-security.php',
      body: {
        'action': 'password',
        'new_password': form['new_password'],
        'new_password_confirmation': form['new_password_confirmation'],
      },
    );
    await clearSession();
    return result;
  }

  @override
  Future<Map<String, dynamic>> saveChecklist(
    Map<String, dynamic> data,
    Map<String, String> images,
  ) async {
    final request = http.MultipartRequest('POST', resolve('checklist.php'));
    request.fields['payload'] = jsonEncode(data);
    for (final entry in images.entries) {
      request.files.add(
        await http.MultipartFile.fromPath(entry.key, entry.value),
      );
    }
    return _multipart(request);
  }

  @override
  Future<Map<String, dynamic>> submitReport({
    required Map<String, String> fields,
    required Map<String, List<int>> observations,
    required String photoPath,
  }) async {
    final request = http.MultipartRequest('POST', resolve('submit-report.php'));
    request.fields['payload'] = jsonEncode({
      ...fields,
      'observations': observations,
      'checklist_versions': _checklistVersions,
    });
    request.files.add(await http.MultipartFile.fromPath('photo', photoPath));
    return _multipart(request);
  }

  Future<Map<String, dynamic>> _multipart(http.MultipartRequest request) async {
    request.headers['Authorization'] = 'Bearer ${await _session.token()}';
    final response = await http.Response.fromStream(
      await _client.send(request).timeout(const Duration(seconds: 120)),
    );
    return _decode(response);
  }

  @override
  Future<Uint8List> analyticsPdf() async {
    final response = await _client
        .get(
          resolve('export-analytics.php'),
          headers: {'Authorization': 'Bearer ${await _session.token()}'},
        )
        .timeout(const Duration(seconds: 120));
    if (response.statusCode != 200) _decode(response);
    if (!(response.headers['content-type'] ?? '').startsWith(
      'application/pdf',
    )) {
      throw const ApiException('The PDF could not be generated.');
    }
    return response.bodyBytes;
  }

  @override
  Future<void> logout() => clearSession();
  @override
  Future<void> clearSession() => _session.clear();
  @override
  Uri resolve(String relativePath) =>
      Uri.parse('$baseUrl/').resolve(relativePath);

  Future<Map<String, dynamic>> _request(
    String path, {
    Map<String, dynamic>? body,
    Map<String, String>? query,
    bool authenticated = true,
  }) async {
    final uri = resolve(path).replace(queryParameters: query);
    Future<http.Response> send({bool force = false}) async {
      final headers = {
        'Accept': 'application/json',
        if (body != null) 'Content-Type': 'application/json',
        if (authenticated)
          'Authorization': 'Bearer ${await _session.token(force: force)}',
      };
      return (body == null
              ? _client.get(uri, headers: headers)
              : _client.post(uri, headers: headers, body: jsonEncode(body)))
          .timeout(const Duration(seconds: 60));
    }

    var response = await send();
    // Retry only a rejected authentication attempt, never a timed-out mutation.
    if (authenticated && response.statusCode == 401) {
      response = await send(force: true);
    }
    return _decode(response);
  }

  Map<String, dynamic> _decode(http.Response response) {
    Map<String, dynamic> data;
    try {
      data = Map<String, dynamic>.from(jsonDecode(response.body) as Map);
    } catch (_) {
      throw const ApiException(
        'Could not reach ManGROOVES. Check your internet connection.',
      );
    }
    if (response.statusCode < 200 ||
        response.statusCode >= 300 ||
        data['ok'] != true) {
      throw ApiException(
        data['message']?.toString() ?? 'Could not complete the request.',
        statusCode: response.statusCode,
      );
    }
    return data;
  }
}
