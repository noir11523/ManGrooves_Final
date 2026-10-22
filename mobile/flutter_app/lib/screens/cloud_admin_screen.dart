import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:intl/intl.dart';
import 'package:printing/printing.dart';

import '../core/api_client.dart';
import '../shared/list_filters.dart';

class CloudAdminScreen extends StatefulWidget {
  const CloudAdminScreen({
    super.key,
    required this.api,
    this.certificates = false,
    this.applicationUid,
  });
  final ApiClient api;
  final bool certificates;
  final String? applicationUid;
  @override
  State<CloudAdminScreen> createState() => _CloudAdminScreenState();
}

class _CloudAdminScreenState extends State<CloudAdminScreen> {
  final _name = TextEditingController(), _title = TextEditingController();
  List<Map<String, dynamic>>? _items;
  String? _error, _signature;
  bool _busy = false, _hasSignature = false, _removeSignature = false;
  String _query = '', _status = '';
  List<Map<String, dynamic>> get _filteredItems => (_items ?? [])
      .where(
        (item) =>
            '${item['full_name']} ${item['email']}'.toLowerCase().contains(
              _query.toLowerCase(),
            ) &&
            (_status.isEmpty || item['status'] == _status),
      )
      .toList();
  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _name.dispose();
    _title.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    try {
      final data = await widget.api.cloudRequest(
        widget.certificates
            ? 'certificate-settings.php'
            : 'expert-applications.php',
        query: widget.applicationUid == null
            ? {}
            : {'uid': widget.applicationUid!},
      );
      if (!mounted) return;
      setState(() {
        _error = null;
        if (widget.certificates) {
          final settings = data['settings'] as Map;
          _name.text = '${settings['signer_name']}';
          _title.text = '${settings['signer_title']}';
          _hasSignature = settings['has_signature'] == true;
          _items = [];
        } else {
          _items = (data['items'] as List)
              .map((a) => Map<String, dynamic>.from(a as Map))
              .toList();
        }
      });
    } catch (e) {
      if (mounted) {
        setState(
          () => _error = e is ApiException
              ? e.message
              : 'Could not load this page. Try again.',
        );
      }
    }
  }

  Future<void> _viewId(Map<String, dynamic> item) async {
    try {
      final bytes = await widget.api.cloudFile(
        'expert-id.php',
        query: {'uid': '${item['uid']}'},
      );
      if (!mounted) return;
      await showDialog<void>(
        context: context,
        builder: (context) => AlertDialog(
          title: Text('${item['full_name']}'),
          content: Image.memory(bytes, fit: BoxFit.contain),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Close'),
            ),
          ],
        ),
      );
    } catch (e) {
      if (mounted) {
        setState(
          () =>
              _error = e is ApiException ? e.message : 'Could not open the ID.',
        );
      }
    }
  }

  Future<void> _review(Map<String, dynamic> item, bool approve) async {
    String note = '';
    final formKey = GlobalKey<FormState>();
    String? reason;
    reason = await showDialog<String>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(
          approve ? 'Approve this expert?' : 'Decline this application?',
        ),
        content: SingleChildScrollView(
          child: Form(
            key: formKey,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  approve
                      ? 'They can submit reports and review other users’ reports.'
                      : 'Explain the decision. Your note is included in the email.',
                ),
                TextFormField(
                  onChanged: (value) => note = value,
                  maxLength: 1000,
                  minLines: 2,
                  maxLines: 5,
                  validator: (value) => !approve && (value ?? '').trim().isEmpty
                      ? 'Add a reason for declining.'
                      : null,
                  decoration: InputDecoration(
                    labelText: approve
                        ? 'Message to applicant (optional)'
                        : 'Message to applicant',
                  ),
                ),
              ],
            ),
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () {
              if (formKey.currentState!.validate()) {
                Navigator.pop(context, note.trim());
              }
            },
            child: Text(approve ? 'Approve' : 'Decline'),
          ),
        ],
      ),
    );
    if (reason == null || !mounted) return;
    if (!approve && reason.trim().isEmpty) {
      setState(() => _error = 'Add a reason for declining.');
      return;
    }
    setState(() => _busy = true);
    try {
      final result = await widget.api.cloudRequest(
        'expert-applications.php',
        body: {
          'uid': item['uid'],
          'action': approve ? 'approve' : 'reject',
          'note': reason,
        },
      );
      await _load();
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text('${result['message']}')));
      }
    } catch (e) {
      if (mounted) {
        setState(
          () => _error = e is ApiException
              ? e.message
              : 'Could not save the review.',
        );
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _retryEmail(Map<String, dynamic> item) async {
    setState(() => _busy = true);
    try {
      final result = await widget.api.cloudRequest(
        'expert-applications.php',
        body: {'uid': item['uid'], 'action': 'retry_email'},
      );
      await _load();
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text('${result['message']}')));
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              e is ApiException
                  ? e.message
                  : 'Could not send the email. Try again.',
            ),
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _saveSigner() async {
    if (_name.text.trim().isEmpty || _title.text.trim().isEmpty) {
      setState(() => _error = 'Enter the signer name and title.');
      return;
    }
    setState(() => _busy = true);
    try {
      await widget.api.cloudUpload('certificate-settings.php', {
        'signer_name': _name.text,
        'signer_title': _title.text,
        'remove_signature': _removeSignature,
      }, _signature == null ? {} : {'signature': _signature!});
      if (mounted) {
        setState(() {
          _signature = null;
          _removeSignature = false;
        });
        ScaffoldMessenger.of(context)
            .showSnackBar(const SnackBar(content: Text('Certificates saved.')));
      }
      await _load();
    } catch (e) {
      if (mounted) {
        setState(
          () => _error = e is ApiException
              ? e.message
              : 'Could not save the signer.',
        );
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _previewSigner() async {
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final bytes = await widget.api.cloudFile(
        'certificate-settings.php',
        query: {'preview': '1'},
      );
      if (!mounted) return;
      await Navigator.push<void>(
        context,
        MaterialPageRoute(
          builder: (_) => Scaffold(
            appBar: AppBar(title: const Text('Certificate preview')),
            body: PdfPreview(
              build: (_) async => bytes,
              canChangePageFormat: false,
              canChangeOrientation: false,
              allowPrinting: false,
            ),
          ),
        ),
      );
    } catch (e) {
      if (mounted) {
        setState(
          () => _error = e is ApiException
              ? e.message
              : 'Could not open the preview.',
        );
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  String _applicationDate(dynamic value) {
    final date = DateTime.tryParse('$value');
    return date == null
        ? ''
        : DateFormat('MMM d, y · h:mm a')
              .format(date.toUtc().add(const Duration(hours: 8)));
  }

  Widget _applicationTag(String label, Color background, Color foreground) =>
      Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
        decoration: BoxDecoration(
          color: background,
          borderRadius: BorderRadius.circular(18),
        ),
        child: Text(
          label,
          style: TextStyle(color: foreground, fontWeight: FontWeight.w600),
        ),
      );

  Widget _applicationCard(Map<String, dynamic> item) {
    final pending = item['status'] == 'pending';
    final declined = item['status'] == 'rejected';
    final sent = item['email_status'] == 'sent';
    final sending = item['email_status'] == 'sending';
    final attempted = DateTime.tryParse('${item['email_attempted_at']}');
    final recentSend =
        sending &&
        attempted != null &&
        DateTime.now().difference(attempted) < const Duration(minutes: 2);
    final note = '${item['note'] ?? ''}'.trim();
    final reviewer = '${item['reviewer_name'] ?? ''}';
    final reviewed = _applicationDate(item['reviewed_at']);
    final muted = Theme.of(context).colorScheme.onSurfaceVariant;
    return Card(
      key: ValueKey('application-${item['uid']}'),
      margin: const EdgeInsets.only(bottom: 16),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Wrap(
              spacing: 12,
              runSpacing: 6,
              crossAxisAlignment: WrapCrossAlignment.center,
              children: [
                Text(
                  '${item['full_name']}',
                  style: Theme.of(context).textTheme.titleMedium
                      ?.copyWith(fontWeight: FontWeight.w700),
                ),
                _applicationTag(
                  pending
                      ? 'Pending review'
                      : declined
                      ? 'Declined'
                      : 'Approved',
                  pending
                      ? const Color(0xFFFFF2D6)
                      : declined
                      ? const Color(0xFFFBE5DF)
                      : const Color(0xFFE2F0DF),
                  pending
                      ? const Color(0xFF755114)
                      : declined
                      ? const Color(0xFFA13724)
                      : const Color(0xFF245B2B),
                ),
              ],
            ),
            const SizedBox(height: 6),
            SelectableText('${item['email']}', style: TextStyle(color: muted)),
            if (item['id_code'] != null) ...[
              const SizedBox(height: 12),
              Text('Expert ID', style: TextStyle(color: muted)),
              SelectableText(
                '${item['id_code']}',
                style: const TextStyle(fontWeight: FontWeight.w600),
              ),
            ],
            if (item['has_id_photo'] == true)
              Align(
                alignment: Alignment.centerLeft,
                child: TextButton.icon(
                  onPressed: _busy ? null : () => _viewId(item),
                  icon: const Icon(Icons.badge_outlined),
                  label: const Text('View ID photo'),
                ),
              ),
            if (pending) ...[
              const SizedBox(height: 12),
              if (item['created_at'] != null) ...[
                Text(
                  'Submitted ${_applicationDate(item['created_at'])}',
                  style: TextStyle(color: muted),
                ),
                const SizedBox(height: 12),
              ],
              Wrap(
                spacing: 10,
                runSpacing: 6,
                children: [
                  FilledButton(
                    onPressed: _busy ? null : () => _review(item, true),
                    child: const Text('Approve expert'),
                  ),
                  OutlinedButton(
                    onPressed: _busy ? null : () => _review(item, false),
                    child: const Text('Decline'),
                  ),
                ],
              ),
            ] else ...[
              if (note.isNotEmpty) ...[
                const SizedBox(height: 12),
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: const Color(0xFFF5F7F4),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        declined ? 'Decline reason' : 'Message to applicant',
                        style: TextStyle(
                          color: muted,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      const SizedBox(height: 6),
                      SelectableText(note),
                    ],
                  ),
                ),
              ],
              if (reviewer.isNotEmpty || reviewed.isNotEmpty) ...[
                const SizedBox(height: 12),
                Text(
                  '${reviewer.isEmpty ? 'Reviewed' : 'Reviewed by $reviewer'}${reviewed.isEmpty ? '' : ' · $reviewed'}',
                  style: TextStyle(color: muted),
                ),
              ],
              const SizedBox(height: 12),
              Wrap(
                spacing: 10,
                runSpacing: 6,
                crossAxisAlignment: WrapCrossAlignment.center,
                children: [
                  _applicationTag(
                    sent
                        ? 'Email sent'
                        : sending
                        ? 'Sending email…'
                        : 'Email not sent',
                    sent
                        ? const Color(0xFFE2F0DF)
                        : sending
                        ? const Color(0xFFE6EFFA)
                        : const Color(0xFFFFF2D6),
                    sent
                        ? const Color(0xFF245B2B)
                        : sending
                        ? const Color(0xFF204F7C)
                        : const Color(0xFF755114),
                  ),
                  if (!sent)
                    OutlinedButton(
                      onPressed: _busy || recentSend
                          ? null
                          : () => _retryEmail(item),
                      child: Text(
                        item['email_status'] == null
                            ? 'Send email'
                            : 'Retry email',
                      ),
                    ),
                ],
              ),
            ],
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(
      title: Text(
        widget.certificates
            ? 'Certificates'
            : (widget.applicationUid == null
                  ? 'Expert applications'
                  : 'Expert application'),
      ),
    ),
    body: RefreshIndicator(
      onRefresh: _load,
      child: ListView(
        padding: EdgeInsets.symmetric(
          vertical: 16,
          horizontal: ((MediaQuery.sizeOf(context).width - 760) / 2).clamp(
            16.0,
            double.infinity,
          ),
        ),
        children: [
          if (_error != null)
            Text(
              _error!,
              style: TextStyle(color: Theme.of(context).colorScheme.error),
            ),
          if (_items == null && _error == null)
            const Center(child: CircularProgressIndicator()),
          if (widget.certificates && _items != null) ...[
            const Text('Choose the name and signature shown on certificates.'),
            const SizedBox(height: 16),
            TextField(
              controller: _name,
              onChanged: (_) => setState(() {}),
              maxLength: 100,
              decoration: const InputDecoration(labelText: 'Signer name'),
            ),
            TextField(
              controller: _title,
              onChanged: (_) => setState(() {}),
              maxLength: 100,
              decoration: const InputDecoration(labelText: 'Position or title'),
            ),
            ExpansionTile(
              title: const Text('Signature image (optional)'),
              children: [
                OutlinedButton.icon(
                  onPressed: _busy
                      ? null
                      : () async {
                          try {
                            final image = await ImagePicker().pickImage(
                              source: ImageSource.gallery,
                            );
                            if (image != null && mounted) {
                              setState(() => _signature = image.path);
                            }
                          } catch (_) {
                            if (mounted) {
                              setState(
                                () => _error =
                                    'Could not select a signature image.',
                              );
                            }
                          }
                        },
                  icon: const Icon(Icons.draw_outlined),
                  label: Text(
                    _signature == null
                        ? 'Add signature image'
                        : 'Signature selected · Change',
                  ),
                ),
                const Text(
                  'Use an approved PNG or JPG signature. Without an image, the certificate shows “Signed by” and the name.',
                ),
                if (_hasSignature)
                  CheckboxListTile(
                    value: _removeSignature,
                    onChanged: (v) =>
                        setState(() => _removeSignature = v ?? false),
                    title: const Text('Remove current signature image'),
                  ),
              ],
            ),
            Card(
              child: Padding(
                padding: const EdgeInsets.all(20),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    const Text('Signer preview', textAlign: TextAlign.center),
                    const SizedBox(height: 12),
                    Text(
                      _name.text.trim().isEmpty
                          ? 'Signer name'
                          : _name.text.trim(),
                      textAlign: TextAlign.center,
                      style: Theme.of(context).textTheme.titleMedium,
                    ),
                    Text(
                      _title.text.trim().isEmpty
                          ? 'Position or title'
                          : _title.text.trim(),
                      textAlign: TextAlign.center,
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 16),
            FilledButton(
              onPressed: _busy ? null : _saveSigner,
              child: const Text('Save signer'),
            ),
            OutlinedButton(
              onPressed: _busy ? null : _previewSigner,
              child: const Text('Preview saved PDF'),
            ),
            const Text(
              'Save changes before previewing the PDF.',
              textAlign: TextAlign.center,
            ),
          ] else if (_items != null) ...[
            const Text(
              'Review credentials and send your decision to the applicant.',
            ),
            const SizedBox(height: 12),
            if (widget.applicationUid == null)
              ListFilters(
                hint: 'Applicant name or email',
                filterLabel: 'Status',
                options: const {
                  '': 'All applications',
                  'pending': 'Pending',
                  'approved': 'Approved',
                  'rejected': 'Declined',
                },
                busy: _busy,
                onApply: (query, status) => setState(() {
                  _query = query;
                  _status = status;
                }),
              ),
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 12),
              child: Text(
                '${_filteredItems.length} application${_filteredItems.length == 1 ? '' : 's'} · ${_status == 'pending'
                    ? 'Oldest first'
                    : _status.isEmpty
                    ? 'Pending first'
                    : 'Latest decisions first'}',
              ),
            ),
            if (_filteredItems.isEmpty)
              Padding(
                padding: EdgeInsets.all(24),
                child: Text(
                  _query.isNotEmpty || _status.isNotEmpty
                      ? 'No applications match.'
                      : 'No expert applications yet.',
                ),
              ),
            for (final item in _filteredItems) _applicationCard(item),
          ],
        ],
      ),
    ),
  );
}
