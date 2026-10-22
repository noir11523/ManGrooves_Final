import 'package:flutter/material.dart';

import 'barangay_picker.dart';

String formatResidentialAddress(Map user) => [
  if (user['house_unit'] != null || user['street_sitio'] != null) ...[
    user['house_unit'],
    user['street_sitio'],
  ] else
    user['address_line'],
  user['barangay_name'],
  user['city_municipality'],
  [
    user['province'],
    user['zip_code'],
  ].where((v) => v != null && '$v'.trim().isNotEmpty).join(' '),
].where((v) => v != null && '$v'.trim().isNotEmpty).join(', ');

class ResidentialAddressFields extends StatefulWidget {
  const ResidentialAddressFields({
    super.key,
    required this.barangays,
    required this.barangayId,
    required this.onBarangayChanged,
    required this.house,
    required this.street,
    required this.zip,
    this.enabled = true,
    this.legacyAddress,
  });
  final List<Map<String, dynamic>> barangays;
  final int? barangayId;
  final ValueChanged<int?> onBarangayChanged;
  final TextEditingController house, street, zip;
  final bool enabled;
  final String? legacyAddress;
  @override
  State<ResidentialAddressFields> createState() =>
      _ResidentialAddressFieldsState();
}

class _ResidentialAddressFieldsState extends State<ResidentialAddressFields> {
  String? _city;
  String cityOf(Map b) => '${b['city_municipality'] ?? 'Cebu City'}';
  void syncCity() {
    final b = widget.barangays
        .where((b) => b['id'] == widget.barangayId)
        .firstOrNull;
    if (b != null) _city = cityOf(b);
  }

  @override
  void initState() {
    super.initState();
    syncCity();
  }

  @override
  void didUpdateWidget(covariant ResidentialAddressFields oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.barangayId != widget.barangayId ||
        oldWidget.barangays != widget.barangays) {
      syncCity();
    }
  }

  @override
  Widget build(BuildContext context) {
    final cities = widget.barangays.map(cityOf).toSet().toList()..sort();
    final rows = widget.barangays.where((b) => cityOf(b) == _city).toList();
    Widget text(
      TextEditingController controller,
      String label,
      int max, {
      String? hint,
    }) => Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: TextFormField(
        controller: controller,
        enabled: widget.enabled,
        maxLength: max,
        decoration: InputDecoration(
          labelText: label,
          hintText: hint,
          counterText: '',
        ),
      ),
    );
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text(
          'Residential address',
          style: Theme.of(context).textTheme.titleMedium,
        ),
        const SizedBox(height: 12),
        if (widget.legacyAddress?.trim().isNotEmpty == true)
          Padding(
            padding: const EdgeInsets.only(bottom: 12),
            child: Text(
              'Previously saved: ${widget.legacyAddress}. Add the parts below if known; the original is kept.',
            ),
          ),
        text(
          widget.house,
          'House no. / unit / building (optional)',
          120,
          hint: 'For example: Unit 3B',
        ),
        text(
          widget.street,
          'Street / purok / sitio (optional)',
          200,
          hint: 'For example: Purok 3',
        ),
        DropdownButtonFormField<String>(
          key: ValueKey('city-$_city'),
          initialValue: cities.contains(_city) ? _city : null,
          isExpanded: true,
          decoration: const InputDecoration(labelText: 'City / municipality'),
          items: cities
              .map((c) => DropdownMenuItem(value: c, child: Text(c)))
              .toList(),
          validator: (v) =>
              v == null ? 'Choose your city or municipality.' : null,
          onChanged: widget.enabled
              ? (v) {
                  setState(() => _city = v);
                  widget.onBarangayChanged(null);
                }
              : null,
        ),
        const SizedBox(height: 16),
        BarangayPicker(
          items: rows,
          value: widget.barangayId,
          onChanged: widget.onBarangayChanged,
          enabled: widget.enabled && _city != null,
        ),
        const SizedBox(height: 16),
        const TextFormFieldProvince(),
        const SizedBox(height: 16),
        TextFormField(
          controller: widget.zip,
          enabled: widget.enabled,
          keyboardType: TextInputType.number,
          maxLength: 4,
          decoration: const InputDecoration(
            labelText: 'ZIP code (optional)',
            hintText: '4 digits',
            counterText: '',
          ),
          validator: (v) =>
              (v ?? '').trim().isEmpty || RegExp(r'^\d{4}$').hasMatch(v!.trim())
              ? null
              : 'Enter four digits or leave blank.',
        ),
        const SizedBox(height: 16),
      ],
    );
  }
}

class TextFormFieldProvince extends StatelessWidget {
  const TextFormFieldProvince({super.key});
  @override
  Widget build(BuildContext context) => const InputDecorator(
    decoration: InputDecoration(labelText: 'Province'),
    child: Text('Cebu'),
  );
}
