import 'dart:convert';
import 'dart:io';

import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';

import '../core/api_client.dart';
import '../shared/list_filters.dart';

class ChecklistScreen extends StatefulWidget {
  const ChecklistScreen({super.key, required this.api});
  final ApiClient api;
  @override
  State<ChecklistScreen> createState() => _ChecklistScreenState();
}

class _ChecklistScreenState extends State<ChecklistScreen> {
  List<Map<String, dynamic>>? _criteria;
  String? _error;
  String _query = '';
  List<Map<String, dynamic>> get _filteredCriteria => (_criteria ?? [])
      .where(
        (item) => '${item['name']} ${item['question_text']}'
            .toLowerCase()
            .contains(_query.toLowerCase()),
      )
      .toList();
  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final data = await widget.api.checklist();
      if (mounted) {
        setState(() {
          _criteria = (data['criteria'] as List)
              .map((e) => Map<String, dynamic>.from(e as Map))
              .toList();
          _error = null;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(
          () => _error = e is ApiException
              ? e.message
              : 'Could not load checklist.',
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: const Text('Health checklist')),
    body: _criteria == null
        ? Center(
            child: _error == null
                ? const CircularProgressIndicator()
                : TextButton(
                    onPressed: _load,
                    child: Text('$_error Tap to retry.'),
                  ),
          )
        : RefreshIndicator(
            onRefresh: _load,
            child: ListView(
              padding: const EdgeInsets.all(16),
              children: [
                const Card(
                  child: ExpansionTile(
                    title: Text('Health scoring guide'),
                    children: [
                      Padding(
                        padding: EdgeInsets.all(16),
                        child: Text(
                          '6 Healthy | 3-5 Stressed | 0-2 At Risk\n\nLeaf color, pests, and roots add 0-2 points each. Not Sure is unscored and needs review.\n\nNone: 0. All: lowest score (0) for health; total of regular choices for context and environment. Context and environment do not change health.\n\nAdd, rename, or delete choices. Past reports stay unchanged. Keep a 0-point and a 2-point choice in each health check.',
                        ),
                      ),
                    ],
                  ),
                ),
                if (_error != null) Text(_error!),
                ListFilters(
                  hint: 'Checklist name or question',
                  onApply: (query, _) => setState(() => _query = query),
                ),
                Text('${_filteredCriteria.length} results'),
                if (_filteredCriteria.isEmpty)
                  const Text('No checklist questions match.'),
                ..._filteredCriteria.map(
                  (criterion) => Card(
                    child: ListTile(
                      title: Text('${criterion['name']}'),
                      subtitle: Text(
                        criterion['score_group'] == 'health'
                            ? 'Health: 0-2 points'
                            : 'Supporting observations',
                      ),
                      trailing: const Icon(Icons.edit_outlined),
                      onTap: () async {
                        final saved = await Navigator.push<bool>(
                          context,
                          MaterialPageRoute(
                            builder: (_) => _ChecklistEditor(
                              api: widget.api,
                              criterion: criterion,
                            ),
                          ),
                        );
                        if (saved == true) await _load();
                      },
                    ),
                  ),
                ),
              ],
            ),
          ),
  );
}

class _ChecklistEditor extends StatefulWidget {
  const _ChecklistEditor({required this.api, required this.criterion});
  final ApiClient api;
  final Map<String, dynamic> criterion;
  @override
  State<_ChecklistEditor> createState() => _ChecklistEditorState();
}

class _ChecklistEditorState extends State<_ChecklistEditor> {
  final _form = GlobalKey<FormState>();
  final _scroll = ScrollController();
  int _nextId = -1;

  @override
  void dispose() {
    _scroll.dispose();
    super.dispose();
  }

  Map<String, String> get _missingSpecials => Map.fromEntries(
    const {
      'unknown': 'Not Sure',
      'all_of_the_above': 'All of the above',
      'none_of_the_above': 'None of the above',
    }.entries.where(
      (entry) =>
          (entry.key != 'none_of_the_above' ||
              _data['selection_mode'] == 'multiple') &&
          !_options.any(
            (option) =>
                option['delete'] != true &&
                (option['code'] ?? option['kind']) == entry.key,
          ),
    ),
  );

  void _addChoice({String kind = 'standard'}) {
    if (_options.where((o) => o['delete'] != true).length >= 30) {
      setState(() => _error = 'Use up to 30 choices.');
      return;
    }
    setState(() {
      _options.add({
        'id': _nextId--,
        'code': kind,
        'kind': kind,
        'label':
            const {
              'unknown': 'Not Sure',
              'all_of_the_above': 'All of the above',
              'none_of_the_above': 'None of the above',
            }[kind] ??
            '',
        'points': 0,
        'image_path': null,
      });
      _dirty = true;
      _error = null;
    });
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted && _scroll.hasClients) {
        _scroll.animateTo(
          _scroll.position.maxScrollExtent,
          duration: const Duration(milliseconds: 250),
          curve: Curves.easeOut,
        );
      }
    });
  }

  late final Map<String, dynamic> _data = jsonDecode(
    jsonEncode(widget.criterion),
  );
  final Map<String, String> _images = {};
  bool _busy = false, _dirty = false;
  String? _error;
  List<dynamic> get _options => _data['options'] as List;
  Future<void> _pick(String key) async {
    try {
      final image = await ImagePicker().pickImage(
        source: ImageSource.gallery,
        maxWidth: 2400,
        maxHeight: 2400,
        imageQuality: 90,
      );
      if (image != null && mounted) {
        setState(() {
          _images[key] = image.path;
          _dirty = true;
        });
      }
    } catch (_) {
      if (mounted) setState(() => _error = 'Could not open photos. Try again.');
    }
  }

  Future<bool> _leave() async {
    if (_busy) return false;
    if (!_dirty) return true;
    return await showDialog<bool>(
          context: context,
          builder: (dialog) => AlertDialog(
            title: const Text('Discard changes?'),
            actions: [
              TextButton(
                onPressed: () => Navigator.pop(dialog, false),
                child: const Text('Keep editing'),
              ),
              FilledButton(
                onPressed: () => Navigator.pop(dialog, true),
                child: const Text('Discard'),
              ),
            ],
          ),
        ) ==
        true;
  }

  Future<void> _save() async {
    if (!_form.currentState!.validate() || _busy) return;
    final confirm = await showDialog<bool>(
      context: context,
      builder: (dialog) => AlertDialog(
        title: const Text('Save checklist?'),
        content: const Text(
          'Save added, edited, and deleted choices? Past reports stay unchanged.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(dialog, false),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(dialog, true),
            child: const Text('Save'),
          ),
        ],
      ),
    );
    if (confirm != true || !mounted) return;
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final images = Map<String, String>.from(_images);
      for (final option in _options.where((o) => o['delete'] == true)) {
        images.remove('option_image_${option['id']}');
      }
      await widget.api.saveChecklist(_data, images);
      if (!mounted) return;
      setState(() {
        _busy = false;
        _dirty = false;
      });
      ScaffoldMessenger.of(context)
          .showSnackBar(const SnackBar(content: Text('Checklist saved.')));
      Navigator.pop(context, true);
    } catch (e) {
      if (mounted) {
        setState(
          () => _error = e is ApiException
              ? e.message
              : 'Could not save. Try again.',
        );
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Widget _photo(
    String key,
    String? existing,
    Map<String, dynamic> target,
    String removeKey,
  ) {
    final local = _images[key];
    final hasPhoto =
        local != null || (existing != null && target[removeKey] != true);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        if (hasPhoto)
          Padding(
            padding: const EdgeInsets.only(top: 8),
            child: local != null
                ? Image.file(File(local), height: 120, fit: BoxFit.contain)
                : Image.network(
                    widget.api.resolve('../assets/$existing').toString(),
                    height: 120,
                    fit: BoxFit.contain,
                    errorBuilder: (_, _, _) => const Text('Photo unavailable.'),
                  ),
          ),
        Wrap(
          spacing: 8,
          children: [
            TextButton.icon(
              onPressed: _busy ? null : () => _pick(key),
              icon: const Icon(Icons.photo_library_outlined),
              label: Text(
                key == 'guide_image'
                    ? 'Change guide photo'
                    : 'Change choice photo',
              ),
            ),
            if (hasPhoto)
              TextButton(
                onPressed: _busy
                    ? null
                    : () => setState(() {
                        _images.remove(key);
                        target[removeKey] = true;
                        _dirty = true;
                      }),
                child: const Text('Remove photo'),
              ),
          ],
        ),
      ],
    );
  }

  @override
  Widget build(BuildContext context) => PopScope(
    canPop: !_busy && !_dirty,
    onPopInvokedWithResult: (didPop, _) async {
      if (!didPop && await _leave() && context.mounted) {
        setState(() => _dirty = false);
        Navigator.pop(context);
      }
    },
    child: Scaffold(
      appBar: AppBar(title: Text('${widget.criterion['name']}')),
      bottomNavigationBar: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Wrap(
            spacing: 12,
            runSpacing: 8,
            alignment: WrapAlignment.end,
            children: [
              OutlinedButton.icon(
                onPressed: _busy ? null : _addChoice,
                icon: const Icon(Icons.add),
                label: const Text('Add choice'),
              ),
              if (_missingSpecials.isNotEmpty)
                PopupMenuButton<String>(
                  tooltip: 'Restore a special choice',
                  enabled: !_busy,
                  onSelected: (kind) => _addChoice(kind: kind),
                  itemBuilder: (_) => _missingSpecials.entries
                      .map(
                        (entry) => PopupMenuItem(
                          value: entry.key,
                          child: Text('Add ${entry.value}'),
                        ),
                      )
                      .toList(),
                  icon: const Icon(Icons.more_horiz),
                ),
              FilledButton(
                onPressed: _busy ? null : _save,
                child: Text(_busy ? 'Saving...' : 'Save checklist'),
              ),
            ],
          ),
        ),
      ),
      body: Form(
        key: _form,
        child: ListView(
          controller: _scroll,
          padding: const EdgeInsets.all(16),
          children: [
            if (_error != null)
              Padding(
                padding: const EdgeInsets.only(bottom: 12),
                child: Text(_error!, style: const TextStyle(color: Colors.red)),
              ),
            TextFormField(
              initialValue: '${_data['name']}',
              enabled: !_busy,
              maxLength: 120,
              decoration: const InputDecoration(labelText: 'Name'),
              validator: (v) =>
                  v == null || v.trim().isEmpty ? 'Enter a name.' : null,
              onChanged: (v) {
                _data['name'] = v;
                setState(() => _dirty = true);
              },
            ),
            const SizedBox(height: 12),
            TextFormField(
              initialValue: '${_data['question_text']}',
              enabled: !_busy,
              maxLength: 255,
              maxLines: 2,
              decoration: const InputDecoration(labelText: 'Question'),
              validator: (v) =>
                  v == null || v.trim().isEmpty ? 'Enter a question.' : null,
              onChanged: (v) {
                _data['question_text'] = v;
                setState(() => _dirty = true);
              },
            ),
            _photo(
              'guide_image',
              _data['guide_image'] as String?,
              _data,
              'remove_guide',
            ),
            const Text('JPG, PNG, or WebP. Up to 5 MB.'),
            const SizedBox(height: 16),
            ..._options.map((raw) {
              final option = raw as Map<String, dynamic>;
              final reserved = [
                'unknown',
                'none_of_the_above',
                'all_of_the_above',
              ].contains(option['code']);
              if (option['delete'] == true) {
                return Card(
                  key: ValueKey(option['id']),
                  child: ListTile(
                    title: Text('${option['label']}'),
                    subtitle: const Text('Will be deleted on save'),
                    trailing: TextButton(
                      onPressed: _busy
                          ? null
                          : () => setState(() {
                              option['delete'] = false;
                              _dirty = true;
                            }),
                      child: const Text('Undo delete'),
                    ),
                  ),
                );
              }
              return Card(
                key: ValueKey(option['id']),
                margin: const EdgeInsets.only(bottom: 12),
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      Align(
                        alignment: Alignment.centerRight,
                        child: TextButton.icon(
                          onPressed: _busy
                              ? null
                              : () => setState(() {
                                  if ((option['id'] as int) < 0) {
                                    _images.remove(
                                      'option_image_${option['id']}',
                                    );
                                    _options.remove(option);
                                  } else {
                                    option['delete'] = true;
                                  }
                                  _dirty = true;
                                }),
                          icon: const Icon(Icons.delete_outline),
                          label: const Text('Delete choice'),
                        ),
                      ),
                      TextFormField(
                        initialValue: '${option['label']}',
                        key: ValueKey(
                          '${option['id']}-${option['kind'] ?? option['code']}',
                        ),
                        enabled: !_busy,
                        maxLength: 190,
                        decoration: const InputDecoration(labelText: 'Choice'),
                        validator: (v) => v == null || v.trim().isEmpty
                            ? 'Enter a choice.'
                            : null,
                        onChanged: (v) {
                          option['label'] = v;
                          setState(() => _dirty = true);
                        },
                      ),
                      if (reserved)
                        Text(
                          option['code'] == 'unknown'
                              ? 'Not Sure rule: unscored; needs review.'
                              : option['code'] == 'all_of_the_above'
                              ? (_data['score_group'] == 'health'
                                    ? 'All choices rule: lowest score (0).'
                                    : 'All choices rule: totals regular choices.')
                              : 'Adds 0 points.',
                        )
                      else
                        DropdownButtonFormField<int>(
                          initialValue: option['points'] as int,
                          decoration: const InputDecoration(
                            labelText: 'Points',
                          ),
                          items:
                              [
                                    if (_data['score_group'] != 'health') ...[
                                      -2,
                                      -1,
                                    ],
                                    0,
                                    1,
                                    2,
                                  ]
                                  .map(
                                    (n) => DropdownMenuItem(
                                      value: n,
                                      child: Text('$n'),
                                    ),
                                  )
                                  .toList(),
                          onChanged: _busy
                              ? null
                              : (v) => setState(() {
                                  option['points'] = v;
                                  _dirty = true;
                                }),
                        ),
                      _photo(
                        'option_image_${option['id']}',
                        option['image_path'] as String?,
                        option,
                        'remove_image',
                      ),
                    ],
                  ),
                ),
              );
            }),
          ],
        ),
      ),
    ),
  );
}
