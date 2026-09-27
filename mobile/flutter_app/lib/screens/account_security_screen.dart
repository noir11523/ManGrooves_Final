import 'package:flutter/material.dart';

import '../core/api_client.dart';

class AccountSecurityScreen extends StatefulWidget {
  const AccountSecurityScreen({
    super.key,
    required this.api,
    required this.onSignedOut,
  });
  final ApiClient api;
  final Future<void> Function() onSignedOut;
  @override
  State<AccountSecurityScreen> createState() => _AccountSecurityScreenState();
}

class _AccountSecurityScreenState extends State<AccountSecurityScreen> {
  final _form = GlobalKey<FormState>();
  final _current = TextEditingController(),
      _new = TextEditingController(),
      _confirm = TextEditingController();
  bool _busy = false;
  String? _error;
  @override
  void dispose() {
    _current.dispose();
    _new.dispose();
    _confirm.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    if (_busy || !_form.currentState!.validate()) return;
    final approved = await showDialog<bool>(
      context: context,
      builder: (dialog) => AlertDialog(
        title: const Text('Change password?'),
        content: const Text(
          'You will be signed out on all devices. Sign in with your new password.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(dialog, false),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(dialog, true),
            child: const Text('Confirm'),
          ),
        ],
      ),
    );
    if (approved != true || !mounted) return;
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final response = await widget.api.updateAccountSecurity({
        'action': 'password',
        'current_password': _current.text,
        'new_password': _new.text,
        'new_password_confirmation': _confirm.text,
      });
      await widget.api.clearSession();
      if (!mounted) return;
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text('${response['message']}')));
      setState(() => _busy = false);
      Navigator.pop(context);
      await widget.onSignedOut();
    } catch (error) {
      if (mounted) {
        setState(
          () => _error = error is ApiException
              ? error.message
              : 'Could not save. Try again.',
        );
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) => PopScope(
    canPop: !_busy,
    child: Scaffold(
      appBar: AppBar(title: const Text('Change password')),
      body: Form(
        key: _form,
        child: ListView(
          padding: const EdgeInsets.all(20),
          children: [
            if (_error != null)
              Text(_error!, style: const TextStyle(color: Colors.red)),
            TextFormField(
              controller: _current,
              obscureText: true,
              enabled: !_busy,
              autofillHints: const [AutofillHints.password],
              decoration: const InputDecoration(labelText: 'Current password'),
              validator: (value) => value == null || value.isEmpty
                  ? 'Enter your current password.'
                  : null,
            ),
            const SizedBox(height: 16),
            TextFormField(
              controller: _new,
              obscureText: true,
              enabled: !_busy,
              maxLength: 25,
              decoration: const InputDecoration(
                labelText: 'New password',
                helperText: 'Use 8 to 25 characters.',
              ),
              validator: (value) =>
                  value == null ||
                      value.runes.length < 8 ||
                      value.runes.length > 25
                  ? 'Use 8 to 25 characters.'
                  : value == _current.text
                  ? 'Choose a different password.'
                  : null,
            ),
            TextFormField(
              controller: _confirm,
              obscureText: true,
              enabled: !_busy,
              maxLength: 25,
              decoration: const InputDecoration(
                labelText: 'Confirm new password',
              ),
              validator: (value) =>
                  value != _new.text ? 'The new passwords do not match.' : null,
            ),
            const SizedBox(height: 24),
            FilledButton(
              onPressed: _busy ? null : _save,
              child: Text(_busy ? 'Saving...' : 'Update password'),
            ),
          ],
        ),
      ),
    ),
  );
}
