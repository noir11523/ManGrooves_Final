import 'package:flutter/material.dart';

/// Explicit apply keeps list refreshes from interrupting an unfinished search.
class ListFilters extends StatefulWidget {
  const ListFilters({
    super.key,
    required this.hint,
    required this.onApply,
    this.filterLabel,
    this.options = const {},
    this.busy = false,
  });
  final String hint;
  final String? filterLabel;
  final Map<String, String> options;
  final bool busy;
  final void Function(String search, String filter) onApply;
  @override
  State<ListFilters> createState() => _ListFiltersState();
}

class _ListFiltersState extends State<ListFilters>
    with AutomaticKeepAliveClientMixin {
  final _search = TextEditingController();
  String _filter = '';
  bool _applied = false;
  @override
  bool get wantKeepAlive => true;
  @override
  void dispose() {
    _search.dispose();
    super.dispose();
  }

  void _apply() {
    if (widget.busy) return;
    FocusScope.of(context).unfocus();
    setState(
      () => _applied = _search.text.trim().isNotEmpty || _filter.isNotEmpty,
    );
    widget.onApply(_search.text.trim(), _filter);
  }

  @override
  Widget build(BuildContext context) {
    super.build(context);
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            TextField(
              controller: _search,
              enabled: !widget.busy,
              maxLength: 200,
              textInputAction: TextInputAction.search,
              onSubmitted: (_) => _apply(),
              decoration: InputDecoration(
                labelText: 'Search',
                hintText: widget.hint,
                prefixIcon: const Icon(Icons.search),
                counterText: '',
              ),
            ),
            if (widget.options.isNotEmpty) ...[
              const SizedBox(height: 12),
              DropdownButtonFormField<String>(
                key: ValueKey(_filter),
                initialValue: _filter,
                isExpanded: true,
                decoration: InputDecoration(labelText: widget.filterLabel),
                items: widget.options.entries
                    .map(
                      (entry) => DropdownMenuItem(
                        value: entry.key,
                        child: Text(entry.value),
                      ),
                    )
                    .toList(),
                onChanged: widget.busy
                    ? null
                    : (value) => setState(() => _filter = value ?? ''),
              ),
            ],
            const SizedBox(height: 12),
            Wrap(
              spacing: 12,
              runSpacing: 8,
              children: [
                FilledButton(
                  onPressed: widget.busy ? null : _apply,
                  child: const Text('Apply'),
                ),
                if (_applied)
                  OutlinedButton(
                    onPressed: widget.busy
                        ? null
                        : () {
                            _search.clear();
                            setState(() {
                              _filter = '';
                              _applied = false;
                            });
                            widget.onApply('', '');
                          },
                    child: const Text('Clear'),
                  ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
