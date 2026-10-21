import '../shared/species_names.dart';

import 'package:flutter/material.dart';

import '../core/api_client.dart';
import '../shared/list_filters.dart';
import '../shared/catalog_widgets.dart';
import '../shared/content_width.dart';
import 'sites_screen.dart';
import 'cloud_admin_screen.dart';
import '../shared/barangay_picker.dart';

import 'package:image_picker/image_picker.dart';

class ManagementScreen extends StatefulWidget {
  const ManagementScreen({super.key, required this.api, required this.page});
  final ApiClient api;
  final String page;
  @override
  State<ManagementScreen> createState() => _ManagementScreenState();
}

class _ManagementScreenState extends State<ManagementScreen> {
  static const roles = {
    'guardian': 'Coastal Guardian',
    'expert': 'Expert',
    'system_admin': 'Administrator',
  };
  static const metrics = {
    'verified_reports': 'Verified reports',
    'verified_followups': 'Verified follow-ups',
    'distinct_species': 'Different species',
    'uncorrected_reports': 'Verified without corrections',
    'steward_days': 'Monitoring days',
  };
  List<Map<String, dynamic>> _items = [], _barangays = [];
  String _query = '',
      _status = '',
      _role = '',
      _barangay = '',
      _error = '',
      _badge = '';
  Map<String, dynamic> _summary = {};
  int _page = 1, _pages = 1, _total = 0;
  int _loadRequest = 0;
  bool _loading = true;
  bool get _users => widget.page == 'users';
  bool get _species => widget.page == 'species';
  String get _title => _users
      ? 'Users'
      : _species
      ? 'Species and Sites'
      : 'Manage badges';
  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final request = ++_loadRequest;
    setState(() => _loading = true);
    try {
      final data = await widget.api.cloudRequest(
        '${widget.page}.php',
        query: _users
            ? {
                'q': _query,
                'status': _status,
                'role': _role,
                'barangay_id': _barangay,
                'badge_tier': _badge,
                'page': '$_page',
              }
            : {},
      );
      if (!mounted || request != _loadRequest) return;
      setState(() {
        _items =
            (data[_users
                            ? 'items'
                            : _species
                            ? 'species'
                            : 'badges']
                        as List? ??
                    [])
                .map((x) => Map<String, dynamic>.from(x as Map))
                .toList();
        _barangays = (data['barangays'] as List? ?? [])
            .map((x) => Map<String, dynamic>.from(x as Map))
            .toList();
        _summary = Map<String, dynamic>.from(data['summary'] as Map? ?? {});
        _pages = (data['pages'] as num?)?.toInt() ?? 1;
        _total = (data['total'] as num?)?.toInt() ?? _items.length;
        _error = '';
      });
    } catch (e) {
      if (mounted && request == _loadRequest) {
        setState(
          () => _error = e is ApiException
              ? e.message
              : 'Could not load this list. Try again.',
        );
      }
    } finally {
      if (mounted && request == _loadRequest) {
        setState(() => _loading = false);
      }
    }
  }

  List<Map<String, dynamic>> get _visible => _users
      ? _items
      : _items
            .where(
              (item) =>
                  '${item['scientific_name'] ?? ''} ${item['common_name'] ?? ''} ${item['local_name'] ?? ''} ${item['badge_name'] ?? ''} ${item['description'] ?? ''}'
                      .toLowerCase()
                      .contains(_query.toLowerCase()) &&
                  (_status.isEmpty || '${item['active']}' == _status),
            )
            .toList();

  Future<void> _edit(Map<String, dynamic>? item) async {
    if (_users &&
        item != null &&
        !['active', 'inactive'].contains(item['status'])) {
      await _application(item);
      return;
    }
    final values = <String, dynamic>{
      ...item ?? {},
      if (item == null) 'active': 1,
      if (_users && item == null) 'role': 'expert',
      if (!_users && !_species && item == null) 'metric': 'verified_reports',
      if (item == null) 'target_value': 1,
    };
    final form = GlobalKey<FormState>();
    bool busy = false;
    String successMessage = 'Saved.';
    String? error;
    XFile? idPhoto;
    final saved = await showModalBottomSheet<bool>(
      context: context,
      constraints: const BoxConstraints(maxWidth: 680),
      isScrollControlled: true,
      useSafeArea: true,
      isDismissible: false,
      enableDrag: false,
      builder: (context) => StatefulBuilder(
        builder: (context, update) {
          Widget input(
            String key,
            String label, {
            bool required = true,
            bool secret = false,
            int max = 255,
            bool number = false,
          }) => Padding(
            padding: const EdgeInsets.only(bottom: 14),
            child: TextFormField(
              initialValue: '${values[key] ?? ''}',
              obscureText: secret,
              keyboardType: number
                  ? TextInputType.number
                  : key == 'email'
                  ? TextInputType.emailAddress
                  : TextInputType.text,
              maxLength: max,
              decoration: InputDecoration(labelText: label, counterText: ''),
              enabled: !busy,
              validator: (v) => key == 'phone'
                  ? validateMobile(v)
                  : required && (v?.trim().isEmpty ?? true)
                  ? 'Enter $label.'
                  : null,
              onChanged: (v) => values[key] = v,
            ),
          );
          Widget choice(
            String key,
            String label,
            Map<String, String> options,
          ) => Padding(
            padding: const EdgeInsets.only(bottom: 14),
            child: DropdownButtonFormField<String>(
              initialValue: options.containsKey('${values[key]}')
                  ? '${values[key]}'
                  : options.keys.first,
              isExpanded: true,
              decoration: InputDecoration(labelText: label),
              items: options.entries
                  .map(
                    (e) => DropdownMenuItem(value: e.key, child: Text(e.value)),
                  )
                  .toList(),
              onChanged: busy ? null : (v) => update(() => values[key] = v),
            ),
          );
          return SizedBox(
            height: MediaQuery.sizeOf(context).height * .85,
            child: Padding(
              padding: EdgeInsets.fromLTRB(
                20,
                16,
                20,
                MediaQuery.viewInsetsOf(context).bottom + 16,
              ),
              child: Form(
                key: form,
                child: SingleChildScrollView(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      Row(
                        children: [
                          Expanded(
                            child: Text(
                              _users
                                  ? (item == null
                                        ? 'Create staff account'
                                        : 'Edit access')
                                  : '${item == null ? 'Add' : 'Edit'} ${_species ? 'species' : 'badge'}',
                              style: Theme.of(context).textTheme.titleLarge,
                            ),
                          ),
                          IconButton(
                            tooltip: 'Close',
                            onPressed: busy
                                ? null
                                : () => Navigator.pop(context, false),
                            icon: const Icon(Icons.close),
                          ),
                        ],
                      ),
                      if (error != null)
                        Padding(
                          padding: const EdgeInsets.only(bottom: 12),
                          child: Text(
                            error!,
                            style: TextStyle(
                              color: Theme.of(context).colorScheme.error,
                            ),
                          ),
                        ),
                      if (_users) ...[
                        if (item == null) ...[
                          const Padding(
                            padding: EdgeInsets.only(bottom: 16),
                            child: Text(
                              'Create approved staff access and share the sign-in details securely.',
                            ),
                          ),
                          input('first_name', 'First name', max: 80),
                          input('last_name', 'Last name', max: 80),
                          input('email', 'Email', max: 190),
                          input('phone', 'Mobile number', max: 30),
                        ] else
                          Padding(
                            padding: const EdgeInsets.only(bottom: 16),
                            child: Text(
                              '${item['full_name']}\n${item['email']}',
                            ),
                          ),
                        choice(
                          'role',
                          'Role',
                          item == null
                              ? {
                                  'expert': 'Expert',
                                  'system_admin': 'Administrator',
                                }
                              : roles,
                        ),
                        if (item == null) ...[
                          BarangayPicker(
                            items: _barangays,
                            value: int.tryParse('${values['barangay_id']}'),
                            enabled: !busy,
                            onChanged: (v) =>
                                update(() => values['barangay_id'] = v),
                          ),
                          const SizedBox(height: 16),
                          input(
                            'address_line',
                            'House / building, street or sitio',
                            max: 200,
                          ),
                          input(
                            'password',
                            'Initial password',
                            secret: true,
                            max: 25,
                          ),
                          input(
                            'password_confirmation',
                            'Confirm password',
                            secret: true,
                            max: 25,
                          ),
                          if (values['role'] == 'expert')
                            OutlinedButton.icon(
                              icon: const Icon(Icons.badge_outlined),
                              label: Text(
                                idPhoto == null
                                    ? 'Upload work or professional ID photo'
                                    : 'Change ID photo',
                              ),
                              onPressed: busy
                                  ? null
                                  : () async {
                                      try {
                                        final photo = await ImagePicker()
                                            .pickImage(
                                              source: ImageSource.gallery,
                                              maxWidth: 1800,
                                              imageQuality: 88,
                                            );
                                        if (photo != null &&
                                            await photo.length() >
                                                5 * 1024 * 1024) {
                                          throw const ApiException(
                                            'Choose an ID photo under 5 MB.',
                                          );
                                        }
                                        if (photo != null && context.mounted) {
                                          update(() => idPhoto = photo);
                                        }
                                      } catch (e) {
                                        if (context.mounted) {
                                          update(
                                            () => error = e is ApiException
                                                ? e.message
                                                : 'Could not open the photo. Try again.',
                                          );
                                        }
                                      }
                                    },
                            ),
                        ] else
                          choice('status', 'Status', {
                            'active': 'Active',
                            'inactive': 'Suspended',
                          }),
                      ] else ...[
                        if (_species)
                          for (final key in [
                            'local_name',
                            'common_name',
                            'scientific_name',
                            'family',
                            'iucn_code',
                            'iucn_label',
                            'population_trend',
                            'root_type',
                            'leaf_shape',
                            'bark_texture',
                          ])
                            input(
                              key,
                              key.startsWith('iucn_')
                                  ? 'IUCN ${key.substring(5)}'
                                  : '${key[0].toUpperCase()}${key.substring(1).replaceAll('_', ' ')}',
                              required: [
                                'scientific_name',
                                'common_name',
                                'root_type',
                                'leaf_shape',
                                'bark_texture',
                              ].contains(key),
                            ),
                        if (!_species) ...[
                          input('badge_name', 'Badge name', max: 120),
                          input('description', 'Description', max: 1000),
                          choice('metric', 'Milestone', metrics),
                          input('target_value', 'Target', number: true, max: 7),
                        ],
                        choice('active', 'Status', {
                          '1': 'Active',
                          '0': 'Archived',
                        }),
                      ],
                      FilledButton(
                        onPressed: busy
                            ? null
                            : () async {
                                if (!form.currentState!.validate()) return;
                                if (_users && item == null) {
                                  if (values['password'] !=
                                      values['password_confirmation']) {
                                    update(
                                      () =>
                                          error = 'The passwords do not match.',
                                    );
                                    return;
                                  }
                                  if (values['role'] == 'expert' &&
                                      idPhoto == null) {
                                    update(
                                      () => error = 'Upload a work or professional ID photo.',
                                    );
                                    return;
                                  }
                                  if ('${values['barangay_id'] ?? ''}'
                                      .isEmpty) {
                                    update(() => error = 'Choose a barangay.');
                                    return;
                                  }
                                }
                                update(() {
                                  busy = true;
                                  error = null;
                                });
                                try {
                                  final payload = <String, dynamic>{
                                    ...values,
                                    if (_users && item == null)
                                      'action': 'create_staff',
                                    if (!_users)
                                      'active':
                                          int.tryParse('${values['active']}') ??
                                          1,
                                  };
                                  if (_users && item == null) {
                                    await widget.api.cloudUpload(
                                      'users.php',
                                      payload,
                                      values['role'] == 'expert' &&
                                              idPhoto != null
                                          ? {'id_photo': idPhoto!.path}
                                          : {},
                                    );
                                  } else {
                                    await widget.api.cloudRequest(
                                      '${widget.page}.php',
                                      body: payload,
                                    );
                                  }
                                  if (context.mounted) {
                                    Navigator.pop(context, true);
                                  }
                                } catch (e) {
                                  if (context.mounted) {
                                    update(
                                      () => error = e is ApiException
                                          ? e.message
                                          : 'Could not save. Try again.',
                                    );
                                  }
                                } finally {
                                  if (context.mounted) {
                                    update(() => busy = false);
                                  }
                                }
                              },
                        child: Text(
                          busy
                              ? 'Saving…'
                              : _users && item == null
                              ? 'Create staff account'
                              : 'Save',
                        ),
                      ),
                      if (_species && item != null) ...[
                        const SizedBox(height: 12),
                        OutlinedButton.icon(
                          style: OutlinedButton.styleFrom(
                            foregroundColor: Theme.of(context)
                                .colorScheme
                                .error,
                          ),
                          icon: const Icon(Icons.delete_outline),
                          label: const Text('Delete species'),
                          onPressed: busy
                              ? null
                              : () async {
                                  update(() {
                                    busy = true;
                                    error = null;
                                  });
                                  try {
                                    final confirmed = await showDialog<bool>(
                                      context: context,
                                      builder: (dialogContext) => AlertDialog(
                                        title: const Text('Delete species?'),
                                        content: Text(
                                          'Remove “${item['local_name'] ?? item['common_name'] ?? item['scientific_name']}” from the species list? Existing reports are kept. This cannot be undone here.',
                                        ),
                                        actions: [
                                          TextButton(
                                            onPressed: () => Navigator.pop(
                                              dialogContext,
                                              false,
                                            ),
                                            child: const Text('Cancel'),
                                          ),
                                          FilledButton(
                                            style: FilledButton.styleFrom(
                                              backgroundColor: Theme.of(context)
                                                  .colorScheme
                                                  .error,
                                              foregroundColor: Theme.of(context)
                                                  .colorScheme
                                                  .onError,
                                            ),
                                            onPressed: () => Navigator.pop(
                                              dialogContext,
                                              true,
                                            ),
                                            child: const Text('Delete'),
                                          ),
                                        ],
                                      ),
                                    );
                                    if (confirmed != true || !context.mounted) {
                                      return;
                                    }
                                    await widget.api.cloudRequest(
                                      'species.php',
                                      body: {
                                        'id': item['id'],
                                        'action': 'delete',
                                      },
                                    );
                                    successMessage = 'Species deleted. Existing reports are kept.';
                                    if (context.mounted) {
                                      Navigator.pop(context, true);
                                    }
                                  } catch (e) {
                                    if (context.mounted) {
                                      update(
                                        () => error = e is ApiException
                                            ? e.message
                                            : 'Could not delete. Try again.',
                                      );
                                    }
                                  } finally {
                                    if (context.mounted) {
                                      update(() => busy = false);
                                    }
                                  }
                                },
                        ),
                      ],
                    ],
                  ),
                ),
              ),
            ),
          );
        },
      ),
    );
    if (saved == true && mounted) {
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text(successMessage)));
      await _load();
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(
      title: Text(_title),
      bottom: _species
          ? CatalogTabs(
              selected: 'species',
              textScaler: MediaQuery.textScalerOf(context),
              onSelected: (_) => Navigator.push(
                context,
                MaterialPageRoute<void>(
                  builder: (_) => SitesScreen(api: widget.api),
                ),
              ),
            )
          : null,
    ),
    body: ContentWidth(
      maxWidth: 960,
      child: RefreshIndicator(
        onRefresh: _load,
        child: ListView(
          padding: const EdgeInsets.all(16),
          physics: const AlwaysScrollableScrollPhysics(),
          children: [
            ListFilters(
              applyLabel: 'Filter',
              clearLabel: 'Reset',
              hint: _users
                  ? 'Name, email, or phone'
                  : _species
                  ? 'Local, common, or scientific name'
                  : 'Badge name',
              filterLabel: 'Status',
              options: _users
                  ? const {
                      '': 'All statuses',
                      'active': 'Active',
                      'inactive': 'Suspended',
                      'pending_approval': 'Awaiting approval',
                      'rejected': 'Declined',
                    }
                  : const {'': 'All statuses', '1': 'Active', '0': 'Archived'},
              onApply: (q, status) {
                setState(() {
                  _query = q;
                  _status = status;
                  _page = 1;
                });
                if (_users) _load();
              },
            ),
            if (_users)
              ExpansionTile(
                title: const Text('Role, barangay and badges'),
                children: [
                  DropdownButtonFormField<String>(
                    initialValue: _role,
                    isExpanded: true,
                    decoration: const InputDecoration(labelText: 'Role'),
                    items:
                        {
                              '': 'All roles',
                              ...roles,
                              'applicant': 'Expert applicant',
                            }.entries
                            .map(
                              (e) => DropdownMenuItem(
                                value: e.key,
                                child: Text(e.value),
                              ),
                            )
                            .toList(),
                    onChanged: (v) {
                      setState(() {
                        _role = v ?? '';
                        _page = 1;
                      });
                      _load();
                    },
                  ),
                  const SizedBox(height: 12),
                  DropdownButtonFormField<String>(
                    initialValue: _badge,
                    isExpanded: true,
                    decoration: const InputDecoration(labelText: 'Badges'),
                    items:
                        const {
                              '': 'All badges',
                              'gold': 'Gold',
                              'silver': 'Silver',
                              'bronze': 'Bronze',
                              'other': 'Other badges',
                              'none': 'No badges',
                              'earned': 'Any earned badge',
                            }.entries
                            .map(
                              (e) => DropdownMenuItem(
                                value: e.key,
                                child: Text(e.value),
                              ),
                            )
                            .toList(),
                    onChanged: (v) {
                      setState(() {
                        _badge = v ?? '';
                        _page = 1;
                      });
                      _load();
                    },
                  ),
                  const SizedBox(height: 12),
                  DropdownButtonFormField<String>(
                    initialValue: _barangay,
                    isExpanded: true,
                    decoration: const InputDecoration(labelText: 'Barangay'),
                    items:
                        {
                              '': 'All barangays',
                              for (final b in _barangays)
                                '${b['id']}': barangayLabel(b),
                            }.entries
                            .map(
                              (e) => DropdownMenuItem(
                                value: e.key,
                                child: Text(e.value),
                              ),
                            )
                            .toList(),
                    onChanged: (v) {
                      setState(() {
                        _barangay = v ?? '';
                        _page = 1;
                      });
                      _load();
                    },
                  ),
                ],
              ),
            const SizedBox(height: 12),
            FilledButton.icon(
              onPressed: _loading ? null : () => _edit(null),
              icon: const Icon(Icons.add),
              label: Text(
                _users
                    ? 'Create staff account'
                    : _species
                    ? 'Add species'
                    : 'Add badge',
              ),
            ),
            if (_loading) const LinearProgressIndicator(),
            if (_error.isNotEmpty)
              TextButton(onPressed: _load, child: Text('$_error Retry')),
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 12),
              child: Text(
                _users
                    ? '${_summary['active_experts'] ?? 0} active experts · ${_summary['active_guardians'] ?? 0} active coastal guardians\n$_total results'
                    : '${_visible.length} results',
              ),
            ),
            if (!_loading && _visible.isEmpty)
              const Text(
                'No results. Try another search or clear the filters.',
              ),
            for (final item in _visible)
              _species
                  ? _speciesCard(context, item)
                  : _users
                  ? _userCard(item)
                  : Card(
                      margin: const EdgeInsets.only(bottom: 16),
                      child: ListTile(
                        contentPadding: const EdgeInsets.all(12),
                        title: _species
                            ? SpeciesNames(item)
                            : Text(
                                '${item[_users
                                    ? 'full_name'
                                    : _species
                                    ? 'common_name'
                                    : 'badge_name']}',
                              ),
                        subtitle: Text(
                          _users
                              ? '${item['email']}\n${item['barangay_name'] ?? ''} · ${roles[item['role']] ?? ''} · ${item['status']}'
                              : _species
                              ? 'Roots: ${item['root_type']}\nLeaves: ${item['leaf_shape']}\n${item['active'] == 0 ? 'Archived' : 'Active'}'
                              : '${metrics[item['metric']] ?? item['metric']} ≥ ${item['target_value']} · ${item['earned_count'] ?? 0} earned\n${item['active'] == 0 ? 'Archived' : 'Active'}',
                        ),
                        trailing:
                            !_users ||
                                ['active', 'inactive'].contains(item['status'])
                            ? IconButton(
                                tooltip: 'Edit',
                                icon: const Icon(Icons.edit_outlined),
                                onPressed: () => _edit(item),
                              )
                            : null,
                      ),
                    ),
            if (_users && _pages > 1)
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  TextButton(
                    onPressed: _page > 1 && !_loading
                        ? () {
                            _page--;
                            _load();
                          }
                        : null,
                    child: const Text('Previous'),
                  ),
                  Text('$_page / $_pages'),
                  TextButton(
                    onPressed: _page < _pages && !_loading
                        ? () {
                            _page++;
                            _load();
                          }
                        : null,
                    child: const Text('Next'),
                  ),
                ],
              ),
          ],
        ),
      ),
    ),
  );

  Future<void> _application(Map<String, dynamic> item) async {
    final uid = item['application_uid'];
    if (uid == null) return;
    await Navigator.push(
      context,
      MaterialPageRoute<void>(
        builder: (_) =>
            CloudAdminScreen(api: widget.api, applicationUid: '$uid'),
      ),
    );
    if (mounted) await _load();
  }

  Widget _userCard(Map<String, dynamic> item) => Card(
    margin: const EdgeInsets.only(bottom: 16),
    child: Padding(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            '${item['full_name']}',
            style: Theme.of(context).textTheme.titleMedium,
          ),
          const SizedBox(height: 8),
          Text('${item['email']}'),
          Text('${item['phone'] ?? 'No mobile number'}'),
          if ('${item['address_line'] ?? ''}'.isNotEmpty)
            Text('${item['address_line']}'),
          Text(
            '${item['barangay_name'] ?? ''} · ${item['city_municipality'] ?? 'Cebu City'}',
          ),
          const SizedBox(height: 12),
          Text(
            '${item['role_label'] ?? roles[item['role']]} · ${const {'active': 'Active', 'inactive': 'Suspended', 'pending_approval': 'Awaiting approval', 'rejected': 'Declined'}[item['status']] ?? item['status']}',
          ),
          const SizedBox(height: 12),
          const Text('Badges', style: TextStyle(fontWeight: FontWeight.w600)),
          const Text('Milestones from verified observations.'),
          if ((item['badges'] as List? ?? []).isEmpty)
            const Text('No badges yet')
          else
            Wrap(
              spacing: 8,
              runSpacing: 4,
              children: [
                for (final badge in item['badges'] as List)
                  Tooltip(
                    message:
                        '${badge['description'] ?? 'Earned through verified observations'}',
                    child: Chip(label: Text('${badge['name']}')),
                  ),
              ],
            ),
          const SizedBox(height: 8),
          Text(
            '${item['report_counts']?['verified'] ?? 0} verified · ${item['report_counts']?['total'] ?? 0} total reports',
          ),
          const SizedBox(height: 12),
          Wrap(
            spacing: 12,
            runSpacing: 8,
            children: [
              if (['active', 'inactive'].contains(item['status']))
                OutlinedButton.icon(
                  onPressed: () => _edit(item),
                  icon: const Icon(Icons.edit_outlined),
                  label: const Text('Edit access'),
                ),
              if (item['application_uid'] != null)
                TextButton(
                  onPressed: () => _application(item),
                  child: const Text('View application'),
                ),
            ],
          ),
        ],
      ),
    ),
  );

  Widget _speciesCard(BuildContext context, Map<String, dynamic> item) => Card(
    key: ValueKey('species-${item['id']}'),
    margin: const EdgeInsets.only(bottom: 16),
    child: Padding(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          SpeciesNames(item),
          const SizedBox(height: 16),
          CatalogDetail('Roots', '${item['root_type'] ?? ''}'),
          CatalogDetail('Leaves', '${item['leaf_shape'] ?? ''}'),
          CatalogDetail('Bark', '${item['bark_texture'] ?? ''}'),
          const SizedBox(height: 10),
          Wrap(
            spacing: 12,
            runSpacing: 12,
            crossAxisAlignment: WrapCrossAlignment.center,
            children: [
              CatalogStatus(item['active'] == 0 ? 'Archived' : 'Active'),
              Tooltip(
                message: 'Edit',
                child: OutlinedButton.icon(
                  onPressed: () => _edit(item),
                  icon: const Icon(Icons.edit_outlined, size: 18),
                  label: const Text('Edit'),
                ),
              ),
            ],
          ),
        ],
      ),
    ),
  );
}
