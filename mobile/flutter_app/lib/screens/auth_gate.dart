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
  String? _connectionError;

  @override
  void initState() {
    super.initState();
    _restoreSession();
  }

  Future<void> _restoreSession() async {
    setState(() {
      _loading = true;
      _connectionError = null;
    });
    if (!widget.api.hasToken) {
      setState(() => _loading = false);
      return;
    }
    try {
      final response = await widget.api.me();
      _user = Map<String, dynamic>.from(response['user'] as Map);
    } catch (error) {
      if (error is ApiException && [401, 403].contains(error.statusCode)) {
        await widget.api.clearSession();
      } else {
        _connectionError =
            'Could not connect. Check your internet connection and try again.';
      }
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
    if (_connectionError != null) {
      return Scaffold(
        appBar: AppBar(title: const Text('ManGROOVES')),
        body: Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(_connectionError!, textAlign: TextAlign.center),
                const SizedBox(height: 16),
                FilledButton(
                  onPressed: _restoreSession,
                  child: const Text('Try again'),
                ),
                TextButton(
                  onPressed: () async {
                    await widget.api.clearSession();
                    if (mounted) {
                      setState(() {
                        _connectionError = null;
                        _user = null;
                      });
                    }
                  },
                  child: const Text('Sign in with another account'),
                ),
              ],
            ),
          ),
        ),
      );
    }
    if (_user == null) {
      return LoginScreen(api: widget.api, onAuthenticated: _authenticated);
    }
    return HomeShell(api: widget.api, user: _user!, onSignedOut: _signedOut);
  }
}
