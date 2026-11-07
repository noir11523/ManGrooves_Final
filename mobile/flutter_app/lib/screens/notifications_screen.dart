import 'package:flutter/material.dart';

import 'dart:async';

import '../core/api_client.dart';
import 'report_detail_screen.dart';
import 'cloud_admin_screen.dart';
import 'badges_screen.dart';

class NotificationsScreen extends StatefulWidget {
  const NotificationsScreen({
    super.key,
    required this.api,
    this.user,
    this.onChanged,
  });
  final ApiClient api;
  final Map<String, dynamic>? user;
  final Future<void> Function()? onChanged;
  @override
  State<NotificationsScreen> createState() => _NotificationsScreenState();
}

class _NotificationsScreenState extends State<NotificationsScreen>
    with WidgetsBindingObserver {
  Timer? _timer;
  bool _fetching = false, _opening = false;
  List<Map<String, dynamic>> _items = [];
  int _page = 1, _pages = 1, _unread = 0;
  bool _loading = true;
  String? _error;
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _timer = Timer.periodic(const Duration(seconds: 20), (_) {
      if (ModalRoute.of(context)?.isCurrent == true) _load(page: _page);
    });
    _load();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed &&
        ModalRoute.of(context)?.isCurrent == true) {
      _load(page: _page);
    }
  }

  @override
  void dispose() {
    _timer?.cancel();
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  Future<void> _load({int page = 1}) async {
    if (_fetching ||
        !mounted ||
        (WidgetsBinding.instance.lifecycleState != null &&
            WidgetsBinding.instance.lifecycleState !=
                AppLifecycleState.resumed)) {
      return;
    }
    _fetching = true;
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
      _fetching = false;
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _open(Map<String, dynamic> item) async {
    if (_opening) return;
    _opening = true;
    try {
      final result = await widget.api.markNotificationRead(item['id'] as int);
      if (!mounted) return;
      final current = result['notification'] is Map
          ? Map<String, dynamic>.from(result['notification'] as Map)
          : item;
      final target = current['target'] as Map?;
      final link = Uri.tryParse(current['link']?.toString() ?? '');
      final id = int.tryParse(
        '${target?['id'] ?? current['report_id'] ?? link?.queryParameters['id'] ?? link?.queryParameters['parent'] ?? ''}',
      );
      if (target?['page'] == 'expert-applications' &&
          widget.user?['role'] == 'system_admin' &&
          RegExp(r'^[\w-]{1,80}$').hasMatch('${target?['uid']}')) {
        await Navigator.of(context).push(
          MaterialPageRoute<void>(
            builder: (_) => CloudAdminScreen(
              api: widget.api,
              applicationUid: '${target?['uid']}',
            ),
          ),
        );
      } else if (target?['page'] == 'badges' &&
          ['guardian', 'expert'].contains(widget.user?['role'])) {
        await Navigator.of(context).push(
          MaterialPageRoute<void>(
            builder: (_) => Scaffold(
              appBar: AppBar(title: const Text('My badges')),
              body: BadgesScreen(api: widget.api),
            ),
          ),
        );
      } else if (id != null &&
          id > 0 &&
          (target?['page'] == 'report' ||
              !current.containsKey('target') &&
                  [
                    'admin/report.php',
                    'reports.php',
                    'report-detail.php',
                    'submit-report.php',
                  ].contains(link?.path))) {
        await Navigator.of(context).push(
          MaterialPageRoute<void>(
            builder: (_) => ReportDetailScreen(api: widget.api, reportId: id),
          ),
        );
      }
      await _load(page: _page);
      await widget.onChanged?.call();
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
    } finally {
      _opening = false;
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
                await widget.onChanged?.call();
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
                      'No notifications yet. Applications, report updates, feedback, and badges will appear here.',
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
