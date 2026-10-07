import 'validation_history_screen.dart';
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
import 'verification_screen.dart';
import 'notifications_screen.dart';
import 'cluster_timeline_screen.dart';

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

class _HomeShellState extends State<HomeShell> {
  int _index = 0;
  int _reportsVersion = 0;
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

  @override
  Widget build(BuildContext context) {
    final titles = _guardian
        ? ['Dashboard', 'Reports', 'Submit Report', 'Badges', 'Account']
        : ['Dashboard', 'Reports', 'Review reports', 'Analytics', 'Account'];
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
            ReportsScreen(
              key: ValueKey(_reportsVersion),
              api: widget.api,
              showSubmitter: true,
              active: _index == 1,
            ),
            VerificationScreen(api: widget.api, active: _index == 2),
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
        if (!didPop) back();
      },
      child: Scaffold(
        appBar: AppBar(
          leading: _index == 0 ? null : BackButton(onPressed: back),
          actions: [
            PopupMenuButton<String>(
              tooltip: 'Menu',
              icon: const Icon(Icons.menu),
              itemBuilder: (_) => [
                const PopupMenuItem(value: 'account', child: Text('Account')),
                if (!_guardian)
                  const PopupMenuItem(
                    value: 'history',
                    child: Text('Review history'),
                  ),
                if (widget.api.supportsCloudAccounts && !_guardian)
                  const PopupMenuItem(
                    value: 'species',
                    child: Text('Species and Sites'),
                  ),
                if (widget.api.supportsCloudAccounts &&
                    _user['role'] == 'system_admin') ...const [
                  PopupMenuItem(value: 'users', child: Text('Users')),
                  PopupMenuItem(
                    value: 'checklist',
                    child: Text('Health checklist'),
                  ),
                  PopupMenuItem(
                    value: 'badge-settings',
                    child: Text('Manage badges'),
                  ),
                  PopupMenuItem(
                    value: 'applications',
                    child: Text('Expert applications'),
                  ),
                  PopupMenuItem(
                    value: 'signer',
                    child: Text('Certificate signer'),
                  ),
                ],
                if (_user['role'] == 'expert')
                  const PopupMenuItem(
                    value: 'badges',
                    child: Text('My badges'),
                  ),
              ],
              onSelected: (choice) {
                if (choice == 'account') {
                  setState(() => _index = 4);
                  return;
                }
                final Widget page = switch (choice) {
                  'history' => ValidationHistoryScreen(api: widget.api),
                  'checklist' => ChecklistScreen(api: widget.api),
                  'applications' => CloudAdminScreen(api: widget.api),
                  'signer' => CloudAdminScreen(
                    api: widget.api,
                    certificates: true,
                  ),
                  'badges' => Scaffold(
                    appBar: AppBar(title: const Text('My badges')),
                    body: BadgesScreen(api: widget.api),
                  ),
                  _ => ManagementScreen(api: widget.api, page: choice),
                };
                Navigator.push(
                  context,
                  MaterialPageRoute<void>(builder: (_) => page),
                );
              },
            ),
            PopupMenuButton<String>(
              tooltip: 'Analytics and timelines',
              icon: const Icon(Icons.insights_outlined),
              onSelected: (choice) {
                if (choice == 'analytics' && !_guardian) {
                  setState(() => _index = 3);
                  return;
                }
                Navigator.push(
                  context,
                  MaterialPageRoute<void>(
                    builder: (_) => choice == 'analytics'
                        ? Scaffold(
                            appBar: AppBar(title: const Text('Analytics')),
                            body: AnalyticsScreen(api: widget.api),
                          )
                        : ClustersScreen(
                            api: widget.api,
                            initialTab: choice == 'growth' ? 1 : 0,
                          ),
                  ),
                );
              },
              itemBuilder: (_) => const [
                PopupMenuItem(value: 'analytics', child: Text('Analytics')),
                PopupMenuItem(value: 'health', child: Text('Health history')),
                PopupMenuItem(value: 'growth', child: Text('Growth timeline')),
              ],
            ),
            IconButton(
              tooltip: 'Notifications',
              icon: const Icon(Icons.notifications_outlined),
              onPressed: () => Navigator.of(context).push(
                MaterialPageRoute<void>(
                  builder: (_) => NotificationsScreen(api: widget.api),
                ),
              ),
            ),
          ],
          title: Row(
            children: [
              Icon(Icons.park, color: Theme.of(context).colorScheme.primary),
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
                onPressed: () => Navigator.push(
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
                ),
              )
            : null,
        bottomNavigationBar: NavigationBar(
          labelPadding: const EdgeInsets.fromLTRB(2, 4, 2, 0),
          selectedIndex: _index,
          onDestinationSelected: (value) => setState(() => _index = value),
          destinations: [
            const NavigationDestination(
              icon: Icon(Icons.dashboard_outlined),
              selectedIcon: Icon(Icons.dashboard),
              label: 'Home',
            ),
            const NavigationDestination(
              icon: Icon(Icons.assignment_outlined),
              selectedIcon: Icon(Icons.assignment),
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
                label: '',
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
                icon: Icon(Icons.fact_check_outlined),
                selectedIcon: Icon(Icons.fact_check),
                label: 'Review',
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
