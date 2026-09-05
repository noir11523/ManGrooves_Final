import 'package:flutter/material.dart';

import '../core/api_client.dart';
import 'analytics_screen.dart';
import 'badges_screen.dart';
import 'dashboard_screen.dart';
import 'profile_screen.dart';
import 'reports_screen.dart';
import 'submit_report_screen.dart';
import 'verification_screen.dart';

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
  int _submissionVersion = 0;
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
      _submissionVersion++;
      _index = 2;
    });
  }

  @override
  Widget build(BuildContext context) {
    final titles = _guardian
        ? ['Dashboard', 'Reports', 'New report', 'Badges', 'Account']
        : ['Dashboard', 'Reports', 'Verify', 'Analytics', 'Account'];
    final pages = _guardian
        ? <Widget>[
            DashboardScreen(api: widget.api, onStartFollowUp: _startFollowUp),
            ReportsScreen(key: ValueKey(_reportsVersion), api: widget.api),
            SubmitReportScreen(
              key: ValueKey(_submissionVersion),
              api: widget.api,
              initialParentReportId: _followUpReportId,
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
            BadgesScreen(api: widget.api),
            ProfileScreen(
              initialUser: _user,
              api: widget.api,
              onSignedOut: widget.onSignedOut,
              onUserChanged: (user) => setState(() => _user = user),
            ),
          ]
        : <Widget>[
            DashboardScreen(api: widget.api),
            ReportsScreen(key: ValueKey(_reportsVersion), api: widget.api),
            VerificationScreen(api: widget.api),
            AnalyticsScreen(api: widget.api),
            ProfileScreen(
              initialUser: _user,
              api: widget.api,
              onSignedOut: widget.onSignedOut,
              onUserChanged: (user) => setState(() => _user = user),
            ),
          ];

    return Scaffold(
      appBar: AppBar(
        title: Row(
          children: [
            Icon(Icons.park, color: Theme.of(context).colorScheme.primary),
            const SizedBox(width: 8),
            Text(titles[_index]),
          ],
        ),
      ),
      body: IndexedStack(index: _index, children: pages),
      bottomNavigationBar: NavigationBar(
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
              icon: Icon(Icons.add_a_photo_outlined),
              selectedIcon: Icon(Icons.add_a_photo),
              label: 'Observe',
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
              label: 'Verify',
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
    );
  }
}
