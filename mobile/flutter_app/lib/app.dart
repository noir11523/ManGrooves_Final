import 'package:flutter/material.dart';

import 'core/api_client.dart';
import 'core/app_theme.dart';
import 'screens/auth_gate.dart';

class ManGroovesApp extends StatelessWidget {
  const ManGroovesApp({super.key, required this.api});

  final ApiClient api;

  @override
  Widget build(BuildContext context) {
    return ValueListenableBuilder<String>(
      valueListenable: appTheme,
      builder: (context, appearance, _) => buildThemedApp(context, appearance),
    );
  }

  MaterialApp buildThemedApp(BuildContext context, String appearance) {
    final forest = appearance == 'gold'
        ? const Color(0xFF71551D)
        : appearance == 'silver'
        ? const Color(0xFF375A64)
        : const Color(0xFF245B2B);
    const sand = Color(0xFFF6F2E9);
    return MaterialApp(
      title: 'ManGROOVES',
      debugShowCheckedModeBanner: false,
      themeMode: appearance == 'dark' ? ThemeMode.dark : ThemeMode.light,
      darkTheme: ThemeData(
        useMaterial3: true,
        brightness: Brightness.dark,
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(0xFFA6D3A0),
          brightness: Brightness.dark,
        ),
        scaffoldBackgroundColor: const Color(0xFF17231C),
      ),
      theme: ThemeData(
        useMaterial3: true,
        textTheme: const TextTheme(
          bodyMedium: TextStyle(fontSize: 16, height: 1.45),
          bodyLarge: TextStyle(fontSize: 17, height: 1.45),
          titleMedium: TextStyle(fontSize: 18, fontWeight: FontWeight.w600),
          labelLarge: TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
        ),
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
          scrolledUnderElevation: 0,
          centerTitle: false,
        ),
        cardTheme: const CardThemeData(
          elevation: 0,
          color: Colors.white,
          margin: EdgeInsets.zero,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.all(Radius.circular(16)),
            side: BorderSide(color: Color(0xFFDCE4D9)),
          ),
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
            minimumSize: const Size(132, 52),
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
            textStyle: const TextStyle(
              fontSize: 15,
              fontWeight: FontWeight.w700,
            ),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(14),
            ),
          ),
        ),
        outlinedButtonTheme: OutlinedButtonThemeData(
          style: OutlinedButton.styleFrom(
            minimumSize: const Size(48, 48),
            padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 12),
            textStyle: const TextStyle(
              fontSize: 15,
              fontWeight: FontWeight.w600,
            ),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(14),
            ),
          ),
        ),
        textButtonTheme: TextButtonThemeData(
          style: TextButton.styleFrom(
            minimumSize: const Size(48, 48),
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
          ),
        ),
        iconButtonTheme: IconButtonThemeData(
          style: IconButton.styleFrom(minimumSize: const Size(48, 48)),
        ),
      ),
      home: AuthGate(api: api),
    );
  }
}
