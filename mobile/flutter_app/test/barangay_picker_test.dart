import 'dart:convert';
import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mangrooves_mobile/shared/barangay_picker.dart';

void main() {
  testWidgets(
    'Cebu search distinguishes duplicate barangays and fits above the keyboard',
    (tester) async {
      final rows = (jsonDecode(
        File('../../supabase/functions/api/data/cebu-barangays.json')
            .readAsStringSync(),
      ) as List).map((b) => Map<String, dynamic>.from(b as Map)).toList();
      tester.view.devicePixelRatio = 1;
      tester.view.physicalSize = const Size(320, 640);
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);
      int? selected;
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: Padding(
              padding: const EdgeInsets.all(16),
              child: BarangayPicker(
                items: rows,
                value: null,
                onChanged: (v) => selected = v,
              ),
            ),
          ),
        ),
      );
      await tester.tap(find.text('Choose your barangay'));
      await tester.pumpAndSettle();
      tester.view.viewInsets = const FakeViewPadding(bottom: 260);
      addTearDown(tester.view.resetViewInsets);
      await tester.pumpAndSettle();
      await tester.enterText(find.byType(TextField), 'Poblacion');
      await tester.pumpAndSettle();
      final matches = rows
          .where((b) => barangayLabel(b).toLowerCase().contains('poblacion'))
          .length;
      expect(matches, greaterThan(1));
      expect(find.text('$matches barangays in Cebu'), findsOneWidget);
      await tester.enterText(find.byType(TextField), 'Poblacion Argao');
      await tester.pumpAndSettle();
      expect(find.text('Argao, Cebu'), findsOneWidget);
      await tester.tap(find.text('Poblacion'));
      await tester.pumpAndSettle();
      expect(
        rows.singleWhere((b) => b['id'] == selected)['city_municipality'],
        'Argao',
      );
      expect(tester.takeException(), isNull);
    },
  );
}
