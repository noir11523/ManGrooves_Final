import 'package:flutter/material.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

final appTheme = ValueNotifier<String>('light');
const themeStorage = FlutterSecureStorage();
Future<void> loadAppTheme() async {
  try {
    final value = await themeStorage.read(key: 'appearance');
    if (['light', 'dark', 'silver', 'gold'].contains(value)) {
      appTheme.value = value!;
    }
  } catch (_) {
    /* Keep the default if device storage is unavailable. */
  }
}

Future<void> setAppTheme(String value) async {
  if (!['light', 'dark', 'silver', 'gold'].contains(value)) return;
  appTheme.value = value;
  try {
    await themeStorage.write(key: 'appearance', value: value);
  } catch (_) {
    /* The chosen theme still applies during this session. */
  }
}

class ThemePicker extends StatelessWidget {
  const ThemePicker({super.key});
  @override
  Widget build(BuildContext context) => Card(
    child: Padding(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Theme', style: Theme.of(context).textTheme.titleLarge),
          ValueListenableBuilder<String>(
            valueListenable: appTheme,
            builder: (context, value, _) => Wrap(
              spacing: 8,
              children: [
                for (final theme in ['light', 'dark', 'silver', 'gold'])
                  ChoiceChip(
                    label: Text(theme[0].toUpperCase() + theme.substring(1)),
                    selected: value == theme,
                    onSelected: (_) => setAppTheme(theme),
                  ),
              ],
            ),
          ),
        ],
      ),
    ),
  );
}
