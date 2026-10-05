import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../core/api_client.dart';

class EmailAccountScreen extends StatefulWidget {
  const EmailAccountScreen({
    super.key,
    required this.api,
    this.recovery = false,
  });
  final ApiClient api;
  final bool recovery;
  @override
  State<EmailAccountScreen> createState() => _EmailAccountScreenState();
}

class _EmailAccountScreenState extends State<EmailAccountScreen> {
  final _form = GlobalKey<FormState>();
  final _fields = {
    for (final name in [
      'first_name',
      'last_name',
      'email',
      'phone',
      'password',
      'password_confirmation',
      'code',
      'expert_id_code',
    ])
      name: TextEditingController(),
  };
  List<Map<String, dynamic>> _barangays = [];
  String _role = 'guardian';
  int? _barangay;
  bool _consent = false, _busy = false, _sent = false, _loading = true;
  final _visiblePasswords = <String>{};
  String? _error, _proof, _notice;
  String _currentEmail = '', _sentEmail = '';
  DateTime _resendAfter = DateTime.fromMillisecondsSinceEpoch(0);
  DateTime? _proofExpires;
  int _step = 0;
  bool _leaving = false;
  bool _created = false, _signingIn = false;
  Timer? _timer;
  final _scroll = ScrollController();
  int get _seconds =>
      _resendAfter.difference(DateTime.now()).inSeconds.clamp(0, 60);

  void _countdown() {
    _timer?.cancel();
    _timer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (!mounted || _seconds == 0) timer.cancel();
      if (mounted) setState(() {});
    });
  }

  void _goStep(int value) {
    FocusScope.of(context).unfocus();
    setState(() {
      _step = value;
      _error = null;
    });
    if (_scroll.hasClients) _scroll.jumpTo(0);
  }

  Future<void> _exit([Map<String, dynamic>? user]) async {
    setState(() => _leaving = true);
    await WidgetsBinding.instance.endOfFrame;
    if (mounted) Navigator.pop(context, user);
  }

  void _back() {
    if (_busy) return;
    if (_created) {
      _exit();
      return;
    }
    if (!widget.recovery && _step > 0) {
      _goStep(0);
      return;
    }
    if (widget.recovery && _sent) {
      setState(() {
        _sent = false;
        _notice = null;
        _error = null;
        _fields['code']!.clear();
      });
      return;
    }
    _exit();
  }

  @override
  void initState() {
    super.initState();
    if (!widget.recovery) _fields['email']!.addListener(_emailEdited);
    _load();
  }

  String get _email => _fields['email']!.text.trim().toLowerCase();
  bool get _validEmail =>
      RegExp(r'^[^\s@]+@[^\s@]+\.[^\s@]+$').hasMatch(_email);
  void _emailEdited() {
    if (_email == _currentEmail || !mounted) return;
    setState(() {
      _currentEmail = _email;
      _sentEmail = '';
      _proof = null;
      _proofExpires = null;
      _notice = null;
      _fields['code']!.clear();
    });
  }

  Future<void> _sendRegistrationCode() async {
    if (_busy || !_validEmail) return;
    if (DateTime.now().isBefore(_resendAfter)) {
      setState(() => _error = 'Wait a minute before requesting another code.');
      return;
    }
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await widget.api.cloudRequest(
        'register.php',
        body: {
          for (final key in [
            'first_name',
            'last_name',
            'password',
            'password_confirmation',
          ])
            key: _values[key],
          'email': _email,
          'privacy_consent': _consent,
          'stage': 'account',
        },
        anonymous: true,
      );
      if (!mounted) return;
      setState(() {
        _sentEmail = _email;
        _proof = null;
        _fields['code']!.clear();
        _resendAfter = DateTime.now().add(const Duration(seconds: 60));
        _notice = 'Code sent to $_sentEmail. Check Inbox or Spam.';
      });
      _countdown();
      _goStep(1);
    } catch (e) {
      if (mounted) {
        setState(
          () => _error = e is ApiException
              ? e.message
              : 'Could not send a code. Try again.',
        );
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _verifyRegistrationEmail() async {
    if (_proof != null) return;
    if (_sentEmail.isEmpty || _sentEmail != _email) {
      throw const ApiException('Send a code to your email first.');
    }
    final code = _fields['code']!.text.trim();
    if (!RegExp(r'^\d{6}$').hasMatch(code)) {
      throw const ApiException('Enter the code from your email.');
    }
    final result = await widget.api.cloudRequest(
      'verify-email.php',
      body: {'email': _sentEmail, 'code': code},
      anonymous: true,
    );
    _proof = result['verification_token'] as String;
    _proofExpires = DateTime.now().add(const Duration(minutes: 50));
    if (mounted) {
      setState(
        () => _notice = 'Email verified. You can finish creating your account.',
      );
    }
  }

  Future<void> _verifyCode() async {
    if (_busy || !_form.currentState!.validate()) return;
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await _verifyRegistrationEmail();
      if (mounted) _goStep(2);
    } catch (e) {
      if (mounted) {
        setState(
          () => _error = e is ApiException
              ? e.message
              : 'Could not verify the code. Try again.',
        );
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _load() async {
    try {
      if (!widget.recovery) {
        final data = await widget.api.configuration();
        _barangays = (data['barangays'] as List)
            .map((b) => Map<String, dynamic>.from(b as Map))
            .toList();
        if (_barangays.isEmpty) {
          throw const ApiException(
            'Registration is not ready yet. Please contact the administrator.',
          );
        }
      }
    } catch (e) {
      _error = e is ApiException ? e.message : 'Could not connect. Try again.';
    }
    if (mounted) setState(() => _loading = false);
  }

  @override
  void dispose() {
    _timer?.cancel();
    _scroll.dispose();
    for (final c in _fields.values) {
      c.dispose();
    }
    super.dispose();
  }

  Map<String, dynamic> get _values => {
    for (final entry in _fields.entries)
      if (entry.key != 'expert_id_code' ||
          (!widget.recovery && _role == 'expert'))
        entry.key: entry.key.startsWith('password')
            ? entry.value.text
            : entry.value.text.trim(),
    'role': _role,
    'barangay_id': _barangay,
    'privacy_consent': _consent,
  };
  Future<void> _submit() async {
    if (_created) {
      await _openCreatedAccount();
      return;
    }
    if (_busy || !_form.currentState!.validate()) return;
    if (!widget.recovery && _step == 0 && !_consent) {
      setState(() => _error = 'Read and accept the privacy notice.');
      return;
    }
    if (!widget.recovery && _step == 0) {
      if (_proof != null &&
          _proofExpires != null &&
          DateTime.now().isBefore(_proofExpires!)) {
        _goStep(2);
      } else if (_sentEmail == _email &&
          DateTime.now().isBefore(_resendAfter)) {
        _goStep(1);
      } else {
        await _sendRegistrationCode();
      }
      return;
    }
    if (!widget.recovery && _step == 1) {
      await _verifyCode();
      return;
    }
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      if (!widget.recovery) {
        if (_proof == null ||
            _proofExpires == null ||
            DateTime.now().isAfter(_proofExpires!)) {
          _proof = null;
          _goStep(1);
          throw const ApiException(
            'Verification expired. Request a new code to continue.',
          );
        }
        final result = await widget.api.cloudUpload(
          'complete-registration.php',
          _values,
          {},
          token: _proof,
        );
        if (!mounted) return;
        if (result['pending_approval'] == true) {
          await _message(
            'Application sent',
            'Your email is verified. An administrator will review your expert ID code before you can sign in.',
          );
          if (mounted) await _exit();
        } else {
          _timer?.cancel();
          setState(() {
            _created = true;
            _proof = null;
          });
          await _openCreatedAccount();
        }
      } else if (!_sent) {
        await widget.api.cloudRequest(
          'forgot-password.php',
          body: {'email': _fields['email']!.text},
          anonymous: true,
        );
        _resendAfter = DateTime.now().add(const Duration(seconds: 60));
        if (mounted) {
          setState(() {
            _sent = true;
            _notice = 'If this email has an account, a code will arrive shortly. Check Spam too.';
          });
        }
      } else if (widget.recovery) {
        await widget.api.cloudRequest(
          'reset-password.php',
          body: _values,
          anonymous: true,
        );
        if (!mounted) return;
        await _message('Password changed', 'Sign in with your new password.');
        if (mounted) await _exit();
      }
    } catch (e) {
      if (mounted) {
        if (!widget.recovery && e is ApiException && e.statusCode == 401) {
          _proof = null;
          _fields['code']!.clear();
          _goStep(1);
        }
        setState(
          () => _error = e is ApiException ? e.message : 'Could not complete this step. Check your connection and try again.',
        );
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _openCreatedAccount() async {
    if (_signingIn || !mounted) return;
    setState(() {
      _signingIn = true;
      _busy = true;
      _error = null;
    });
    try {
      final account = await widget.api.login(_email, _fields['password']!.text);
      if (mounted) {
        await _exit(Map<String, dynamic>.from(account['user'] as Map));
      }
    } catch (error) {
      if (mounted) {
        setState(
          () => _error = error is ApiException
              ? 'Could not open your dashboard. ${error.message}'
              : 'Could not open your dashboard. Check your connection and try again.',
        );
      }
    } finally {
      if (mounted) {
        setState(() {
          _signingIn = false;
          _busy = false;
        });
      }
    }
  }

  Future<void> _resend() async {
    if (_busy) return;
    if (DateTime.now().isBefore(_resendAfter)) {
      setState(() => _error = 'Wait a minute before requesting another code.');
      return;
    }
    setState(() => _busy = true);
    try {
      await widget.api.cloudRequest(
        'forgot-password.php',
        body: {'email': _fields['email']!.text},
        anonymous: true,
      );
      _resendAfter = DateTime.now().add(const Duration(seconds: 60));
      if (mounted) {
        setState(() {
          _proof = null;
          _error = null;
          _notice = 'Check your email for a new code.';
        });
      }
    } catch (e) {
      if (mounted) {
        setState(
          () => _error = e is ApiException
              ? e.message
              : 'Could not send a code. Try again.',
        );
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _message(String title, String body) => showDialog<void>(
    context: context,
    builder: (context) => AlertDialog(
      title: Text(title),
      content: Text(body),
      actions: [
        TextButton(
          onPressed: () => Navigator.pop(context),
          child: const Text('Back to sign in'),
        ),
      ],
    ),
  );
  Widget _field(
    String name,
    String label, {
    bool optional = false,
    bool secret = false,
    bool readOnly = false,
  }) => Padding(
    padding: const EdgeInsets.only(bottom: 16),
    child: TextFormField(
      key: ValueKey(name),
      controller: _fields[name],
      readOnly: readOnly,
      obscureText: secret && !_visiblePasswords.contains(name),
      enabled: !_busy,
      keyboardType: name == 'email'
          ? TextInputType.emailAddress
          : name == 'code'
          ? TextInputType.number
          : null,
      autofillHints: name == 'code'
          ? [AutofillHints.oneTimeCode]
          : name == 'email'
          ? [AutofillHints.email]
          : secret
          ? [AutofillHints.newPassword]
          : null,
      inputFormatters: name == 'code'
          ? [FilteringTextInputFormatter.digitsOnly]
          : null,
      textAlign: name == 'code' ? TextAlign.center : TextAlign.start,
      style: name == 'code'
          ? const TextStyle(fontSize: 26, letterSpacing: 7)
          : null,
      maxLength: secret
          ? 25
          : name == 'code'
          ? 6
          : name == 'expert_id_code'
          ? 80
          : name == 'first_name' || name == 'last_name'
          ? 80
          : name == 'phone'
          ? 30
          : null,
      autocorrect: !secret && name != 'expert_id_code',
      enableSuggestions: !secret && name != 'expert_id_code',
      decoration: InputDecoration(
        labelText: label,
        helperText: name == 'expert_id_code'
            ? 'Use your work or professional ID number.'
            : null,
        helperMaxLines: 2,
        counterText: '',
        suffixIcon: secret
            ? IconButton(
                tooltip:
                    '${_visiblePasswords.contains(name) ? 'Hide' : 'Show'} ${label.toLowerCase()}',
                onPressed: _busy
                    ? null
                    : () => setState(() {
                        if (!_visiblePasswords.remove(name)) {
                          _visiblePasswords.add(name);
                        }
                      }),
                icon: Icon(
                  _visiblePasswords.contains(name)
                      ? Icons.visibility_off_outlined
                      : Icons.visibility_outlined,
                ),
              )
            : null,
      ),
      validator: (value) {
        if (!optional && (value == null || value.trim().isEmpty)) {
          if (name == 'expert_id_code') return 'Enter your expert ID code.';
          return 'Enter ${label.toLowerCase()}.';
        }
        if (name == 'email' &&
            !RegExp(r'^[^@\s]+@[^@\s]+\.[^@\s]+$').hasMatch(value ?? '')) {
          return 'Enter a valid email address.';
        }
        if (secret && (value ?? '').runes.length < 8) {
          return 'Use 8 to 25 characters.';
        }
        if (name == 'password_confirmation' &&
            value != _fields['password']!.text) {
          return 'The passwords do not match.';
        }
        if (name == 'code' && !RegExp(r'^\d{6}$').hasMatch(value ?? '')) {
          return 'Enter the code from your email.';
        }
        if (name == 'phone' &&
            (value ?? '').trim().isNotEmpty &&
            !RegExp(r'^[0-9+() .-]{7,30}$').hasMatch(value!.trim())) {
          return 'Enter a valid phone number or leave it blank.';
        }
        return null;
      },
    ),
  );

  Widget _passwordFields() {
    final password = _field(
      'password',
      widget.recovery ? 'New password' : 'Password',
      secret: true,
    );
    final confirmation = _field(
      'password_confirmation',
      'Confirm password',
      secret: true,
    );
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        LayoutBuilder(
          builder: (context, constraints) => constraints.maxWidth >= 480
              ? Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Expanded(child: password),
                    const SizedBox(width: 16),
                    Expanded(child: confirmation),
                  ],
                )
              : Column(children: [password, confirmation]),
        ),
        ValueListenableBuilder<TextEditingValue>(
          valueListenable: _fields['password']!,
          builder: (context, value, _) {
            final length = value.text.runes.length,
                accepted = length >= 8 && length <= 25;
            return Padding(
              padding: const EdgeInsets.only(bottom: 20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Semantics(
                    label: 'Password length',
                    value: accepted ? 'Accepted' : '$length characters',
                    child: ClipRRect(
                      borderRadius: BorderRadius.circular(8),
                      child: LinearProgressIndicator(
                        value: (length / 8).clamp(0.0, 1.0),
                        minHeight: 5,
                        color: accepted
                            ? Theme.of(context).colorScheme.primary
                            : Theme.of(context).colorScheme.error,
                        backgroundColor: const Color(0xFFDCE6DF),
                      ),
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    accepted
                        ? 'Password length accepted. No special symbols required.'
                        : 'Use 8 to 25 characters. No special symbols required.',
                    style: Theme.of(context).textTheme.bodySmall,
                  ),
                ],
              ),
            );
          },
        ),
      ],
    );
  }

  Future<void> _privacyNotice() => showDialog<void>(
    context: context,
    builder: (context) => AlertDialog(
      title: const Text('Privacy notice'),
      content: const SingleChildScrollView(
        child: Text(
          'ManGROOVES saves your name, email, barangay, optional phone number, and field reports. Reports include photos, location, checklist answers, and visit notes.\n\nYour account and reports are stored using Supabase. Guardians see their own private reports. Authorized experts and administrators can review reports. Only administrators can see an expert applicant’s ID code.\n\nGPS is optional. You can place a map pin yourself. Address searches are sent to Photon. New field photos have personal image metadata removed before storage.\n\nYour email cannot be changed in Settings. Ask your program administrator about access, corrections, or account removal.',
        ),
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.pop(context),
          child: const Text('Close'),
        ),
      ],
    ),
  );
  Widget _privacyConsent() => Container(
    margin: const EdgeInsets.only(bottom: 16),
    padding: const EdgeInsets.all(12),
    decoration: BoxDecoration(
      color: const Color(0xFFF4F7F6),
      border: Border.all(color: const Color(0xFFE4CEAC)),
      borderRadius: BorderRadius.circular(14),
    ),
    child: Material(
      color: Colors.transparent,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          CheckboxListTile(
            contentPadding: EdgeInsets.zero,
            controlAffinity: ListTileControlAffinity.leading,
            value: _consent,
            onChanged: _busy
                ? null
                : (v) => setState(() => _consent = v ?? false),
            title: const Text(
              'I have read the privacy notice and agree to the use of my account details, location, and field observations.',
            ),
          ),
          TextButton(
            onPressed: _privacyNotice,
            child: const Text('Read privacy notice'),
          ),
        ],
      ),
    ),
  );

  Widget _progress() => Padding(
    padding: const EdgeInsets.only(bottom: 24),
    child: Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        for (final entry in [
          'Account',
          'Verify email',
          'Profile',
        ].asMap().entries)
          Expanded(
            child: Semantics(
              label: 'Step ${entry.key + 1}: ${entry.value}',
              selected: _step == entry.key,
              child: Container(
                margin: const EdgeInsets.symmetric(horizontal: 3),
                padding: const EdgeInsets.symmetric(
                  vertical: 10,
                  horizontal: 3,
                ),
                decoration: BoxDecoration(
                  color: _step == entry.key
                      ? const Color(0xFFEEF3E9)
                      : Colors.transparent,
                  border: Border(
                    bottom: BorderSide(
                      width: 3,
                      color: entry.key <= _step
                          ? Theme.of(context).colorScheme.primary
                          : const Color(0xFFDCE6DF),
                    ),
                  ),
                ),
                child: Text(
                  '${entry.key + 1}. ${entry.value}',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: _step == entry.key
                        ? FontWeight.bold
                        : FontWeight.normal,
                  ),
                ),
              ),
            ),
          ),
      ],
    ),
  );

  List<Widget> _profileFields() => [
    Container(
      padding: const EdgeInsets.all(12),
      margin: const EdgeInsets.only(bottom: 20),
      decoration: BoxDecoration(
        color: const Color(0xFFEDF5E9),
        borderRadius: BorderRadius.circular(10),
      ),
      child: Text('Email verified: $_sentEmail'),
    ),
    DropdownButtonFormField<String>(
      initialValue: _role,
      isExpanded: true,
      decoration: const InputDecoration(labelText: 'Join as'),
      items: const [
        DropdownMenuItem(value: 'guardian', child: Text('Coastal Guardian')),
        DropdownMenuItem(value: 'expert', child: Text('Expert')),
      ],
      onChanged: _busy ? null : (v) => setState(() => _role = v!),
    ),
    const SizedBox(height: 16),
    if (_role == 'expert') ...[
      const Text(
        'Experts need admin approval. Only administrators can view your ID code.',
      ),
      const SizedBox(height: 16),
      _field('expert_id_code', 'Expert ID code'),
    ],
    DropdownButtonFormField<int>(
      initialValue: _barangay,
      isExpanded: true,
      decoration: const InputDecoration(labelText: 'Barangay'),
      items: _barangays
          .map(
            (b) => DropdownMenuItem(
              value: b['id'] as int,
              child: Text('${b['name']}'),
            ),
          )
          .toList(),
      onChanged: _busy ? null : (v) => setState(() => _barangay = v),
      validator: (v) => v == null ? 'Choose your barangay.' : null,
    ),
    const SizedBox(height: 16),
    _field('phone', 'Phone (optional)', optional: true),
  ];

  @override
  Widget build(BuildContext context) {
    if (_created) {
      return PopScope(
        canPop: _leaving || !_busy,
        child: Scaffold(
          appBar: AppBar(
            title: const Text('Account created'),
            automaticallyImplyLeading: !_busy,
          ),
          body: SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: Center(
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 480),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Icon(
                      Icons.check_circle_outline,
                      size: 56,
                      color: Theme.of(context).colorScheme.primary,
                    ),
                    const SizedBox(height: 20),
                    Text(
                      _busy
                          ? 'Opening your dashboard...'
                          : 'Your account is ready.',
                      textAlign: TextAlign.center,
                    ),
                    const SizedBox(height: 20),
                    if (_busy) const Center(child: CircularProgressIndicator()),
                    if (_error != null) ...[
                      Semantics(
                        liveRegion: true,
                        child: Text(
                          _error!,
                          textAlign: TextAlign.center,
                          style: TextStyle(
                            color: Theme.of(context).colorScheme.error,
                          ),
                        ),
                      ),
                      const SizedBox(height: 20),
                      FilledButton(
                        onPressed: _busy ? null : _openCreatedAccount,
                        child: const Text('Continue to dashboard'),
                      ),
                    ],
                  ],
                ),
              ),
            ),
          ),
        ),
      );
    }
    final title = widget.recovery
        ? (_sent ? 'Check your email' : 'Forgot password?')
        : [
            'Create account',
            'Verify your email',
            'Complete your profile',
          ][_step];
    final label = widget.recovery
        ? (_sent ? 'Reset password' : 'Send reset code')
        : _step == 0
        ? 'Continue'
        : _step == 1
        ? 'Verify code'
        : _role == 'expert'
        ? 'Submit expert application'
        : 'Finish registration';
    return PopScope(
      canPop: _leaving || (!_busy && (widget.recovery ? !_sent : _step == 0)),
      onPopInvokedWithResult: (didPop, result) {
        if (!didPop) _back();
      },
      child: Scaffold(
        appBar: AppBar(
          title: Text(widget.recovery ? 'Reset password' : 'Create account'),
          leading: IconButton(
            tooltip: widget.recovery && _sent || !widget.recovery && _step > 0
                ? 'Back to account'
                : 'Back to sign in',
            icon: const Icon(Icons.arrow_back),
            onPressed: _busy ? null : _back,
          ),
        ),
        body: _loading
            ? const Center(child: CircularProgressIndicator())
            : SingleChildScrollView(
                controller: _scroll,
                padding: const EdgeInsets.all(20),
                child: Center(
                  child: ConstrainedBox(
                    constraints: const BoxConstraints(maxWidth: 560),
                    child: Form(
                      key: _form,
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          if (!widget.recovery) _progress(),
                          Text(
                            title,
                            style: Theme.of(context).textTheme.headlineSmall
                                ?.copyWith(fontWeight: FontWeight.w700),
                          ),
                          const SizedBox(height: 8),
                          Text(
                            widget.recovery
                                ? 'We will email you a reset code.'
                                : [
                                    'Start with your name, email, and password.',
                                    'Enter the code from your email to continue.',
                                    'Just a few more details before you begin.',
                                  ][_step],
                          ),
                          const SizedBox(height: 24),
                          if (_error != null)
                            Semantics(
                              liveRegion: true,
                              child: Container(
                                padding: const EdgeInsets.all(12),
                                margin: const EdgeInsets.only(bottom: 16),
                                decoration: BoxDecoration(
                                  color: Theme.of(context)
                                      .colorScheme
                                      .errorContainer,
                                  borderRadius: BorderRadius.circular(10),
                                ),
                                child: Text(
                                  _error!,
                                  style: TextStyle(
                                    color: Theme.of(context)
                                        .colorScheme
                                        .onErrorContainer,
                                  ),
                                ),
                              ),
                            ),
                          KeyedSubtree(
                            key: ValueKey('${widget.recovery}-$_step-$_sent'),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.stretch,
                              children: [
                                if (!widget.recovery && _step == 0) ...[
                                  _field('first_name', 'First name'),
                                  _field('last_name', 'Last name'),
                                  _field('email', 'Email'),
                                  _passwordFields(),
                                  _privacyConsent(),
                                ],
                                if (!widget.recovery && _step == 1) ...[
                                  Text(
                                    'We sent a 6-digit verification code to $_sentEmail.',
                                  ),
                                  const SizedBox(height: 20),
                                  _field('code', 'Verification code'),
                                  const Padding(
                                    padding: EdgeInsets.only(bottom: 20),
                                    child: Text(
                                      'Check Inbox or Spam. The code expires in 10 minutes.',
                                    ),
                                  ),
                                ],
                                if (!widget.recovery && _step == 2)
                                  ..._profileFields(),
                                if (widget.recovery) ...[
                                  _field('email', 'Email', readOnly: _sent),
                                  if (_notice != null)
                                    Padding(
                                      padding: const EdgeInsets.only(
                                        bottom: 16,
                                      ),
                                      child: Text(_notice!),
                                    ),
                                  if (_sent) ...[
                                    _field('code', 'Email code'),
                                    _passwordFields(),
                                  ],
                                ],
                              ],
                            ),
                          ),
                          FilledButton(
                            onPressed:
                                _busy ||
                                    (!widget.recovery && _barangays.isEmpty)
                                ? null
                                : _submit,
                            child: Text(
                              _busy
                                  ? (widget.recovery
                                        ? 'Please wait...'
                                        : [
                                            'Sending code...',
                                            'Verifying...',
                                            'Finishing...',
                                          ][_step])
                                  : label,
                            ),
                          ),
                          if (!widget.recovery && _step == 0)
                            const Padding(
                              padding: EdgeInsets.symmetric(vertical: 12),
                              child: Text(
                                'We will send a verification code to your email.',
                                textAlign: TextAlign.center,
                              ),
                            ),
                          if (!widget.recovery && _step == 1) ...[
                            const SizedBox(height: 12),
                            OutlinedButton(
                              onPressed: _busy || _seconds > 0
                                  ? null
                                  : _sendRegistrationCode,
                              child: Text(
                                _seconds > 0
                                    ? 'Resend in ${_seconds}s'
                                    : 'Resend code',
                              ),
                            ),
                            TextButton(
                              onPressed: _busy ? null : _back,
                              child: const Text('Change email'),
                            ),
                          ],
                          if (!widget.recovery && _step == 2) ...[
                            const SizedBox(height: 12),
                            Text(
                              _role == 'expert'
                                  ? 'An administrator will review your application.'
                                  : 'Your account will be ready after this step.',
                              textAlign: TextAlign.center,
                            ),
                            TextButton(
                              onPressed: _busy ? null : _back,
                              child: const Text('Back to account'),
                            ),
                          ],
                          if (widget.recovery && _sent) ...[
                            TextButton(
                              onPressed: _busy ? null : _resend,
                              child: const Text('Resend code'),
                            ),
                            TextButton(
                              onPressed: _busy ? null : _back,
                              child: const Text('Change email'),
                            ),
                          ],
                          const SizedBox(height: 8),
                          TextButton(
                            onPressed: _busy ? null : _exit,
                            child: Text(
                              !widget.recovery && _step == 0
                                  ? 'Already have an account? Sign in'
                                  : 'Back to sign in',
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              ),
      ),
    );
  }
}
