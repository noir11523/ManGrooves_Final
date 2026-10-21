import 'package:flutter/material.dart';

String barangayLabel(Map row) => [
  row['name'],
  row['city_municipality'],
].where((v) => v != null && '$v'.isNotEmpty).join(' — ');
String? validateMobile(String? value) {
  final phone = (value ?? '').replaceAll(RegExp(r'[\s().-]'), '');
  return RegExp(r'^(09\d{9}|\+?639\d{9})$').hasMatch(phone)
      ? null
      : 'Enter a mobile number: 09171234567 or +639171234567.';
}

class BarangayPicker extends StatelessWidget {
  const BarangayPicker({
    super.key,
    required this.items,
    required this.value,
    required this.onChanged,
    this.enabled = true,
  });
  final List<Map<String, dynamic>> items;
  final int? value;
  final ValueChanged<int?> onChanged;
  final bool enabled;
  @override
  Widget build(BuildContext context) => FormField<int>(
    key: ValueKey('barangay-$value'),
    initialValue: value,
    validator: (v) =>
        items.any((b) => b['id'] == v) ? null : 'Choose your barangay.',
    builder: (state) {
      final selected = items.where((b) => b['id'] == value).firstOrNull;
      return InkWell(
        onTap: !enabled
            ? null
            : () async {
                final picked = await showModalBottomSheet<int>(
                  context: context,
                  isScrollControlled: true,
                  useSafeArea: true,
                  builder: (_) => _BarangaySheet(items: items, value: value),
                );
                if (picked != null) {
                  state.didChange(picked);
                  onChanged(picked);
                }
              },
        child: InputDecorator(
          decoration: InputDecoration(
            labelText: 'Barangay',
            errorText: state.errorText,
            enabled: enabled,
            suffixIcon: const Icon(Icons.search),
            helperText: 'Search by barangay or city/municipality.',
          ),
          child: Text(
            selected == null ? 'Choose your barangay' : barangayLabel(selected),
            maxLines: 3,
          ),
        ),
      );
    },
  );
}

class _BarangaySheet extends StatefulWidget {
  const _BarangaySheet({required this.items, required this.value});
  final List<Map<String, dynamic>> items;
  final int? value;
  @override
  State<_BarangaySheet> createState() => _BarangaySheetState();
}

class _BarangaySheetState extends State<_BarangaySheet> {
  String query = '';
  @override
  Widget build(BuildContext context) {
    final terms = query.toLowerCase().trim().split(RegExp(r'\s+'));
    final rows = widget.items
        .where(
          (b) => terms.every((t) => barangayLabel(b).toLowerCase().contains(t)),
        )
        .toList();
    return Padding(
      padding: EdgeInsets.only(bottom: MediaQuery.viewInsetsOf(context).bottom),
      child: SizedBox(
        height:
            (MediaQuery.sizeOf(context).height -
                MediaQuery.viewInsetsOf(context).bottom -
                MediaQuery.paddingOf(context).top) *
            .85,
        child: Column(
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 12, 8, 4),
              child: Row(
                children: [
                  const Expanded(
                    child: Text(
                      'Choose your barangay',
                      style: TextStyle(
                        fontSize: 20,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ),
                  IconButton(
                    onPressed: () => Navigator.pop(context),
                    icon: const Icon(Icons.close),
                    tooltip: 'Close',
                  ),
                ],
              ),
            ),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
              child: TextField(
                autofocus: true,
                onChanged: (v) => setState(() => query = v),
                decoration: const InputDecoration(
                  labelText: 'Search barangay or city/municipality',
                  prefixIcon: Icon(Icons.search),
                ),
              ),
            ),
            Padding(
              padding: const EdgeInsets.all(8),
              child: Text('${rows.length} barangays in Cebu'),
            ),
            Expanded(
              child: rows.isEmpty
                  ? const Center(
                      child: Text(
                        'No matching barangays. Try a city or municipality.',
                      ),
                    )
                  : ListView.separated(
                      itemCount: rows.length,
                      separatorBuilder: (_, _) => const Divider(height: 1),
                      itemBuilder: (_, i) {
                        final b = rows[i];
                        return ListTile(
                          title: Text('${b['name']}'),
                          subtitle: Text(
                            '${b['city_municipality'] ?? 'Cebu City'}, Cebu',
                          ),
                          selected: b['id'] == widget.value,
                          trailing: b['id'] == widget.value
                              ? const Icon(Icons.check_circle)
                              : null,
                          onTap: () => Navigator.pop(context, b['id']),
                        );
                      },
                    ),
            ),
          ],
        ),
      ),
    );
  }
}
