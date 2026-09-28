import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mangrooves_mobile/core/api_client.dart';
import 'package:mangrooves_mobile/screens/checklist_screen.dart';

class _Api extends ApiClient {
  int saves = 0;
  Map<String, dynamic>? sent;
  bool fail = false;
  Map<String, dynamic> criterion = {
    'id': 1,
    'code': 'leaf_color',
    'name': 'Leaf color',
    'question_text': 'What color are the leaves?',
    'score_group': 'health',
    'selection_mode': 'single',
    'version': 'version1',
    'guide_image': null,
    'options': [
      {
        'id': 1,
        'code': 'green',
        'label': 'Green',
        'points': 2,
        'image_path': null,
      },
      {
        'id': 2,
        'code': 'yellow',
        'label': 'Yellow',
        'points': 1,
        'image_path': null,
      },
      {
        'id': 3,
        'code': 'brown',
        'label': 'Brown',
        'points': 0,
        'image_path': null,
      },
      {
        'id': 4,
        'code': 'unknown',
        'label': 'Not Sure',
        'points': 0,
        'image_path': null,
      },
    ],
  };
  @override
  Future<Map<String, dynamic>> checklist() async => {
    'criteria': [criterion],
  };
  @override
  Future<Map<String, dynamic>> saveChecklist(
    Map<String, dynamic> data,
    Map<String, String> images,
  ) async {
    saves++;
    if (fail) {
      throw const ApiException(
        'This checklist changed. Reload it before saving.',
      );
    }
    sent = jsonDecode(jsonEncode(data));
    criterion = sent!;
    return {'ok': true};
  }
}

Finder _field(String label) => find.byWidgetPredicate(
  (w) => w is TextField && w.decoration?.labelText == label,
);
Future<void> _tap(WidgetTester tester, Finder finder) async {
  if (finder.evaluate().isEmpty) {
    await tester.scrollUntilVisible(
      finder,
      150,
      scrollable: find.byType(Scrollable).first,
    );
  }
  await tester.ensureVisible(finder);
  await tester.pumpAndSettle();
  await tester.tap(finder);
  await tester.pumpAndSettle();
}

void main() {
  testWidgets(
    'admin checklist fits small phones and confirms, saves, and reloads edits',
    (tester) async {
      tester.view.physicalSize = const Size(320, 800);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);
      final api = _Api();
      await tester.pumpWidget(MaterialApp(home: ChecklistScreen(api: api)));
      await tester.pumpAndSettle();
      await _tap(tester, find.text('Leaf color'));
      await tester.enterText(_field('Name'), 'Leaf appearance');
      await _tap(tester, find.byType(DropdownButtonFormField<int>).first);
      await _tap(tester, find.text('1').last);
      await _tap(tester, find.text('Save checklist'));
      await _tap(tester, find.text('Cancel'));
      expect(api.saves, 0);
      await _tap(tester, find.text('Save checklist'));
      await _tap(tester, find.text('Save'));
      expect(api.sent!['name'], 'Leaf appearance');
      expect((api.sent!['options'] as List).first['points'], 1);
      expect((api.sent!['options'] as List).last['points'], 0);
      expect(api.sent!['version'], 'version1');
      expect(find.text('Leaf appearance'), findsOneWidget);
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets('unsaved admin edits can be kept or discarded with back', (
    tester,
  ) async {
    final api = _Api();
    await tester.pumpWidget(MaterialApp(home: ChecklistScreen(api: api)));
    await tester.pumpAndSettle();
    await _tap(tester, find.text('Leaf color'));
    await tester.enterText(_field('Name'), 'Changed');
    await _tap(tester, find.byType(BackButton));
    await _tap(tester, find.text('Keep editing'));
    expect(find.text('Changed'), findsOneWidget);
    await _tap(tester, find.byType(BackButton));
    await _tap(tester, find.text('Discard'));
    expect(find.text('Save checklist'), findsNothing);
    expect(api.saves, 0);
    expect(tester.takeException(), isNull);
  });
}
