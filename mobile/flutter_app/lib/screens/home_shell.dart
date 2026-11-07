import 'report_history_screen.dart';

import 'dart:async';

import 'management_screen.dart';
import 'checklist_screen.dart';
import 'cloud_admin_screen.dart';

import 'package:flutter/material.dart';

import '../core/api_client.dart';
import 'analytics_screen.dart';
import 'badges_screen.dart';
import 'dashboard_screen.dart';
import 'profile_screen.dart';
import 'reports_screen.dart';
import 'submit_report_screen.dart';
import 'report_map_screen.dart';
import 'audit_log_screen.dart';
import 'notifications_screen.dart';
import 'cluster_timeline_screen.dart';
import 'explore_sites_screen.dart';

class HomeShell extends StatefulWidget {
  const HomeShell({
    super.key,
    required this.api,
    required this.user,
    required this.onSignedOut,
  });

  final ApiClient api;
  final Map<String, dynamic> user;
  final Future<void> Function() onSignedOut;

  @override
  State<HomeShell> createState() => _HomeShellState();
}

class _HomeShellState extends State<HomeShell> with WidgetsBindingObserver {
  Timer? _notificationTimer;
  int _unreadNotifications = 0;
  bool _checkingNotifications = false;
  int _index = 0;
  int _reportsVersion = 0;
  bool _mapVisited = false;
  GlobalKey<SubmitReportScreenState> _submissionKey =
      GlobalKey<SubmitReportScreenState>();
  int? _followUpReportId;
  int? _followUpClusterId;
  late Map<String, dynamic> _user;

  bool get _guardian => _user['role'] == 'guardian';

  @override
  void initState() {
    super.initState();
    _user = Map<String, dynamic>.from(widget.user);
    WidgetsBinding.instance.addObserver(this);
    _notificationTimer = Timer.periodic(
      const Duration(seconds: 20),
      (_) => _refreshNotifications(),
    );
    _refreshNotifications();
  }

  Future<void> _refreshNotifications() async {
    if (!mounted ||
        _checkingNotifications ||
        (WidgetsBinding.instance.lifecycleState != null &&
            WidgetsBinding.instance.lifecycleState !=
                AppLifecycleState.resumed)) {
      return;
    }
    _checkingNotifications = true;
    try {
      final result = await widget.api.notificationSummary();
      final unread = (result['unread'] as num?)?.toInt() ?? 0;
      if (mounted && unread != _unreadNotifications) {
        setState(() => _unreadNotifications = unread);
      }
    } catch (_) {
      // Keep the last known count while offline; resume retries.
    } finally {
      _checkingNotifications = false;
    }
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) _refreshNotifications();
  }

  @override
  void dispose() {
    _notificationTimer?.cancel();
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  void _startFollowUp(Map<String, dynamic> reminder) {
    setState(() {
      _followUpReportId = reminder['id'] as int?;
      _followUpClusterId = reminder['cluster_id'] as int?;
      _submissionKey = GlobalKey<SubmitReportScreenState>();
      _index = 2;
    });
  }

  void _updateUser(Map<String, dynamic> user) {
    setState(() {
      if (_user['barangay_id'] != user['barangay_id']) {
        _submissionKey = GlobalKey<SubmitReportScreenState>();
        _followUpReportId = null;
        _followUpClusterId = null;
      }
      _user = user;
    });
  }

  void _openSubmit() {
    if (_guardian) {
      setState(() => _index = 2);
      return;
    }
    Navigator.push(
      context,
      MaterialPageRoute<void>(
        builder: (context) => Scaffold(
          appBar: AppBar(title: const Text('Submit Report')),
          body: SubmitReportScreen(
            api: widget.api,
            draftOwner: '${_user['uid'] ?? _user['id']}',
            onSubmitted: () {
              Navigator.pop(context);
              setState(() => _reportsVersion++);
            },
            onExit: () => Navigator.pop(context),
          ),
        ),
      ),
    );
  }

  Future<void> _openMenu() async {
    final admin = _user['role'] == 'system_admin';
    final groups = <String, Map<String, String>>{
      'Reports & Monitoring': {
        'timeline': 'Mangrove timeline',
        'explore': 'Explore mangrove sites',
        if (_guardian) 'map': 'Report map',
      },
      if (!_guardian && widget.api.supportsCloudAccounts)
        'Mangrove Data': {
          'species': 'Species & sites',
          if (admin) 'checklist': 'Condition checklist',
        },
      if (admin && widget.api.supportsCloudAccounts)
        'User Management': {
          'users': 'All users',
          'applications': 'Expert applications',
        },
      if (admin && widget.api.supportsCloudAccounts)
        'Recognition': {'badge-settings': 'Badges', 'signer': 'Certificates'},
      if (admin && widget.api.supportsCloudAccounts)
        'System Management': {'audit': 'Audit logs'},
      if (_user['role'] == 'expert') 'Recognition': {'badges': 'My badges'},
    };
    final choice = await showModalBottomSheet<String>(
      context: context,
      useSafeArea: true,
      isScrollControlled: true,
      builder: (context) => FractionallySizedBox(
        heightFactor: .8,
        child: Column(
          children: [
            ListTile(
              title: const Text('Menu'),
              trailing: IconButton(
                tooltip: 'Close menu',
                icon: const Icon(Icons.close),
                onPressed: () => Navigator.pop(context),
              ),
            ),
            Expanded(
              child: ListView(
                children: [
                  ListTile(
                    leading: const Icon(Icons.dashboard_outlined),
                    title: const Text('Dashboard'),
                    onTap: () => Navigator.pop(context, 'dashboard'),
                  ),
                  if (!admin)
                    ListTile(
                      leading: const Icon(Icons.add_a_photo_outlined),
                      title: const Text('Submit report'),
                      onTap: () => Navigator.pop(context, 'submit'),
                    ),
                  if (_guardian)
                    ListTile(
                      leading: const Icon(Icons.bar_chart),
                      title: const Text('Analytics'),
                      onTap: () => Navigator.pop(context, 'analytics'),
                    ),
                  for (final group in groups.entries)
                    ExpansionTile(
                      title: Text(group.key),
                      children: [
                        for (final item in group.value.entries)
                          ListTile(
                            contentPadding: const EdgeInsets.symmetric(
                              horizontal: 32,
                            ),
                            title: Text(item.value),
                            onTap: () => Navigator.pop(context, item.key),
                          ),
                      ],
                    ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
    if (choice == null || !mounted) return;
    if (choice == 'dashboard') {
      setState(() => _index = 0);
      return;
    }
    if (choice == 'submit') {
      _openSubmit();
      return;
    }
    final Widget page = switch (choice) {
      'timeline' => ClustersScreen(api: widget.api),
      'map' => ReportMapScreen(api: widget.api),
      'explore' => ExploreSitesScreen(api: widget.api, user: _user),
      'analytics' => Scaffold(
        appBar: AppBar(title: const Text('Analytics')),
        body: AnalyticsScreen(api: widget.api),
      ),
      'checklist' => ChecklistScreen(api: widget.api),
      'applications' => CloudAdminScreen(api: widget.api),
      'signer' => CloudAdminScreen(api: widget.api, certificates: true),
      'audit' => AuditLogScreen(api: widget.api),
      'badges' => Scaffold(
        appBar: AppBar(title: const Text('My badges')),
        body: BadgesScreen(api: widget.api),
      ),
      _ => ManagementScreen(api: widget.api, page: choice),
    };
    await Navigator.push(
      context,
      MaterialPageRoute<void>(builder: (_) => page),
    );
  }

  @override
  Widget build(BuildContext context) {
    final titles = _guardian
        ? ['Dashboard', 'My reports', 'Submit Report', 'My badges', 'Account']
        : ['Dashboard', 'All reports', 'Report map', 'Analytics', 'Account'];
    final pages = _guardian
        ? <Widget>[
            DashboardScreen(
              api: widget.api,
              active: _index == 0,
              onStartFollowUp: _startFollowUp,
            ),
            ReportsScreen(
              key: ValueKey(_reportsVersion),
              api: widget.api,
              active: _index == 1,
            ),
            SubmitReportScreen(
              key: _submissionKey,
              api: widget.api,
              draftOwner: '${_user['uid'] ?? _user['id']}',
              initialParentReportId: _followUpReportId,
              active: _index == 2,
              onExit: () => setState(() => _index = 0),
              initialClusterId: _followUpClusterId,
              onSubmitted: () {
                setState(() {
                  _reportsVersion++;
                  _followUpReportId = null;
                  _followUpClusterId = null;
                  _index = 1;
                });
              },
            ),
            BadgesScreen(api: widget.api, active: _index == 3),
            ProfileScreen(
              initialUser: _user,
              api: widget.api,
              onSignedOut: widget.onSignedOut,
              onUserChanged: _updateUser,
            ),
          ]
        : <Widget>[
            DashboardScreen(api: widget.api, active: _index == 0),
            ReportHistoryScreen(
              key: ValueKey(_reportsVersion),
              api: widget.api,
              active: _index == 1,
            ),
            if (_index == 2 || _mapVisited)
              ReportMapScreen(api: widget.api)
            else
              const SizedBox.shrink(),
            AnalyticsScreen(api: widget.api, active: _index == 3),
            ProfileScreen(
              initialUser: _user,
              api: widget.api,
              onSignedOut: widget.onSignedOut,
              onUserChanged: _updateUser,
            ),
          ];

    void back() {
      if (_guardian && _index == 2) {
        _submissionKey.currentState?.goBack();
      } else {
        setState(() => _index = 0);
      }
    }

    return PopScope(
      canPop: _index == 0,
      onPopInvokedWithResult: (didPop, _) {
        if (!didPop && !(_guardian && _index == 2)) back();
      },
      child: Scaffold(
        appBar: AppBar(
          leading: _index == 0 ? null : BackButton(onPressed: back),
          actions: [
            IconButton(
              tooltip: 'Menu',
              icon: const Icon(Icons.menu),
              onPressed: _openMenu,
            ),
            IconButton(
              tooltip: _unreadNotifications > 0
                  ? 'Notifications, $_unreadNotifications unread'
                  : 'Notifications',
              icon: Badge(
                isLabelVisible: _unreadNotifications > 0,
                label: Text(
                  _unreadNotifications > 99 ? '99+' : '$_unreadNotifications',
                ),
                child: const Icon(Icons.notifications_outlined),
              ),
              onPressed: () async {
                await Navigator.of(context).push(
                  MaterialPageRoute<void>(
                    builder: (_) => NotificationsScreen(
                      api: widget.api,
                      user: _user,
                      onChanged: _refreshNotifications,
                    ),
                  ),
                );
                await _refreshNotifications();
              },
            ),
          ],
          title: Row(
            children: [
              Image.asset(
                'assets/brand/mangrooves.png',
                width: 32,
                height: 32,
                semanticLabel: 'ManGROOVES',
              ),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  titles[_index],
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
            ],
          ),
        ),
        body: IndexedStack(index: _index, children: pages),
        floatingActionButton: _user['role'] == 'expert' && _index == 1
            ? FloatingActionButton.extended(
                icon: const Icon(Icons.add_a_photo_outlined),
                label: const Text('Submit Report'),
                onPressed: _openSubmit,
              )
            : null,
        bottomNavigationBar: NavigationBar(
          labelPadding: const EdgeInsets.fromLTRB(2, 4, 2, 0),
          selectedIndex: _index,
          onDestinationSelected: (value) => setState(() {
            _index = value;
            if (!_guardian && value == 2) _mapVisited = true;
          }),
          destinations: [
            const NavigationDestination(
              icon: Icon(Icons.dashboard_outlined),
              selectedIcon: Icon(Icons.dashboard),
              label: 'Home',
            ),
            NavigationDestination(
              icon: Icon(
                _guardian
                    ? Icons.assignment_outlined
                    : Icons.fact_check_outlined,
              ),
              selectedIcon: Icon(
                _guardian ? Icons.assignment : Icons.fact_check,
              ),
              label: 'Reports',
            ),
            if (_guardian)
              const NavigationDestination(
                icon: Icon(
                  Icons.add_a_photo_outlined,
                  semanticLabel: 'Submit report',
                ),
                selectedIcon: Icon(
                  Icons.add_a_photo,
                  semanticLabel: 'Submit report',
                ),
                label: 'Submit',
                tooltip: 'Submit report',
              ),
            if (_guardian)
              const NavigationDestination(
                icon: Icon(Icons.workspace_premium_outlined),
                selectedIcon: Icon(Icons.workspace_premium),
                label: 'Badges',
              ),
            if (!_guardian)
              const NavigationDestination(
                icon: Icon(Icons.assignment_outlined),
                selectedIcon: Icon(Icons.assignment),
                label: 'Map',
              ),
            if (!_guardian)
              const NavigationDestination(
                icon: Icon(Icons.insights_outlined),
                selectedIcon: Icon(Icons.insights),
                label: 'Analytics',
              ),
            const NavigationDestination(
              icon: Icon(Icons.person_outline),
              selectedIcon: Icon(Icons.person),
              label: 'Account',
            ),
          ],
        ),
      ),
    );
  }
}
