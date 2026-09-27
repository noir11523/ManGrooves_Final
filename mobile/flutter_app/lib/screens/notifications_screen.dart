import 'package:flutter/material.dart';

import '../core/api_client.dart';
import 'report_detail_screen.dart';

class NotificationsScreen extends StatefulWidget {
  const NotificationsScreen({super.key, required this.api});
  final ApiClient api;
  @override
  State<NotificationsScreen> createState() => _NotificationsScreenState();
}

class _NotificationsScreenState extends State<NotificationsScreen> {
  List<Map<String, dynamic>> _items = [];
  int _page = 1, _pages = 1, _unread = 0;
  bool _loading = true;
  String? _error;
  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load({int page = 1}) async {
    try {
      final result = await widget.api.notifications(page: page);
      if (!mounted) return;
      setState(() {
        _items = (result['notifications'] as List)
            .map((item) => Map<String, dynamic>.from(item as Map))
            .toList();
        _page = result['page'] as int;
        _pages = result['pages'] as int;
        _unread = result['unread'] as int;
        _error = null;
      });
    } catch (error) {
      if (mounted) {
        setState(
          () => _error = error is ApiException
              ? error.message
              : 'Unable to load notifications.',
        );
      }
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _open(Map<String, dynamic> item) async {
    try {
      await widget.api.markNotificationRead(item['id'] as int);
      if (!mounted) return;
      final link = Uri.tryParse(item['link']?.toString() ?? '');
      final id = int.tryParse(
        link?.queryParameters['id'] ?? link?.queryParameters['parent'] ?? '',
      );
      if (id != null &&
          [
            'admin/report.php',
            'reports.php',
            'submit-report.php',
          ].contains(link?.path)) {
        await Navigator.of(context).push(
          MaterialPageRoute<void>(
            builder: (_) => ReportDetailScreen(api: widget.api, reportId: id),
          ),
        );
      }
      await _load(page: _page);
    } catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              error is ApiException
                  ? error.message
                  : 'Unable to open notification.',
            ),
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(
      title: const Text('Notifications'),
      actions: [
        if (_unread > 0)
          TextButton(
            onPressed: () async {
              try {
                await widget.api.markAllNotificationsRead();
                await _load(page: _page);
              } catch (_) {
                if (mounted) {
                  setState(
                    () => _error = 'Unable to mark notifications as read.',
                  );
                }
              }
            },
            child: const Text('Mark all read'),
          ),
      ],
    ),
    body: _loading
        ? const Center(child: CircularProgressIndicator())
        : RefreshIndicator(
            onRefresh: _load,
            child: ListView(
              physics: const AlwaysScrollableScrollPhysics(),
              children: [
                if (_error != null)
                  ListTile(
                    title: Text(_error!),
                    trailing: IconButton(
                      onPressed: _load,
                      icon: const Icon(Icons.refresh),
                    ),
                  ),
                if (_items.isEmpty && _error == null)
                  const Padding(
                    padding: EdgeInsets.all(24),
                    child: Text(
                      'No notifications yet. Report activity and reminders will appear here.',
                    ),
                  ),
                for (final item in _items)
                  ListTile(
                    leading: Icon(
                      item['read_at'] == null
                          ? Icons.notifications_active
                          : Icons.notifications_none,
                    ),
                    title: Text(
                      item['title'].toString(),
                      style: TextStyle(
                        fontWeight: item['read_at'] == null
                            ? FontWeight.bold
                            : FontWeight.normal,
                      ),
                    ),
                    subtitle: Text('${item['message']}\n${item['created_at']}'),
                    onTap: () => _open(item),
                  ),
                if (_pages > 1)
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      IconButton(
                        onPressed: _page > 1
                            ? () => _load(page: _page - 1)
                            : null,
                        icon: const Icon(Icons.chevron_left),
                      ),
                      Text('$_page / $_pages'),
                      IconButton(
                        onPressed: _page < _pages
                            ? () => _load(page: _page + 1)
                            : null,
                        icon: const Icon(Icons.chevron_right),
                      ),
                    ],
                  ),
              ],
            ),
          ),
  );
}
