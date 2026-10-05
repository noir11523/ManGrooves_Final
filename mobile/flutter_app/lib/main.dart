import 'package:flutter/material.dart';

import 'app.dart';
import 'core/api_client.dart';
import 'core/firebase_api_client.dart';
import 'core/supabase_api_client.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  // The legacy backend is an explicit development/rollback option only.
  const backend = String.fromEnvironment('BACKEND', defaultValue: 'supabase');
  final ApiClient api = switch (backend) {
    'legacy' => ApiClient(),
    'firebase' => FirebaseApiClient(),
    _ => SupabaseApiClient(),
  };
  try {
    await api.initialize();
    runApp(ManGroovesApp(api: api));
  } catch (error) {
    runApp(
      MaterialApp(
        home: Scaffold(
          appBar: AppBar(title: const Text('ManGROOVES')),
          body: Padding(
            padding: const EdgeInsets.all(24),
            child: Text(
              error is ApiException ? error.message : 'Could not open your saved session. Restart the app and try again.',
            ),
          ),
        ),
      ),
    );
  }
}
