import 'package:flutter/material.dart';

class SpeciesNames extends StatelessWidget {
  const SpeciesNames(this.species, {super.key});
  final Map? species;
  @override
  Widget build(BuildContext context) {
    final local = species?['local_name'] ?? species?['species_local_name'];
    final common = species?['common_name'] ?? species?['species_common_name'];
    final scientific =
        species?['scientific_name'] ??
        species?['species_name'] ??
        species?['final_species_name'] ??
        species?['suggested_species_name'];
    final names = [
      local,
      common,
      scientific,
    ].where((v) => v != null && '$v'.trim().isNotEmpty).toList();
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (names.isEmpty) const Text('Needs identification'),
        for (var i = 0; i < names.length; i++)
          Padding(
            padding: EdgeInsets.only(top: i == 0 ? 0 : 4),
            child: Text(
              '${names[i]}',
              style: TextStyle(
                fontSize: i == 0 ? 18 : 15,
                height: 1.4,
                fontWeight: i == 0 ? FontWeight.bold : FontWeight.normal,
                fontStyle: names[i] == scientific
                    ? FontStyle.italic
                    : FontStyle.normal,
                color: i == 0 ? const Color(0xFF285D30) : null,
              ),
            ),
          ),
      ],
    );
  }
}
