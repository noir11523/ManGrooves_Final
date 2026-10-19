import 'package:flutter/material.dart';

import 'photo_credit.dart';

/// A picture can be inspected without changing the report's saved answer.
class ObservationChoice extends StatelessWidget {
  const ObservationChoice({
    super.key,
    required this.label,
    required this.selected,
    required this.thumbnail,
    required this.picture,
    required this.onToggle,
    this.selectionKey,
    this.hasPhoto = true,
    this.photoCredit,
  });

  final String label;
  final bool selected;
  final Widget thumbnail;
  final Widget picture;
  final VoidCallback onToggle;
  final Key? selectionKey;
  final bool hasPhoto;
  final Map? photoCredit;

  void _preview(BuildContext context) {
    showDialog<void>(
      context: context,
      builder: (dialogContext) {
        final screen = MediaQuery.sizeOf(dialogContext);
        return Dialog(
          backgroundColor: Colors.white,
          insetPadding: const EdgeInsets.symmetric(
            horizontal: 12,
            vertical: 20,
          ),
          child: ConstrainedBox(
            constraints: BoxConstraints(
              maxWidth: 1000,
              maxHeight: screen.height * .92,
            ),
            child: Padding(
              padding: const EdgeInsets.all(12),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Flexible(
                    child: SingleChildScrollView(
                      child: Column(
                        children: [
                          SizedBox(
                            height: (screen.height * .55).clamp(0.0, 600.0),
                            width: double.infinity,
                            child: _EnlargedPicture(child: picture),
                          ),
                          const SizedBox(height: 16),
                          Text(
                            label,
                            textAlign: TextAlign.center,
                            style: Theme.of(context).textTheme.titleLarge
                                ?.copyWith(fontWeight: FontWeight.w700),
                          ),
                          const SizedBox(height: 8),
                          PhotoCredit(credit: photoCredit),
                          const Text(
                            'Pinch to zoom. Drag to move.',
                            textAlign: TextAlign.center,
                          ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 20),
                  Row(
                    children: [
                      Expanded(
                        child: OutlinedButton(
                          style: OutlinedButton.styleFrom(
                            minimumSize: const Size(0, 52),
                            padding: const EdgeInsets.symmetric(
                              horizontal: 8,
                              vertical: 12,
                            ),
                          ),
                          onPressed: () => Navigator.pop(dialogContext),
                          child: const Text(
                            'Close',
                            textAlign: TextAlign.center,
                          ),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: FilledButton(
                          style: FilledButton.styleFrom(
                            minimumSize: const Size(0, 52),
                            padding: const EdgeInsets.symmetric(
                              horizontal: 8,
                              vertical: 12,
                            ),
                          ),
                          onPressed: () {
                            onToggle();
                            Navigator.pop(dialogContext);
                          },
                          child: Text(
                            selected ? 'Deselect' : 'Select',
                            textAlign: TextAlign.center,
                          ),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) => Semantics(
    key: selectionKey,
    selected: selected,
    child: Material(
      color: selected ? const Color(0xFFE0EFD8) : Colors.white,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(14),
        side: BorderSide(
          color: selected ? const Color(0xFF285D30) : const Color(0xFFCED8C8),
          width: selected ? 2 : 1,
        ),
      ),
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            if (hasPhoto)
              Semantics(
                button: true,
                label: 'Preview $label',
                excludeSemantics: true,
                onTap: () => _preview(context),
                child: InkWell(
                  onTap: () => _preview(context),
                  borderRadius: BorderRadius.circular(12),
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(12),
                    child: SizedBox(height: 200, child: thumbnail),
                  ),
                ),
              ),
            if (hasPhoto) const SizedBox(height: 12),
            InkWell(
              onTap: onToggle,
              child: Padding(
                padding: const EdgeInsets.symmetric(vertical: 8),
                child: Text(
                  label,
                  textAlign: TextAlign.center,
                  style: const TextStyle(
                    fontSize: 18,
                    height: 1.4,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
            ),
            const SizedBox(height: 8),
            if (hasPhoto) PhotoCredit(credit: photoCredit),
            Center(
              child: IconButton(
                key: ValueKey('choice-circle-$label'),
                tooltip: '${selected ? 'Deselect' : 'Select'} $label',
                onPressed: onToggle,
                isSelected: selected,
                color: Theme.of(context).colorScheme.primary,
                iconSize: 28,
                icon: const Icon(Icons.radio_button_unchecked),
                selectedIcon: const Icon(Icons.check_circle),
              ),
            ),
          ],
        ),
      ),
    ),
  );
}

class _EnlargedPicture extends StatefulWidget {
  const _EnlargedPicture({required this.child});
  final Widget child;

  @override
  State<_EnlargedPicture> createState() => _EnlargedPictureState();
}

class _EnlargedPictureState extends State<_EnlargedPicture> {
  final _transform = TransformationController();
  Size? _viewport;

  @override
  void dispose() {
    _transform.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => LayoutBuilder(
    builder: (context, space) {
      final size = Size(space.maxWidth, space.maxHeight);
      if (_viewport != size) {
        _viewport = size;
        // Enlarge the actual picture, centered in the preview. Pinching out
        // returns to the entire picture; panning reveals its edges.
        _transform.value = Matrix4.identity()
          ..setEntry(0, 0, 1.4)
          ..setEntry(1, 1, 1.4)
          ..setEntry(0, 3, -size.width * .2)
          ..setEntry(1, 3, -size.height * .2);
      }
      return InteractiveViewer(
        transformationController: _transform,
        minScale: 1,
        maxScale: 5,
        child: SizedBox.expand(child: widget.child),
      );
    },
  );
}
