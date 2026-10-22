import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mangrooves_mobile/shared/residential_address_fields.dart';
import 'package:mangrooves_mobile/shared/barangay_picker.dart';

void main() {
  testWidgets(
    'residential address keeps optional parts and clears incompatible barangay when city changes',
    (tester) async {
      tester.view.physicalSize = const Size(320, 900);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);
      final house = TextEditingController(text: 'Unit 3B'),
          street = TextEditingController(),
          zip = TextEditingController(text: '6000');
      final form = GlobalKey<FormState>();
      int? selected = 1;
      final barangays = [
        {'id': 1, 'name': 'Poblacion', 'city_municipality': 'Cebu City'},
        {'id': 2, 'name': 'Poblacion', 'city_municipality': 'Danao City'},
      ];
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: StatefulBuilder(
              builder: (context, update) => SingleChildScrollView(
                child: Form(
                  key: form,
                  child: ResidentialAddressFields(
                    barangays: barangays,
                    barangayId: selected,
                    onBarangayChanged: (v) => update(() => selected = v),
                    house: house,
                    street: street,
                    zip: zip,
                  ),
                ),
              ),
            ),
          ),
        ),
      );
      expect(form.currentState!.validate(), true);
      await tester.pump();
      await tester.tap(find.byType(DropdownButtonFormField<String>));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Danao City').last);
      await tester.pumpAndSettle();
      expect(selected, isNull);
      expect(form.currentState!.validate(), false);
      await tester.ensureVisible(find.byType(BarangayPicker));
      await tester.tap(find.byType(BarangayPicker));
      await tester.pumpAndSettle();
      expect(find.text('Cebu City, Cebu'), findsNothing);
      expect(find.text('Danao City, Cebu'), findsOneWidget);
      await tester.tap(find.text('Poblacion').last);
      await tester.pumpAndSettle();
      expect(selected, 2);
      expect(house.text, 'Unit 3B');
      zip.text = '60x0';
      expect(form.currentState!.validate(), false);
      zip.clear();
      expect(form.currentState!.validate(), true);
      expect(tester.takeException(), isNull);
      await tester.pumpWidget(const SizedBox.shrink());
      house.dispose();
      street.dispose();
      zip.dispose();
    },
  );
  test(
    'address display omits empty parts and preserves unsplit legacy text',
    () {
      expect(
        formatResidentialAddress({
          'house_unit': 'Unit 3B',
          'street_sitio': null,
          'barangay_name': 'Inayawan',
          'city_municipality': 'Cebu City',
          'province': 'Cebu',
          'zip_code': '6000',
        }),
        'Unit 3B, Inayawan, Cebu City, Cebu 6000',
      );
      expect(
        formatResidentialAddress({
          'address_line': 'Original address',
          'province': 'Cebu',
        }),
        'Original address, Cebu',
      );
    },
  );
}
