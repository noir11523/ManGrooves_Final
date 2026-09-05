import 'package:flutter/material.dart';

import '../core/api_client.dart';

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({
    super.key,
    required this.api,
    required this.initialUser,
    required this.onSignedOut,
    required this.onUserChanged,
  });

  final ApiClient api;
  final Map<String, dynamic> initialUser;
  final Future<void> Function() onSignedOut;
  final ValueChanged<Map<String, dynamic>> onUserChanged;

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  final _formKey = GlobalKey<FormState>();
  final _name = TextEditingController();
  final _email = TextEditingController();
  final _phone = TextEditingController();
  Map<String, dynamic>? _user;
  List<Map<String, dynamic>> _barangays = [];
  int? _barangayId;
  bool _loading = true;
  bool _saving = false;
  bool _signingOut = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _applyUser(widget.initialUser);
    _load();
  }

  void _applyUser(Map<String, dynamic> user) {
    _user = Map<String, dynamic>.from(user);
    _name.text = user['full_name']?.toString() ?? '';
    _email.text = user['email']?.toString() ?? '';
    _phone.text = user['phone']?.toString() ?? '';
    _barangayId = user['barangay_id'] as int?;
  }

  Future<void> _load() async {
    try {
      final response = await widget.api.profile();
      _barangays = (response['barangays'] as List? ?? const [])
          .map((item) => Map<String, dynamic>.from(item as Map))
          .toList();
      _applyUser(Map<String, dynamic>.from(response['user'] as Map));
      _error = null;
    } catch (error) {
      _error = error is ApiException
          ? error.message
          : 'Unable to load profile.';
    }
    if (mounted) setState(() => _loading = false);
  }

  Future<void> _save() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() {
      _saving = true;
      _error = null;
    });
    try {
      final response = await widget.api.updateProfile({
        'full_name': _name.text,
        'email': _email.text,
        'phone': _phone.text,
        'barangay_id': _barangayId,
      });
      final updated = Map<String, dynamic>.from(response['user'] as Map);
      _applyUser(updated);
      widget.onUserChanged(updated);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Profile updated successfully.')),
        );
      }
    } catch (error) {
      _error = error is ApiException ? error.message : 'Profile update failed.';
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  void dispose() {
    _name.dispose();
    _email.dispose();
    _phone.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) return const Center(child: CircularProgressIndicator());
    final user = _user ?? widget.initialUser;
    return ListView(
      padding: const EdgeInsets.fromLTRB(20, 8, 20, 32),
      children: [
        CircleAvatar(
          radius: 38,
          backgroundColor: Theme.of(context).colorScheme.primaryContainer,
          child: Text(
            (_name.text.trim().isEmpty ? 'M' : _name.text.trim()[0])
                .toUpperCase(),
            style: Theme.of(context).textTheme.headlineLarge,
          ),
        ),
        const SizedBox(height: 12),
        Text(
          user['role']?.toString() ?? '',
          textAlign: TextAlign.center,
          style: Theme.of(context).textTheme.labelLarge,
        ),
        const SizedBox(height: 20),
        if (_error != null) ...[
          Text(_error!, style: const TextStyle(color: Colors.red)),
          const SizedBox(height: 12),
        ],
        Form(
          key: _formKey,
          child: Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                children: [
                  TextFormField(
                    controller: _name,
                    decoration: const InputDecoration(labelText: 'Full name'),
                    validator: (value) {
                      final length = value?.trim().length ?? 0;
                      return length < 2 || length > 120
                          ? 'Use 2 to 120 characters.'
                          : null;
                    },
                  ),
                  const SizedBox(height: 12),
                  TextFormField(
                    controller: _email,
                    keyboardType: TextInputType.emailAddress,
                    decoration: const InputDecoration(
                      labelText: 'Email address',
                    ),
                    validator: (value) =>
                        value == null ||
                            !RegExp(r'^[^@\s]+@[^@\s]+\.[^@\s]+$')
                                .hasMatch(value.trim())
                        ? 'Enter a valid email address.'
                        : null,
                  ),
                  const SizedBox(height: 12),
                  TextFormField(
                    controller: _phone,
                    keyboardType: TextInputType.phone,
                    decoration: const InputDecoration(
                      labelText: 'Phone (optional)',
                    ),
                  ),
                  const SizedBox(height: 12),
                  DropdownButtonFormField<int>(
                    initialValue: _barangayId,
                    isExpanded: true,
                    decoration: const InputDecoration(labelText: 'Barangay'),
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
                    onChanged: (value) => setState(() => _barangayId = value),
                    validator: user['role'] == 'guardian'
                        ? (value) =>
                              value == null ? 'Select your barangay.' : null
                        : null,
                  ),
                  const SizedBox(height: 16),
                  FilledButton.icon(
                    onPressed: _saving ? null : _save,
                    icon: _saving
                        ? const SizedBox.square(
                            dimension: 18,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          )
                        : const Icon(Icons.save_outlined),
                    label: Text(_saving ? 'Saving…' : 'Save profile'),
                  ),
                ],
              ),
            ),
          ),
        ),
        const SizedBox(height: 20),
        OutlinedButton.icon(
          onPressed: _signingOut
              ? null
              : () async {
                  setState(() => _signingOut = true);
                  await widget.onSignedOut();
                },
          icon: const Icon(Icons.logout),
          label: Text(_signingOut ? 'Signing out…' : 'Sign out'),
        ),
      ],
    );
  }
}
