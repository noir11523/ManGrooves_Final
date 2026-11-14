import 'dart:convert';
import 'dart:io';

import 'package:flutter/material.dart';

import 'package:image_picker/image_picker.dart';

import '../core/api_client.dart';
import '../shared/list_filters.dart';
import '../shared/content_width.dart';

class ChecklistScreen extends StatefulWidget {
  const ChecklistScreen({super.key, required this.api});
  final ApiClient api;
  @override
  State<ChecklistScreen> createState() => _ChecklistScreenState();
}

class _ChecklistScreenState extends State<ChecklistScreen> {
  List<Map<String, dynamic>>? _criteria;
  Map<String, dynamic>? _traitData;
  final _imagePicker = ImagePicker();
  String? _savingTrait;
  String? _error;
  String _query = '';
  bool _matches(Iterable<Object?> values) {
    final text = values.join(' ').toLowerCase();
    return _query
        .toLowerCase()
        .trim()
        .split(RegExp(r'\s+'))
        .every(text.contains);
  }

  List<Map<String, dynamic>> get _filteredCriteria => (_criteria ?? [])
      .where(
        (item) => _matches([
          item['name'],
          item['question_text'],
          ...(item['options'] as List? ?? []).map((option) => option['label']),
        ]),
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
      if (widget.api.supportsCloudAccounts) {
        try {
          final data = await widget.api.traitImages();
          if (mounted) setState(() => _traitData = data);
        } catch (_) {
          if (mounted) setState(() => _traitData = null);
        }
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
    appBar: AppBar(title: const Text('Condition checklist')),
    body: _criteria == null
        ? Center(
            child: _error == null
                ? const CircularProgressIndicator()
                : TextButton(
                    onPressed: _load,
                    child: Text('$_error Tap to retry.'),
                  ),
          )
        : ContentWidth(
            maxWidth: 1040,
            child: RefreshIndicator(
              onRefresh: _load,
              child: ListView(
                padding: const EdgeInsets.all(16),
                children: [
                  ListFilters(
                    hint: 'Category, question, or choice',
                    liveSearch: true,
                    onApply: (query, _) => setState(() => _query = query),
                  ),
                  const Card(
                    child: ExpansionTile(
                      title: Text('Condition scoring guide'),
                      children: [
                        Padding(
                          padding: EdgeInsets.all(16),
                          child: Text(
                            '6 Healthy | 3-5 Stressed | 0-2 At Risk\n\nLeaf color, pests, and roots add 0-2 points each. Not Sure is unscored and needs review.\n\nNone: 0. All: lowest score (0) for condition; total of regular choices for context and environment. Context and environment do not change condition.\n\nAdd, rename, or delete choices. Past reports stay unchanged. Keep a 0-point and a 2-point choice in each condition check.',
                          ),
                        ),
                      ],
                    ),
                  ),
                  if (_error != null) Text(_error!),
                  if (widget.api.supportsCloudAccounts)
                    FilledButton.icon(
                      onPressed: _addCategory,
                      icon: const Icon(Icons.add),
                      label: const Text('Add category'),
                    ),
                  const Text('Categories in report order'),
                  if (_filteredCriteria.isEmpty && !_matchingTraits)
                    const Text('No matches. Try a category or choice.'),
                  if (_traitData != null)
                    OutlinedButton.icon(
                      onPressed: _changeOrder,
                      icon: const Icon(Icons.reorder),
                      label: const Text('Question order'),
                    ),
                  for (final key in _orderedKeys)
                    if (_traitHeadings.containsKey(key))
                      _traitEditor(key)
                    else
                      for (final criterion in _filteredCriteria.where(
                        (c) => c['code'] == key,
                      ))
                        _criterionTile(criterion),
                ],
              ),
            ),
          ),
  );

  String _traitName(String key) =>
      (_traitData?['trait_categories'] as Map?)?[key]?['name']?.toString() ??
      _traitHeadings[key] ??
      key;

  Future<void> _addCategory() async {
    final saved = await Navigator.push<bool>(
      context,
      MaterialPageRoute(
        builder: (_) => _ChecklistEditor(
          api: widget.api,
          criterion: {
            'action': 'create',
            'id': 0,
            'version': 'new',
            'name': '',
            'question_text': '',
            'selection_mode': 'single',
            'score_group': 'context',
            'options': [
              {'id': -1, 'kind': 'standard', 'label': 'Yes', 'points': 0},
              {'id': -2, 'kind': 'standard', 'label': 'No', 'points': 0},
              {
                'id': -3,
                'kind': 'unknown',
                'code': 'unknown',
                'label': 'Not Sure',
                'points': 0,
              },
            ],
          },
        ),
      ),
    );
    if (saved == true) await _load();
  }

  Future<void> _editTraitCategory(String key) async {
    var name = _traitName(key);
    var question =
        (_traitData?['trait_categories'] as Map?)?[key]?['question_text']
            ?.toString() ??
        '';
    final form = GlobalKey<FormState>();
    final result = await showDialog<Map<String, dynamic>>(
      context: context,
      builder: (dialog) => AlertDialog(
        title: const Text('Edit category'),
        content: SizedBox(
          width: 440,
          child: SingleChildScrollView(
            child: Form(
              key: form,
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  TextFormField(
                    initialValue: name,
                    maxLength: 120,
                    decoration: const InputDecoration(
                      labelText: 'Category name',
                    ),
                    onChanged: (v) => name = v,
                    validator: (v) =>
                        v == null || v.trim().isEmpty ? 'Enter a name.' : null,
                  ),
                  TextFormField(
                    initialValue: question,
                    maxLength: 255,
                    maxLines: 2,
                    decoration: const InputDecoration(labelText: 'Question'),
                    onChanged: (v) => question = v,
                    validator: (v) => v == null || v.trim().isEmpty
                        ? 'Enter a question.'
                        : null,
                  ),
                ],
              ),
            ),
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(dialog),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () {
              if (form.currentState!.validate()) {
                Navigator.pop(dialog, {
                  'action': 'category',
                  'trait': key,
                  'name': name.trim(),
                  'question_text': question.trim(),
                });
              }
            },
            child: const Text('Save'),
          ),
        ],
      ),
    );
    if (result != null) await _traitAction(result);
  }

  Widget _criterionTile(Map<String, dynamic> criterion) => Card(
    child: ListTile(
      title: Text(
        '${criterion['name']}',
        style: const TextStyle(fontWeight: FontWeight.w700),
      ),
      subtitle: Text(
        criterion['score_group'] == 'health'
            ? 'Condition: 0-2 points'
            : 'Supporting observations',
      ),
      trailing: const Icon(Icons.edit_outlined),
      onTap: () async {
        final saved = await Navigator.push<bool>(
          context,
          MaterialPageRoute(
            builder: (_) =>
                _ChecklistEditor(api: widget.api, criterion: criterion),
          ),
        );
        if (saved == true) await _load();
      },
    ),
  );

  List<String> get _orderedKeys =>
      ((_traitData?['category_order'] as List?) ??
              [
                ..._traitHeadings.keys,
                ...(_criteria ?? []).map((c) => c['code']),
              ])
          .map((key) => '$key')
          .toList();

  Future<void> _traitAction(Map<String, dynamic> body) async {
    try {
      final updated = await widget.api.cloudRequest(
        'trait-images.php',
        body: body,
      );
      if (mounted) setState(() => _traitData = updated);
    } catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              error is ApiException
                  ? error.message
                  : 'Could not save. Try again.',
            ),
          ),
        );
      }
    }
  }

  Future<void> _editTrait(String trait, {String? value}) async {
    var name = value == null
        ? ''
        : (_traitData?['trait_labels'] as Map?)?[trait]?[value]?.toString() ??
              value;
    final label = await showDialog<String>(
      context: context,
      builder: (dialog) => AlertDialog(
        title: Text(value == null ? 'Add choice' : 'Choice name'),
        content: TextFormField(
          initialValue: name,
          onChanged: (text) => name = text,
          autofocus: true,
          maxLength: 190,
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(dialog),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () {
              if (name.trim().isNotEmpty) Navigator.pop(dialog, name.trim());
            },
            child: const Text('Save'),
          ),
        ],
      ),
    );
    if (label != null) {
      await _traitAction({
        'action': value == null ? 'add_choice' : 'rename_choice',
        'trait': trait,
        'value': value,
        'label': label,
      });
    }
  }

  Future<void> _deleteTrait(String trait, String value) async {
    final yes = await showDialog<bool>(
      context: context,
      builder: (dialog) => AlertDialog(
        title: const Text('Delete this choice?'),
        content: const Text(
          'Choices used by a species must be replaced first.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(dialog, false),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(dialog, true),
            child: const Text('Delete'),
          ),
        ],
      ),
    );
    if (yes == true) {
      await _traitAction({
        'action': 'delete_choice',
        'trait': trait,
        'value': value,
      });
    }
  }

  Future<void> _changeOrder() async {
    final order = List<String>.from(_orderedKeys);
    final saved = await showDialog<bool>(
      context: context,
      builder: (dialog) => StatefulBuilder(
        builder: (context, update) => AlertDialog(
          title: const Text('Question order'),
          content: SizedBox(
            width: 500,
            height: MediaQuery.sizeOf(context).height * .6,
            child: ReorderableListView.builder(
              itemCount: order.length,
              onReorderItem: (old, next) => update(() {
                order.insert(next, order.removeAt(old));
              }),
              itemBuilder: (context, i) {
                final key = order[i];
                return ListTile(
                  key: ValueKey(key),
                  title: Text(
                    _traitHeadings.containsKey(key)
                        ? _traitName(key)
                        : (_criteria ?? [])
                              .firstWhere((c) => c['code'] == key)['name']
                              .toString(),
                  ),
                  leading: Text('${i + 1}'),
                  trailing: ReorderableDragStartListener(
                    index: i,
                    child: const Icon(Icons.drag_handle),
                  ),
                );
              },
            ),
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
      ),
    );
    if (saved == true) await _traitAction({'action': 'order', 'order': order});
  }

  static const _traitHeadings = {
    'root_type': 'Klase sa Gamot (Root Type)',
    'leaf_shape': 'Porma sa Dahon (Leaf Shape)',
    'bark_texture': 'Hitsura sa Panit sa Punoan (Bark Texture)',
  };
  bool get _matchingTraits => (_traitData?['traits'] as Map? ?? {}).entries.any(
    (entry) => _matches([
      _traitName(entry.key),
      ...(entry.value as List),
      ...((_traitData?['trait_labels'] as Map?)?[entry.key] as Map? ?? {})
          .values,
    ]),
  );

  Widget _traitEditor(String category) {
    final traits = Map<String, dynamic>.from(
      _traitData?['traits'] as Map? ?? const {},
    );
    final images = Map<String, dynamic>.from(
      _traitData?['trait_images'] as Map? ?? const {},
    );
    return Column(
      children: [
        for (final entry in traits.entries)
          if (entry.key == category &&
              _matches([
                _traitName(entry.key),
                ...(entry.value as List),
                ...((_traitData?['trait_labels'] as Map?)?[entry.key] as Map? ??
                        {})
                    .values,
              ]))
            Card(
              child: ExpansionTile(
                key: ValueKey('${entry.key}|$_query'),
                initiallyExpanded: _query.isNotEmpty,
                title: Text(
                  _traitName(entry.key),
                  style: const TextStyle(fontWeight: FontWeight.w700),
                ),
                children: [
                  TextButton.icon(
                    onPressed: () => _editTraitCategory(entry.key),
                    icon: const Icon(Icons.edit_outlined),
                    label: const Text('Edit category and question'),
                  ),
                  TextButton.icon(
                    onPressed: () => _editTrait(entry.key),
                    icon: const Icon(Icons.add),
                    label: const Text('Add choice'),
                  ),
                  for (final value in entry.value as List)
                    Builder(
                      builder: (context) {
                        final trait = entry.key,
                            item = '$value',
                            group = Map<String, dynamic>.from(
                              images[trait] as Map? ?? const {},
                            ),
                            path = group[item]?.toString();
                        final busy = _savingTrait == '$trait|$item';
                        return ListTile(
                          title: Column(
                            children: [
                              path == null
                                  ? const Icon(Icons.image_outlined)
                                  : Image.network(
                                      widget.api
                                          .resolve(
                                            path.startsWith('img/')
                                                ? '../assets/$path'
                                                : path,
                                          )
                                          .toString(),
                                      headers: widget.api.imageHeaders,
                                      width: 180,
                                      height: 140,
                                      fit: BoxFit.contain,
                                      errorBuilder: (_, _, _) => const Icon(
                                        Icons.broken_image_outlined,
                                      ),
                                    ),
                              const SizedBox(height: 8),
                              Text(
                                (_traitData?['trait_labels']
                                            as Map?)?[trait]?[item]
                                        ?.toString() ??
                                    item,
                                textAlign: TextAlign.center,
                                style: const TextStyle(
                                  fontWeight: FontWeight.w700,
                                ),
                              ),
                            ],
                          ),
                          subtitle: Wrap(
                            spacing: 8,
                            children: [
                              TextButton(
                                onPressed: () => _editTrait(trait, value: item),
                                child: const Text('Rename'),
                              ),
                              TextButton(
                                onPressed: () => _deleteTrait(trait, item),
                                child: const Text('Delete choice'),
                              ),
                            ],
                          ),
                          trailing: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              IconButton(
                                tooltip: 'Replace photo',
                                onPressed: busy
                                    ? null
                                    : () async {
                                        final file = await _imagePicker
                                            .pickImage(
                                              source: ImageSource.gallery,
                                              imageQuality: 85,
                                              maxWidth: 1600,
                                              maxHeight: 1600,
                                              requestFullMetadata: false,
                                            );
                                        if (file == null || !context.mounted) {
                                          return;
                                        }
                                        setState(
                                          () => _savingTrait = '$trait|$item',
                                        );
                                        try {
                                          final updated = await widget.api
                                              .saveTraitImage(
                                                trait: trait,
                                                value: item,
                                                photoPath: file.path,
                                              );
                                          if (context.mounted) {
                                            setState(
                                              () => _traitData = updated,
                                            );
                                          }
                                        } catch (error) {
                                          if (context.mounted) {
                                            ScaffoldMessenger.of(context)
                                                .showSnackBar(
                                                  SnackBar(
                                                    content: Text(
                                                      error is ApiException
                                                          ? error.message
                                                          : 'Could not save the sample picture.',
                                                    ),
                                                  ),
                                                );
                                          }
                                        } finally {
                                          if (context.mounted) {
                                            setState(() => _savingTrait = null);
                                          }
                                        }
                                      },
                                icon: busy
                                    ? const SizedBox(
                                        width: 20,
                                        height: 20,
                                        child: CircularProgressIndicator(
                                          strokeWidth: 2,
                                        ),
                                      )
                                    : const Icon(Icons.edit_outlined),
                              ),
                              if (path != null)
                                IconButton(
                                  tooltip: 'Remove photo',
                                  onPressed: busy
                                      ? null
                                      : () async {
                                          setState(
                                            () => _savingTrait = '$trait|$item',
                                          );
                                          try {
                                            final updated = await widget.api
                                                .saveTraitImage(
                                                  trait: trait,
                                                  value: item,
                                                  remove: true,
                                                );
                                            if (context.mounted) {
                                              setState(
                                                () => _traitData = updated,
                                              );
                                            }
                                          } catch (error) {
                                            if (context.mounted) {
                                              ScaffoldMessenger.of(context)
                                                  .showSnackBar(
                                                    SnackBar(
                                                      content: Text(
                                                        error is ApiException
                                                            ? error.message
                                                            : 'Could not remove the photo.',
                                                      ),
                                                    ),
                                                  );
                                            }
                                          } finally {
                                            if (context.mounted) {
                                              setState(
                                                () => _savingTrait = null,
                                              );
                                            }
                                          }
                                        },
                                  icon: const Icon(Icons.restart_alt),
                                ),
                            ],
                          ),
                        );
                      },
                    ),
                ],
              ),
            ),
      ],
    );
  }
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
      while (_options.any((o) => o['id'] == _nextId)) {
        _nextId--;
      }
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
        title: const Text('Save changes?'),
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
                    headers: widget.api.imageHeaders,
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
      appBar: AppBar(
        title: Text(
          _data['action'] == 'create'
              ? 'Add category'
              : '${widget.criterion['name']}',
        ),
      ),
      bottomNavigationBar: SafeArea(
        child: Padding(
          padding: EdgeInsets.symmetric(
            horizontal: ((MediaQuery.sizeOf(context).width - 728) / 2).clamp(
              16.0,
              double.infinity,
            ),
            vertical: 16,
          ),
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
                child: Text(_busy ? 'Saving...' : 'Save changes'),
              ),
            ],
          ),
        ),
      ),
      body: ContentWidth(
        child: Form(
          key: _form,
          child: ListView(
            controller: _scroll,
            padding: const EdgeInsets.all(16),
            children: [
              if (_error != null)
                Padding(
                  padding: const EdgeInsets.only(bottom: 12),
                  child: Text(
                    _error!,
                    style: const TextStyle(color: Colors.red),
                  ),
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
              if (_data['action'] == 'create') ...[
                DropdownButtonFormField<String>(
                  initialValue: _data['selection_mode'],
                  decoration: const InputDecoration(labelText: 'Answers'),
                  items: const [
                    DropdownMenuItem(
                      value: 'single',
                      child: Text('Choose one'),
                    ),
                    DropdownMenuItem(
                      value: 'multiple',
                      child: Text('Choose several'),
                    ),
                  ],
                  onChanged: (v) => setState(() {
                    _data['selection_mode'] = v;
                    _dirty = true;
                  }),
                ),
                const Text(
                  'Added under Site Conditions. Does not change condition scoring.',
                ),
              ],
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
                          decoration: const InputDecoration(
                            labelText: 'Choice',
                          ),
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
    ),
  );
}
