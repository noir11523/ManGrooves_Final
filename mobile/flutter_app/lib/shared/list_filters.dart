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
    this.dates = false,
    this.onDatesChanged,
  });
  final String hint;
  final String? filterLabel;
  final Map<String, String> options;
  final bool busy;
  final bool dates;
  final void Function(String from, String to)? onDatesChanged;
  final void Function(String search, String filter) onApply;
  @override
  State<ListFilters> createState() => _ListFiltersState();
}

class _ListFiltersState extends State<ListFilters>
    with AutomaticKeepAliveClientMixin {
  final _search = TextEditingController();
  String _filter = '';
  bool _applied = false;
  DateTime? _from, _to;
  String? _dateError;
  String _date(DateTime? value) =>
      value == null ? '' : value.toIso8601String().substring(0, 10);
  Future<void> _pick(bool from) async {
    final value = await showDatePicker(
      context: context,
      initialDate: (from ? _from : _to) ?? DateTime.now(),
      firstDate: DateTime(2000),
      lastDate: DateTime(2100),
    );
    if (value != null && mounted) {
      setState(() {
        if (from) {
          _from = value;
        } else {
          _to = value;
        }
        _dateError = null;
      });
    }
  }

  @override
  bool get wantKeepAlive => true;
  @override
  void dispose() {
    _search.dispose();
    super.dispose();
  }

  void _apply() {
    if (widget.busy) return;
    if (_from != null && _to != null && _from!.isAfter(_to!)) {
      setState(() => _dateError = 'From must be on or before To.');
      return;
    }
    FocusScope.of(context).unfocus();
    setState(
      () => _applied =
          _search.text.trim().isNotEmpty ||
          _filter.isNotEmpty ||
          _from != null ||
          _to != null,
    );
    widget.onDatesChanged?.call(_date(_from), _date(_to));
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
            if (widget.dates) ...[
              const SizedBox(height: 12),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  OutlinedButton.icon(
                    onPressed: widget.busy ? null : () => _pick(true),
                    icon: const Icon(Icons.date_range, size: 18),
                    label: Text(
                      _from == null ? 'From' : 'From ${_date(_from)}',
                    ),
                  ),
                  OutlinedButton.icon(
                    onPressed: widget.busy ? null : () => _pick(false),
                    icon: const Icon(Icons.date_range, size: 18),
                    label: Text(_to == null ? 'To' : 'To ${_date(_to)}'),
                  ),
                ],
              ),
              if (_dateError != null)
                Text(
                  _dateError!,
                  style: TextStyle(color: Theme.of(context).colorScheme.error),
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
                              _from = null;
                              _to = null;
                              _dateError = null;
                            });
                            widget.onDatesChanged?.call('', '');
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
