import 'dart:async';
import 'dart:convert';

import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:http/http.dart' as http;

import 'api_client.dart';

/// Supabase's documented Authentication REST API. Refresh tokens remain in
/// platform secure storage; passwords are never saved on the device.
abstract interface class SupabaseSessionStorage {
  Future<String?> read(String key);
  Future<void> write(String key, String value);
  Future<void> delete(String key);
}

class SecureSupabaseSessionStorage implements SupabaseSessionStorage {
  const SecureSupabaseSessionStorage();
  static const _storage = FlutterSecureStorage();
  @override
  Future<String?> read(String key) => _storage.read(key: key);
  @override
  Future<void> write(String key, String value) =>
      _storage.write(key: key, value: value);
  @override
  Future<void> delete(String key) => _storage.delete(key: key);
}

class SupabaseSession {
  SupabaseSession({
    required this.projectUrl,
    required this.publishableKey,
    required this.client,
    SupabaseSessionStorage? storage,
    DateTime Function()? clock,
  }) : storage = storage ?? const SecureSupabaseSessionStorage(),
       _clock = clock ?? DateTime.now;

  final String projectUrl, publishableKey;
  final http.Client client;
  final SupabaseSessionStorage storage;
  final DateTime Function() _clock;
  String? _idToken, _refreshToken;
  DateTime _expires = DateTime.fromMillisecondsSinceEpoch(0);
  Future<String>? _refreshing;
  Future<void> _storageWork = Future.value();
  int _generation = 0;
  String get _key =>
      'mangrooves_supabase_session_${Uri.parse(projectUrl).host}';
  bool get hasSession => _refreshToken?.isNotEmpty == true;
  String? get cachedToken => _idToken;

  Future<void> initialize() async {
    final generation = _generation;
    final saved = await storage.read(_key);
    if (saved == null || generation != _generation) return;
    try {
      final value = jsonDecode(saved) as Map;
      if (value['project'] != projectUrl || value['refresh_token'] is! String) {
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
          Uri.parse('$projectUrl/auth/v1/token?grant_type=password'),
          headers: {
            'Content-Type': 'application/json',
            'apikey': publishableKey,
          },
          body: jsonEncode({'email': email.trim(), 'password': password}),
        )
        .timeout(const Duration(seconds: 30));
    final data = _decode(response);
    _checkGeneration(generation);
    if (response.statusCode != 200) throw ApiException(_authMessage(data));
    await _accept(
      data['access_token'],
      data['refresh_token'],
      data['expires_in'],
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
          Uri.parse('$projectUrl/auth/v1/token?grant_type=refresh_token'),
          headers: {
            'Content-Type': 'application/json',
            'apikey': publishableKey,
          },
          body: jsonEncode({'refresh_token': _refreshToken!}),
        )
        .timeout(const Duration(seconds: 30));
    final data = _decode(response);
    if (generation != _generation) {
      throw const ApiException('Please sign in again.', statusCode: 401);
    }
    if (response.statusCode != 200) {
      final code =
          data['error_code']?.toString() ??
          data['code']?.toString() ??
          data['error']?.toString() ??
          '';
      if ([
        'refresh_token_not_found',
        'refresh_token_already_used',
        'session_not_found',
        'session_expired',
        'user_banned',
        'user_not_found',
        'invalid_grant',
      ].contains(code)) {
        await clear();
        throw const ApiException(
          'Your session expired. Sign in again.',
          statusCode: 401,
        );
      }
      throw ApiException(_authMessage(data));
    }
    await _accept(
      data['access_token'],
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
      throw const ApiException('Supabase did not return a valid session.');
    }
    _idToken = token;
    _refreshToken = refresh;
    _expires = _clock().add(
      Duration(seconds: int.tryParse('$expires') ?? 3600),
    );
    await _persist(
      () => storage.write(
        _key,
        jsonEncode({'project': projectUrl, 'refresh_token': refresh}),
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
        'Could not reach Supabase. Check your internet connection.',
      );
    }
  }

  String _authMessage(Map<String, dynamic> data) {
    final code =
        data['error_code']?.toString() ?? data['code']?.toString() ?? '';
    if (code == 'invalid_credentials') {
      return 'Email or password is incorrect.';
    }
    if (code == 'user_banned') {
      return 'This account is unavailable. Contact the administrator.';
    }
    if (code == 'over_request_rate_limit') {
      return 'Too many attempts. Try again later.';
    }
    if (code == 'email_not_confirmed') {
      return 'Confirm your email before signing in.';
    }
    return 'Could not sign in. Check your connection and try again.';
  }
}
