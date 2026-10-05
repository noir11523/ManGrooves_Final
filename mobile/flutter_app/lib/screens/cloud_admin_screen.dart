import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';

import '../core/api_client.dart';
import '../core/display_text.dart';

class CloudAdminScreen extends StatefulWidget {
  const CloudAdminScreen({
    super.key,
    required this.api,
    this.certificates = false,
  });
  final ApiClient api;
  final bool certificates;
  @override
  State<CloudAdminScreen> createState() => _CloudAdminScreenState();
}

class _CloudAdminScreenState extends State<CloudAdminScreen> {
  final _name = TextEditingController(), _title = TextEditingController();
  List<Map<String, dynamic>>? _items;
  String? _error, _signature;
  bool _busy = false, _hasSignature = false, _removeSignature = false;
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
    String? reason;
    reason = await showDialog<String>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(
          approve ? 'Approve this expert?' : 'Decline this application?',
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              approve
                  ? 'They can submit reports and review other users’ reports.'
                  : 'Give a reason for declining.',
            ),
            TextField(
              onChanged: (value) => note = value,
              maxLength: 1000,
              decoration: InputDecoration(
                labelText: approve ? 'Note (optional)' : 'Reason',
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(context, note),
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
      await widget.api.cloudRequest(
        'expert-applications.php',
        body: {
          'uid': item['uid'],
          'action': approve ? 'approve' : 'reject',
          'note': reason,
        },
      );
      await _load();
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
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Certificate signer saved.')),
        );
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

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(
      title: Text(
        widget.certificates ? 'Certificate signer' : 'Expert applications',
      ),
    ),
    body: RefreshIndicator(
      onRefresh: _load,
      child: ListView(
        padding: const EdgeInsets.all(20),
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
              maxLength: 100,
              decoration: const InputDecoration(labelText: 'Signer name'),
            ),
            TextField(
              controller: _title,
              maxLength: 100,
              decoration: const InputDecoration(labelText: 'Position or title'),
            ),
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
                            () =>
                                _error = 'Could not select a signature image.',
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
                onChanged: (v) => setState(() => _removeSignature = v ?? false),
                title: const Text('Remove current signature image'),
              ),
            const SizedBox(height: 16),
            FilledButton(
              onPressed: _busy ? null : _saveSigner,
              child: const Text('Save signer'),
            ),
          ] else if (_items != null) ...[
            const Text('Check the ID code before approving expert access.'),
            if (_items!.isEmpty)
              const Padding(
                padding: EdgeInsets.all(24),
                child: Text('No expert applications yet.'),
              ),
            for (final item in _items!)
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      Text(
                        '${item['full_name']}',
                        style: Theme.of(context).textTheme.titleLarge,
                      ),
                      Text('${item['email']}'),
                      Text(statusLabel(item['status'])),
                      if (item['id_code'] != null) ...[
                        const SizedBox(height: 12),
                        const Text('Expert ID code'),
                        SelectableText(
                          '${item['id_code']}',
                          style: Theme.of(context).textTheme.titleMedium,
                        ),
                        const SizedBox(height: 12),
                      ],
                      if (item['has_id_photo'] == true)
                        TextButton.icon(
                          onPressed: () => _viewId(item),
                          icon: const Icon(Icons.badge_outlined),
                          label: const Text('View previous ID photo'),
                        ),
                      if (item['status'] == 'pending')
                        Wrap(
                          spacing: 12,
                          children: [
                            FilledButton(
                              onPressed: _busy
                                  ? null
                                  : () => _review(item, true),
                              child: const Text('Approve'),
                            ),
                            OutlinedButton(
                              onPressed: _busy
                                  ? null
                                  : () => _review(item, false),
                              child: const Text('Decline'),
                            ),
                          ],
                        )
                      else
                        Text('${item['note'] ?? ''}'),
                    ],
                  ),
                ),
              ),
          ],
        ],
      ),
    ),
  );
}
