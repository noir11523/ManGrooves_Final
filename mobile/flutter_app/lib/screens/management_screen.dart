import 'package:flutter/material.dart';

import '../core/api_client.dart';
import '../shared/list_filters.dart';
import 'sites_screen.dart';

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
  String _query = '', _status = '', _role = '', _barangay = '', _error = '';
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
    String? error;
    final saved = await showModalBottomSheet<bool>(
      context: context,
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
              validator: (v) => required && (v?.trim().isEmpty ?? true)
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
                          input(
                            'phone',
                            'Phone (optional)',
                            required: false,
                            max: 30,
                          ),
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
                          choice('barangay_id', 'Barangay', {
                            '': 'Choose barangay',
                            for (final b in _barangays)
                              '${b['id']}': '${b['name']}',
                          }),
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
                            input(
                              'expert_id_code',
                              'Expert credential ID',
                              max: 80,
                            ),
                        ] else
                          choice('status', 'Status', {
                            'active': 'Active',
                            'inactive': 'Inactive',
                          }),
                      ] else ...[
                        if (_species)
                          for (final key in [
                            'scientific_name',
                            'common_name',
                            'local_name',
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
                              key.replaceAll('_', ' '),
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
                                  await widget.api.cloudRequest(
                                    '${widget.page}.php',
                                    body: {
                                      ...values,
                                      if (_users && item == null)
                                        'action': 'create_staff',
                                      if (!_users)
                                        'active':
                                            int.tryParse(
                                              '${values['active']}',
                                            ) ??
                                            1,
                                    },
                                  );
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
          .showSnackBar(const SnackBar(content: Text('Saved.')));
      await _load();
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(
      title: Text(_title),
      bottom: _species
          ? PreferredSize(
              preferredSize: const Size.fromHeight(52),
              child: Row(
                children: [
                  const Padding(
                    padding: EdgeInsets.all(16),
                    child: Text(
                      'Species',
                      style: TextStyle(fontWeight: FontWeight.bold),
                    ),
                  ),
                  TextButton(
                    onPressed: () => Navigator.push(
                      context,
                      MaterialPageRoute<void>(
                        builder: (_) => SitesScreen(api: widget.api),
                      ),
                    ),
                    child: const Text('Sites'),
                  ),
                ],
              ),
            )
          : null,
    ),
    body: RefreshIndicator(
      onRefresh: _load,
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          ListFilters(
            hint: _users
                ? 'Name, email, or phone'
                : _species
                ? 'Species name'
                : 'Badge name',
            filterLabel: 'Status',
            options: _users
                ? const {
                    '': 'All statuses',
                    'active': 'Active',
                    'inactive': 'Inactive',
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
              title: const Text('Role and barangay'),
              children: [
                DropdownButtonFormField<String>(
                  initialValue: _role,
                  isExpanded: true,
                  decoration: const InputDecoration(labelText: 'Role'),
                  items: {'': 'All roles', ...roles}.entries
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
                  initialValue: _barangay,
                  isExpanded: true,
                  decoration: const InputDecoration(labelText: 'Barangay'),
                  items:
                      {
                            '': 'All barangays',
                            for (final b in _barangays)
                              '${b['id']}': '${b['name']}',
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
          OutlinedButton.icon(
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
            child: Text('${_users ? _total : _visible.length} results'),
          ),
          if (!_loading && _visible.isEmpty)
            const Text('No results. Try another search or clear the filters.'),
          for (final item in _visible)
            Card(
              child: ListTile(
                contentPadding: const EdgeInsets.all(12),
                title: Text(
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
                      ? '${item['scientific_name']}\nRoots: ${item['root_type']}\nLeaves: ${item['leaf_shape']}\n${item['active'] == 0 ? 'Archived' : 'Active'}'
                      : '${metrics[item['metric']] ?? item['metric']} ≥ ${item['target_value']} · ${item['earned_count'] ?? 0} earned\n${item['active'] == 0 ? 'Archived' : 'Active'}',
                ),
                trailing:
                    !_users || ['active', 'inactive'].contains(item['status'])
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
  );
}
