import 'package:flutter/material.dart';

import '../core/api_client.dart';
import 'home_shell.dart';
import 'login_screen.dart';

class AuthGate extends StatefulWidget {
  const AuthGate({super.key, required this.api});

  final ApiClient api;

  @override
  State<AuthGate> createState() => _AuthGateState();
}

class _AuthGateState extends State<AuthGate> {
  bool _loading = true;
  Map<String, dynamic>? _user;

  @override
  void initState() {
    super.initState();
    _restoreSession();
  }

  Future<void> _restoreSession() async {
    if (!widget.api.hasToken) {
      setState(() => _loading = false);
      return;
    }
    try {
      final response = await widget.api.me();
      _user = Map<String, dynamic>.from(response['user'] as Map);
    } catch (_) {
      await widget.api.clearSession();
    }
    if (mounted) setState(() => _loading = false);
  }

  void _authenticated(Map<String, dynamic> user) {
    setState(() {
      _user = user;
      _loading = false;
    });
  }

  Future<void> _signedOut() async {
    setState(() => _loading = true);
    await widget.api.logout();
    if (mounted) {
      setState(() {
        _user = null;
        _loading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }
    if (_user == null) {
      return LoginScreen(api: widget.api, onAuthenticated: _authenticated);
    }
    return HomeShell(api: widget.api, user: _user!, onSignedOut: _signedOut);
  }
}
