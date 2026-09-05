import 'package:flutter/material.dart';

import 'app.dart';
import 'core/api_client.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  final api = ApiClient();
  await api.initialize();
  runApp(ManGroovesApp(api: api));
}
