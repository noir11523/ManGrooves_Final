import 'package:flutter/material.dart';

import '../core/api_client.dart';
import 'submit_report_screen.dart';

Future<void> startFollowUp(
  BuildContext context,
  ApiClient api,
  Map report,
) async {
  try {
    final response = await api.me();
    if (!context.mounted) return;
    final user = response['user'] as Map;
    await Navigator.push(
      context,
      MaterialPageRoute<void>(
        builder: (_) => _FollowUpScreen(
          api: api,
          report: report,
          owner: '${user['uid'] ?? user['id']}',
        ),
      ),
    );
  } catch (error) {
    if (context.mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            error is ApiException
                ? error.message
                : 'Could not open this follow-up. Try again.',
          ),
        ),
      );
    }
  }
}

class _FollowUpScreen extends StatefulWidget {
  const _FollowUpScreen({
    required this.api,
    required this.report,
    required this.owner,
  });
  final ApiClient api;
  final Map report;
  final String owner;
  @override
  State<_FollowUpScreen> createState() => _FollowUpScreenState();
}

class _FollowUpScreenState extends State<_FollowUpScreen> {
  final _key = GlobalKey<SubmitReportScreenState>();
  bool _leaving = false;
  void _leave() {
    setState(() => _leaving = true);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) Navigator.pop(context);
    });
  }

  @override
  Widget build(BuildContext context) => PopScope(
    canPop: _leaving,
    onPopInvokedWithResult: (popped, _) {
      if (!popped) _key.currentState?.goBack();
    },
    child: Scaffold(
      appBar: AppBar(
        title: const Text('Follow-up observation'),
        leading: BackButton(onPressed: () => _key.currentState?.goBack()),
      ),
      body: SubmitReportScreen(
        key: _key,
        api: widget.api,
        draftOwner: widget.owner,
        initialParentReportId: widget.report['id'] as int,
        initialClusterId: widget.report['cluster_id'] as int,
        handleSystemBack: false,
        onExit: _leave,
        onSubmitted: _leave,
      ),
    ),
  );
}
