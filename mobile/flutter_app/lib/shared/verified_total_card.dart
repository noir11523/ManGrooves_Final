import 'package:flutter/material.dart';

class VerifiedTotalCard extends StatelessWidget {
  const VerifiedTotalCard({
    super.key,
    required this.value,
    this.onTap,
    this.columns,
    this.spacing = 8,
  });
  final Object value;
  final VoidCallback? onTap;
  final int? columns;
  final double spacing;

  @override
  Widget build(BuildContext context) => LayoutBuilder(
    builder: (context, constraints) {
      final count =
          columns ?? (MediaQuery.textScalerOf(context).scale(16) > 22 ? 1 : 2);
      return Center(
        child: SizedBox(
          width: (constraints.maxWidth - spacing * (count - 1)) / count,
          child: Card(
            color: Theme.of(context).colorScheme.surfaceContainerHighest,
            clipBehavior: Clip.antiAlias,
            child: InkWell(
              onTap: onTap,
              child: Padding(
                padding: const EdgeInsets.all(14),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(
                      Icons.verified_outlined,
                      color: Theme.of(context).colorScheme.primary,
                    ),
                    const SizedBox(height: 8),
                    Text(
                      '$value',
                      textAlign: TextAlign.center,
                      style: Theme.of(context).textTheme.headlineSmall
                          ?.copyWith(
                            fontWeight: FontWeight.w800,
                            color: Theme.of(context).colorScheme.primary,
                          ),
                    ),
                    const SizedBox(height: 4),
                    Text('Total Verified Reports', textAlign: TextAlign.center),
                  ],
                ),
              ),
            ),
          ),
        ),
      );
    },
  );
}
