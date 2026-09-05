import 'package:flutter/material.dart';

import '../core/api_client.dart';

class RegisterScreen extends StatefulWidget {
  const RegisterScreen({
    super.key,
    required this.api,
    required this.onAuthenticated,
  });

  final ApiClient api;
  final ValueChanged<Map<String, dynamic>> onAuthenticated;

  @override
  State<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends State<RegisterScreen> {
  final _formKey = GlobalKey<FormState>();
  final _name = TextEditingController();
  final _email = TextEditingController();
  final _phone = TextEditingController();
  final _password = TextEditingController();
  final _confirmation = TextEditingController();
  List<Map<String, dynamic>> _barangays = [];
  int? _barangayId;
  bool _consent = false;
  bool _loading = true;
  bool _busy = false;
  bool _hidePassword = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _loadConfiguration();
  }

  Future<void> _loadConfiguration() async {
    try {
      final response = await widget.api.configuration();
      _barangays = (response['barangays'] as List? ?? const [])
          .map((item) => Map<String, dynamic>.from(item as Map))
          .toList();
    } catch (error) {
      _error = error is ApiException
          ? error.message
          : 'Unable to connect. Check your internet or Wi-Fi connection.';
    }
    if (mounted) setState(() => _loading = false);
  }

  @override
  void dispose() {
    _name.dispose();
    _email.dispose();
    _phone.dispose();
    _password.dispose();
    _confirmation.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    if (!_consent) {
      setState(
        () => _error = 'Privacy consent is required to create an account.',
      );
      return;
    }
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final result = await widget.api.register({
        'full_name': _name.text,
        'email': _email.text,
        'phone': _phone.text,
        'barangay_id': _barangayId,
        'password': _password.text,
        'password_confirmation': _confirmation.text,
        'privacy_consent': true,
      });
      if (!mounted) return;
      widget.onAuthenticated(Map<String, dynamic>.from(result['user'] as Map));
    } catch (error) {
      if (mounted) {
        setState(
          () => _error = error is ApiException
              ? error.message
              : 'Registration failed.',
        );
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Create guardian account')),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : SingleChildScrollView(
              padding: const EdgeInsets.fromLTRB(20, 8, 20, 32),
              child: Center(
                child: ConstrainedBox(
                  constraints: const BoxConstraints(maxWidth: 620),
                  child: Form(
                    key: _formKey,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        Text(
                          'Join the monitoring network',
                          style: Theme.of(context).textTheme.headlineSmall
                              ?.copyWith(fontWeight: FontWeight.w800),
                        ),
                        const SizedBox(height: 18),
                        if (_error != null) ...[
                          Text(
                            _error!,
                            style: const TextStyle(color: Colors.red),
                          ),
                          const SizedBox(height: 12),
                        ],
                        _field(_name, 'Full name', Icons.person_outline),
                        _field(
                          _email,
                          'Email address',
                          Icons.mail_outline,
                          type: TextInputType.emailAddress,
                        ),
                        _field(
                          _phone,
                          'Phone (optional)',
                          Icons.phone_outlined,
                          type: TextInputType.phone,
                          optional: true,
                        ),
                        DropdownButtonFormField<int>(
                          initialValue: _barangayId,
                          decoration: const InputDecoration(
                            labelText: 'Barangay',
                            prefixIcon: Icon(Icons.location_city_outlined),
                          ),
                          items: _barangays
                              .map(
                                (barangay) => DropdownMenuItem<int>(
                                  value: barangay['id'] as int,
                                  child: Text(
                                    '${barangay['name']}, ${barangay['city_municipality']}',
                                  ),
                                ),
                              )
                              .toList(),
                          onChanged: (value) =>
                              setState(() => _barangayId = value),
                          validator: (value) =>
                              value == null ? 'Select your barangay.' : null,
                        ),
                        const SizedBox(height: 14),
                        TextFormField(
                          controller: _password,
                          obscureText: _hidePassword,
                          decoration: InputDecoration(
                            labelText: 'Password',
                            prefixIcon: const Icon(Icons.lock_outline),
                            suffixIcon: IconButton(
                              onPressed: () => setState(
                                () => _hidePassword = !_hidePassword,
                              ),
                              icon: Icon(
                                _hidePassword
                                    ? Icons.visibility
                                    : Icons.visibility_off,
                              ),
                            ),
                          ),
                          validator: (value) => (value?.length ?? 0) < 8
                              ? 'Use at least 8 characters.'
                              : null,
                        ),
                        const SizedBox(height: 14),
                        TextFormField(
                          controller: _confirmation,
                          obscureText: _hidePassword,
                          decoration: const InputDecoration(
                            labelText: 'Confirm password',
                            prefixIcon: Icon(Icons.lock_reset_outlined),
                          ),
                          validator: (value) => value != _password.text
                              ? 'Passwords do not match.'
                              : null,
                        ),
                        const SizedBox(height: 8),
                        CheckboxListTile(
                          value: _consent,
                          contentPadding: EdgeInsets.zero,
                          title: const Text(
                            'I consent to the collection and use of my account, location, and field observation data as described in the privacy notice.',
                          ),
                          controlAffinity: ListTileControlAffinity.leading,
                          onChanged: (value) =>
                              setState(() => _consent = value ?? false),
                        ),
                        const SizedBox(height: 12),
                        FilledButton(
                          onPressed: _busy ? null : _submit,
                          child: _busy
                              ? const CircularProgressIndicator(strokeWidth: 2)
                              : const Text('Create guardian account'),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ),
    );
  }

  Widget _field(
    TextEditingController controller,
    String label,
    IconData icon, {
    TextInputType? type,
    bool optional = false,
  }) => Padding(
    padding: const EdgeInsets.only(bottom: 14),
    child: TextFormField(
      controller: controller,
      keyboardType: type,
      decoration: InputDecoration(labelText: label, prefixIcon: Icon(icon)),
      validator: optional
          ? null
          : (value) => value == null || value.trim().isEmpty
                ? '$label is required.'
                : null,
    ),
  );
}
