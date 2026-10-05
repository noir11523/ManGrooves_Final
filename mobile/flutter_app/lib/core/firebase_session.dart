import 'dart:async';
import 'dart:convert';

import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:http/http.dart' as http;

import 'api_client.dart';

/// Firebase's documented Authentication REST API. Refresh tokens remain in
/// platform secure storage; passwords are never saved on the device.
abstract interface class FirebaseSessionStorage {
  Future<String?> read(String key);
  Future<void> write(String key, String value);
  Future<void> delete(String key);
}

class SecureFirebaseSessionStorage implements FirebaseSessionStorage {
  const SecureFirebaseSessionStorage();
  static const _storage = FlutterSecureStorage();
  @override
  Future<String?> read(String key) => _storage.read(key: key);
  @override
  Future<void> write(String key, String value) =>
      _storage.write(key: key, value: value);
  @override
  Future<void> delete(String key) => _storage.delete(key: key);
}

class FirebaseSession {
  FirebaseSession({
    required this.projectId,
    required this.apiKey,
    required this.client,
    FirebaseSessionStorage? storage,
    DateTime Function()? clock,
  }) : storage = storage ?? const SecureFirebaseSessionStorage(),
       _clock = clock ?? DateTime.now;

  final String projectId, apiKey;
  final http.Client client;
  final FirebaseSessionStorage storage;
  final DateTime Function() _clock;
  String? _idToken, _refreshToken;
  DateTime _expires = DateTime.fromMillisecondsSinceEpoch(0);
  Future<String>? _refreshing;
  Future<void> _storageWork = Future.value();
  int _generation = 0;
  String get _key => 'mangrooves_firebase_session_$projectId';
  bool get hasSession => _refreshToken?.isNotEmpty == true;
  String? get cachedToken => _idToken;

  Future<void> initialize() async {
    final generation = _generation;
    final saved = await storage.read(_key);
    if (saved == null || generation != _generation) return;
    try {
      final value = jsonDecode(saved) as Map;
      if (value['project'] != projectId || value['refresh_token'] is! String) {
        throw const FormatException('Invalid session');
      }
      _refreshToken = value['refresh_token'] as String;
      // ID tokens are intentionally not persisted. A restored session must
      // obtain a fresh token and pass the API's active-account checks.
    } catch (_) {
      await clear();
    }
  }

  Future<void> signIn(String email, String password) async {
    final generation = ++_generation;
    _refreshing = null;
    final response = await client
        .post(
          Uri.https(
            'identitytoolkit.googleapis.com',
            '/v1/accounts:signInWithPassword',
            {'key': apiKey},
          ),
          headers: {'Content-Type': 'application/json'},
          body: jsonEncode({
            'email': email.trim(),
            'password': password,
            'returnSecureToken': true,
          }),
        )
        .timeout(const Duration(seconds: 30));
    final data = _decode(response);
    _checkGeneration(generation);
    if (response.statusCode != 200) throw ApiException(_authMessage(data));
    await _accept(
      data['idToken'],
      data['refreshToken'],
      data['expiresIn'],
      generation,
    );
  }

  Future<String> token({bool force = false}) async {
    if (!hasSession) {
      throw const ApiException('Sign in to continue.', statusCode: 401);
    }
    if (!force &&
        _idToken != null &&
        _expires.isAfter(_clock().add(const Duration(seconds: 60)))) {
      return _idToken!;
    }
    if (_refreshing != null) return _refreshing!;
    final request = _refresh(_generation);
    _refreshing = request;
    try {
      return await request;
    } finally {
      if (identical(_refreshing, request)) _refreshing = null;
    }
  }

  Future<String> _refresh(int generation) async {
    final response = await client
        .post(
          Uri.https('securetoken.googleapis.com', '/v1/token', {'key': apiKey}),
          body: {
            'grant_type': 'refresh_token',
            'refresh_token': _refreshToken!,
          },
        )
        .timeout(const Duration(seconds: 30));
    final data = _decode(response);
    if (generation != _generation) {
      throw const ApiException('Please sign in again.', statusCode: 401);
    }
    if (response.statusCode != 200) {
      final code = (data['error'] as Map?)?['message']?.toString() ?? '';
      if ([
        'INVALID_REFRESH_TOKEN',
        'TOKEN_EXPIRED',
        'USER_DISABLED',
        'USER_NOT_FOUND',
        'INVALID_GRANT',
      ].any(code.contains)) {
        await clear();
        throw const ApiException(
          'Your session expired. Sign in again.',
          statusCode: 401,
        );
      }
      throw ApiException(_authMessage(data));
    }
    if (data['project_id'] != null && data['project_id'].toString().isEmpty) {
      throw const ApiException('Firebase returned an invalid session.');
    }
    await _accept(
      data['id_token'],
      data['refresh_token'],
      data['expires_in'],
      generation,
    );
    return _idToken!;
  }

  void _checkGeneration(int generation) {
    if (generation != _generation) {
      throw const ApiException('Please sign in again.', statusCode: 401);
    }
  }

  // A sign-out deletion must finish after any earlier secure-storage write.
  Future<void> _persist(Future<void> Function() action) {
    final pending = _storageWork.then((_) => action());
    _storageWork = pending.catchError((Object _) {});
    return pending;
  }

  Future<void> _accept(
    dynamic token,
    dynamic refresh,
    dynamic expires,
    int generation,
  ) async {
    _checkGeneration(generation);
    if (token is! String ||
        token.isEmpty ||
        refresh is! String ||
        refresh.isEmpty) {
      throw const ApiException('Firebase did not return a valid session.');
    }
    _idToken = token;
    _refreshToken = refresh;
    _expires = _clock().add(
      Duration(seconds: int.tryParse('$expires') ?? 3600),
    );
    await _persist(
      () => storage.write(
        _key,
        jsonEncode({'project': projectId, 'refresh_token': refresh}),
      ),
    );
    _checkGeneration(generation);
  }

  Future<void> clear() async {
    _generation++;
    _idToken = null;
    _refreshToken = null;
    _refreshing = null;
    _expires = DateTime.fromMillisecondsSinceEpoch(0);
    await _persist(() => storage.delete(_key));
  }

  Map<String, dynamic> _decode(http.Response response) {
    try {
      return Map<String, dynamic>.from(jsonDecode(response.body) as Map);
    } catch (_) {
      throw const ApiException(
        'Could not reach Firebase. Check your internet connection.',
      );
    }
  }

  String _authMessage(Map<String, dynamic> data) {
    final message = (data['error'] as Map?)?['message']?.toString() ?? '';
    if ([
      'INVALID_LOGIN_CREDENTIALS',
      'INVALID_PASSWORD',
      'EMAIL_NOT_FOUND',
    ].any(message.contains)) {
      return 'Email or password is incorrect.';
    }
    if (message.contains('USER_DISABLED')) {
      return 'This account is unavailable. Contact the administrator.';
    }
    if (message.contains('TOO_MANY_ATTEMPTS')) {
      return 'Too many attempts. Try again later.';
    }
    if (message.contains('OPERATION_NOT_ALLOWED')) {
      return 'Email sign-in is not enabled in Firebase yet.';
    }
    return 'Could not sign in. Check your connection and try again.';
  }
}
