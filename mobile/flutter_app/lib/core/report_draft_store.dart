import 'dart:convert';
import 'dart:io';

import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:path_provider/path_provider.dart';

/// Local report drafts are separate for each account and backend.
class ReportDraftStore {
  ReportDraftStore({
    FlutterSecureStorage? storage,
    Future<Directory> Function()? directory,
  }) : _storage = storage ?? const FlutterSecureStorage(),
       _directory = directory ?? getApplicationSupportDirectory;

  final FlutterSecureStorage _storage;
  final Future<Directory> Function() _directory;
  Future<void> _pending = Future.value();
  final Map<String, String> _photoSources = {};
  final Map<String, String> _photos = {};
  String? photoPath(String scope) => _photos[scope];
  String _key(String scope) =>
      'report_draft_v1_${base64Url.encode(utf8.encode(scope))}';

  Future<Map<String, dynamic>?> load(String scope) async {
    final raw = await _storage.read(key: _key(scope));
    if (raw == null) return null;
    final data = Map<String, dynamic>.from(jsonDecode(raw) as Map);
    if (data['version'] != 1) throw const FormatException('Unsupported draft');
    final path = data['photo_path'] as String?;
    if (path != null && await File(path).exists()) {
      _photos[scope] = path;
      _photoSources[scope] = path;
    } else if (path != null) {
      data['photo_path'] = null;
      data['missing_photo'] = true;
    }
    return data;
  }

  Future<void> save(String scope, Map<String, dynamic> values) {
    // Snapshot now: later UI edits must not alter an in-flight disk write.
    final data = Map<String, dynamic>.from(
      jsonDecode(jsonEncode(values)) as Map,
    );
    final operation = _pending.catchError((Object _) {}).then((_) async {
      final source = data['photo_path'] as String?;
      String? previous;
      if (source != null &&
          source != _photoSources[scope] &&
          source != _photos[scope]) {
        final root = await _directory();
        final folder = Directory('${root.path}/report-drafts');
        await folder.create(recursive: true);
        final extension = source.toLowerCase().endsWith('.png')
            ? 'png'
            : source.toLowerCase().endsWith('.webp')
            ? 'webp'
            : 'jpg';
        final target =
            '${folder.path}/${DateTime.now().microsecondsSinceEpoch}.$extension';
        await File(target)
            .writeAsBytes(await File(source).readAsBytes(), flush: true);
        previous = _photos[scope];
        _photos[scope] = target;
        _photoSources[scope] = source;
      }
      data['photo_path'] = source == null ? null : _photos[scope];
      data['version'] = 1;
      await _storage.write(key: _key(scope), value: jsonEncode(data));
      if (previous != null) {
        try {
          await _removePhoto(previous);
        } catch (_) {
          /* Metadata already points to the new durable photo. */
        }
      }
    });
    _pending = operation;
    return operation;
  }

  Future<void> _removePhoto(String photo) async {
    final root = await _directory();
    final folder = Directory('${root.path}/report-drafts').absolute.path;
    final file = File(photo).absolute;
    // Only delete our own single draft photo inside the application directory.
    if (file.parent.path == folder && await file.exists()) await file.delete();
  }

  Future<void> clear(String scope) async {
    await _pending.catchError((Object _) {});
    await _storage.delete(key: _key(scope));
    final path = _photos.remove(scope);
    _photoSources.remove(scope);
    if (path != null) {
      try {
        await _removePhoto(path);
      } catch (_) {
        /* The cleared draft must stay cleared. */
      }
    }
  }

  Future<void> flush() => _pending;
}
