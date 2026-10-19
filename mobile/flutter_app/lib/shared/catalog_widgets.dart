import 'package:flutter/material.dart';

/// Both catalog routes use the same selected-state and touch targets.
class CatalogTabs extends StatelessWidget implements PreferredSizeWidget {
  const CatalogTabs({
    super.key,
    required this.selected,
    required this.onSelected,
    required this.textScaler,
  });
  final String selected;
  final ValueChanged<String> onSelected;
  final TextScaler textScaler;

  @override
  Size get preferredSize => Size.fromHeight(
    (textScaler.scale(16) * 1.5 + 28).clamp(52, double.infinity) + 20,
  );

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.fromLTRB(16, 4, 16, 16),
    child: Row(
      children: [
        for (final entry in const {
          'species': 'Species',
          'sites': 'Sites',
        }.entries) ...[
          if (entry.key == 'sites') const SizedBox(width: 12),
          Expanded(
            child: Semantics(
              selected: selected == entry.key,
              child: SizedBox(
                height: preferredSize.height - 20,
                child: selected == entry.key
                    ? FilledButton(onPressed: () {}, child: Text(entry.value))
                    : OutlinedButton(
                        onPressed: () => onSelected(entry.key),
                        child: Text(entry.value),
                      ),
              ),
            ),
          ),
        ],
      ],
    ),
  );
}

class CatalogStatus extends StatelessWidget {
  const CatalogStatus(this.label, {super.key, this.attention = false});
  final String label;
  final bool attention;

  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
    decoration: BoxDecoration(
      color: attention
          ? const Color(0xFFFFF0D6)
          : label == 'Active'
          ? const Color(0xFFE8F1E5)
          : const Color(0xFFEEF0ED),
      borderRadius: BorderRadius.circular(10),
    ),
    child: Text(
      label,
      style: TextStyle(
        color: attention
            ? const Color(0xFF795014)
            : label == 'Active'
            ? const Color(0xFF245B2B)
            : const Color(0xFF465047),
        fontSize: 13,
        fontWeight: FontWeight.w600,
      ),
    ),
  );
}

class CatalogDetail extends StatelessWidget {
  const CatalogDetail(this.label, this.value, {super.key});
  final String label, value;

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.only(bottom: 6),
    child: Text.rich(
      TextSpan(
        children: [
          TextSpan(
            text: '$label: ',
            style: const TextStyle(fontWeight: FontWeight.w600),
          ),
          TextSpan(text: value.trim().isEmpty ? 'Not specified' : value),
        ],
      ),
    ),
  );
}
