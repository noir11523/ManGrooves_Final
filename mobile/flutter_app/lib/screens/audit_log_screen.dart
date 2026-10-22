import 'package:flutter/material.dart';

import '../core/api_client.dart';

class AuditLogScreen extends StatefulWidget {
  const AuditLogScreen({super.key, required this.api});
  final ApiClient api;
  @override
  State<AuditLogScreen> createState() => _AuditLogScreenState();
}

class _AuditLogScreenState extends State<AuditLogScreen> {
  Map<String, dynamic>? _data;
  String? _error;
  int _page = 1;
  bool _loading = false;
  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    if (_loading) return;
    setState(() => _loading = true);
    try {
      final data = await widget.api.cloudRequest(
        'audit.php',
        query: {'page': '$_page'},
      );
      if (mounted) {
        setState(() {
          _data = data;
          _error = null;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(
          () => _error = e is ApiException
              ? e.message
              : 'Could not load audit logs.',
        );
      }
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: const Text('Audit logs')),
    body: RefreshIndicator(
      onRefresh: _load,
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          if (_loading) const LinearProgressIndicator(),
          if (_error != null)
            TextButton(onPressed: _load, child: Text('$_error Try again')),
          for (final item in (_data?['items'] as List? ?? []))
            Card(
              child: ListTile(
                title: Text(
                  '${item['action'] ?? 'Activity'}'
                      .replaceAll('_', ' ')
                      .replaceAll('.', ' / '),
                ),
                subtitle: Text(
                  '${item['actor_name'] ?? 'System'}\n${item['entity_type'] ?? ''} ${item['entity_id'] ?? ''}\n${item['created_at'] ?? ''}',
                ),
              ),
            ),
          if (!_loading &&
              _error == null &&
              (_data?['items'] as List? ?? []).isEmpty)
            const Text('No audit logs yet.'),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              TextButton(
                onPressed: _loading || _page <= 1
                    ? null
                    : () {
                        _page--;
                        _load();
                      },
                child: const Text('Previous'),
              ),
              Text('Page $_page'),
              TextButton(
                onPressed: _loading || _page >= (_data?['pages'] as num? ?? 1)
                    ? null
                    : () {
                        _page++;
                        _load();
                      },
                child: const Text('Next'),
              ),
            ],
          ),
        ],
      ),
    ),
  );
}
