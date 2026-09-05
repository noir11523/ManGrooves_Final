import 'package:flutter/material.dart';

import 'core/api_client.dart';
import 'screens/auth_gate.dart';

class ManGroovesApp extends StatelessWidget {
  const ManGroovesApp({super.key, required this.api});

  final ApiClient api;

  @override
  Widget build(BuildContext context) {
    const forest = Color(0xFF245B2B);
    const sand = Color(0xFFF6F2E9);
    return MaterialApp(
      title: 'ManGROOVES',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        useMaterial3: true,
        colorScheme: ColorScheme.fromSeed(
          seedColor: forest,
          primary: forest,
          surface: sand,
        ),
        scaffoldBackgroundColor: const Color(0xFFFAF9F5),
        appBarTheme: const AppBarTheme(
          backgroundColor: Color(0xFFFAF9F5),
          foregroundColor: Color(0xFF203522),
          elevation: 0,
          centerTitle: false,
        ),
        cardTheme: const CardThemeData(
          elevation: 0,
          color: Colors.white,
          margin: EdgeInsets.zero,
        ),
        inputDecorationTheme: InputDecorationTheme(
          filled: true,
          fillColor: Colors.white,
          border: OutlineInputBorder(borderRadius: BorderRadius.circular(14)),
          enabledBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(14),
            borderSide: const BorderSide(color: Color(0xFFD7DDD4)),
          ),
        ),
        filledButtonTheme: FilledButtonThemeData(
          style: FilledButton.styleFrom(
            minimumSize: const Size.fromHeight(52),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(14),
            ),
          ),
        ),
      ),
      home: AuthGate(api: api),
    );
  }
}
