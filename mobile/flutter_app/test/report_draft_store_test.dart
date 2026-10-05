import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:mangrooves_mobile/core/report_draft_store.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  test('draft survives reopening and temp-photo deletion, isolates accounts and clears its own photo', () async {
    FlutterSecureStorage.setMockInitialValues({});
    final directory = await Directory.systemTemp.createTemp(
      'mangrooves-draft-test-',
    );
    // Only this newly created test directory is removed at teardown.
    addTearDown(() => directory.delete(recursive: true));
    final temporary = File('${directory.path}/camera.png');
    await temporary.writeAsBytes([137, 80, 78, 71, 1, 2, 3]);
    final first = ReportDraftStore(directory: () async => directory);
    final fields = {
      'photo_path': temporary.path,
      'step': 2,
      'sitio_name': 'Coastal site',
      'observations': {
        'leaf_color': [1],
      },
    };
    await first.save('project:user-a', fields);
    await temporary.delete();
    final reopened = ReportDraftStore(directory: () async => directory);
    final draft = (await reopened.load('project:user-a'))!;
    expect(draft['step'], 2);
    expect(draft['observations'], {
      'leaf_color': [1],
    });
    expect(await File(draft['photo_path'] as String).readAsBytes(), [
      137,
      80,
      78,
      71,
      1,
      2,
      3,
    ]);
    expect(await reopened.load('project:user-b'), isNull);
    expect(await reopened.load('other-project:user-a'), isNull);
    final photo = draft['photo_path'];
    await reopened.save('project:user-a', {...draft, 'step': 3});
    expect((await reopened.load('project:user-a'))!['photo_path'], photo);
    await reopened.clear('project:user-a');
    expect(await reopened.load('project:user-a'), isNull);
    expect(await File(photo as String).exists(), false);
  });

  test('queued edits retain latest values and missing photo preserves the rest of the draft', () async {
    FlutterSecureStorage.setMockInitialValues({});
    final directory = await Directory.systemTemp.createTemp(
      'mangrooves-draft-test-',
    );
    addTearDown(() => directory.delete(recursive: true));
    final store = ReportDraftStore(directory: () async => directory);
    final photo = File('${directory.path}/photo.jpg');
    await photo.writeAsBytes([1, 2, 3]);
    await Future.wait([
      store.save('user', {
        'step': 0,
        'guardian_remarks': 'First',
        'photo_path': photo.path,
      }),
      store.save('user', {
        'step': 1,
        'guardian_remarks': 'Latest',
        'photo_path': photo.path,
      }),
    ]);
    final saved = (await store.load('user'))!;
    await File(saved['photo_path'] as String).delete();
    final restored = (await ReportDraftStore(
      directory: () => Future.value(directory),
    ).load('user'))!;
    expect(restored['guardian_remarks'], 'Latest');
    expect(restored['step'], 1);
    expect(restored['missing_photo'], true);
    expect(restored['photo_path'], isNull);
  });
}
