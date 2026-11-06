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
  String? _province;
  String? _city;
  String cityOf(Map b) => '${b['city_municipality'] ?? 'Cebu City'}';
  String provinceOf(Map b) => '${b['province'] ?? 'Cebu'}';
  void syncAddress() {
    final b = widget.barangays
        .where((b) => b['id'] == widget.barangayId)
        .firstOrNull;
    if (b != null) {
      _province = provinceOf(b);
      _city = cityOf(b);
    } else if (_province == null) {
      final provinces = widget.barangays.map(provinceOf).toSet();
      if (provinces.length == 1) _province = provinces.single;
    }
  }

  @override
  void initState() {
    super.initState();
    syncAddress();
  }

  @override
  void didUpdateWidget(covariant ResidentialAddressFields oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.barangayId != widget.barangayId ||
        oldWidget.barangays != widget.barangays) {
      syncAddress();
    }
  }

  @override
  Widget build(BuildContext context) {
    final provinces = widget.barangays.map(provinceOf).toSet().toList()..sort();
    final cities =
        widget.barangays
            .where((b) => provinceOf(b) == _province)
            .map(cityOf)
            .toSet()
            .toList()
          ..sort();
    final rows = widget.barangays
        .where((b) => provinceOf(b) == _province && cityOf(b) == _city)
        .toList();
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
          key: ValueKey('province-$_province'),
          initialValue: provinces.contains(_province) ? _province : null,
          isExpanded: true,
          decoration: const InputDecoration(labelText: 'Province / region'),
          items: provinces
              .map((p) => DropdownMenuItem(value: p, child: Text(p)))
              .toList(),
          validator: (v) =>
              v == null ? 'Choose your province or region.' : null,
          onChanged: widget.enabled
              ? (v) {
                  setState(() {
                    _province = v;
                    _city = null;
                  });
                  widget.onBarangayChanged(null);
                }
              : null,
        ),
        const SizedBox(height: 16),
        DropdownButtonFormField<String>(
          key: ValueKey('city-$_province-$_city'),
          initialValue: cities.contains(_city) ? _city : null,
          isExpanded: true,
          decoration: const InputDecoration(labelText: 'City / municipality'),
          items: cities
              .map((c) => DropdownMenuItem(value: c, child: Text(c)))
              .toList(),
          validator: (v) =>
              v == null ? 'Choose your city or municipality.' : null,
          onChanged: widget.enabled && _province != null
              ? (v) {
                  setState(() => _city = v);
                  widget.onBarangayChanged(null);
                }
              : null,
        ),
        const SizedBox(height: 16),
        BarangayPicker(
          scopedToCity: true,
          items: rows,
          value: widget.barangayId,
          onChanged: widget.onBarangayChanged,
          enabled: widget.enabled && _province != null && _city != null,
        ),
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
