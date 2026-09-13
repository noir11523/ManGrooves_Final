import 'package:latlong2/latlong.dart';

/// The selected report location, including how it was obtained.
class ReportLocation {
  const ReportLocation.manual({required this.latitude, required this.longitude})
    : source = 'manual',
      accuracy = null;

  const ReportLocation.gps({
    required this.latitude,
    required this.longitude,
    required double this.accuracy,
  }) : source = 'gps';

  final double latitude;
  final double longitude;
  final String source;
  final double? accuracy;

  LatLng get point => LatLng(latitude, longitude);

  Map<String, String> get fields => {
    'latitude': latitude.toStringAsFixed(8),
    'longitude': longitude.toStringAsFixed(8),
    'location_source': source,
    if (source == 'gps' && accuracy != null)
      'location_accuracy': accuracy!.toStringAsFixed(2),
  };
}
