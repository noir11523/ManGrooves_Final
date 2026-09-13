import 'package:flutter_test/flutter_test.dart';
import 'package:mangrooves_mobile/core/report_location.dart';

void main() {
  test(
    'manual pins submit exact coordinates without fabricated GPS accuracy',
    () {
      const location = ReportLocation.manual(
        latitude: 10.28331234,
        longitude: 123.88331234,
      );
      expect(location.fields, {
        'latitude': '10.28331234',
        'longitude': '123.88331234',
        'location_source': 'manual',
      });
      expect(location.accuracy, isNull);
      expect(location.point.latitude, 10.28331234);
    },
  );

  test('GPS retains its source and measured accuracy', () {
    const location = ReportLocation.gps(
      latitude: 10.28,
      longitude: 123.88,
      accuracy: 7.125,
    );
    expect(location.fields['location_source'], 'gps');
    expect(location.fields['location_accuracy'], '7.13');
    expect(location.fields['latitude'], '10.28000000');
  });
}
