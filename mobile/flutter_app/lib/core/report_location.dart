import 'package:latlong2/latlong.dart';

/// The selected report location, including how it was obtained.
class ReportLocation {
  const ReportLocation.manual({
    required this.latitude,
    required this.longitude,
    this.name,
  }) : source = 'manual',
       accuracy = null;

  const ReportLocation.gps({
    required this.latitude,
    required this.longitude,
    required double this.accuracy,
    this.name,
  }) : source = 'gps';

  final double latitude;
  final double longitude;
  final String source;
  final double? accuracy;
  final String? name;

  LatLng get point => LatLng(latitude, longitude);

  Map<String, String> get fields => {
    'latitude': latitude.toStringAsFixed(8),
    'longitude': longitude.toStringAsFixed(8),
    'location_source': source,
    if (source == 'gps' && accuracy != null)
      'location_accuracy': accuracy!.toStringAsFixed(2),
  };
}

/// Excludes temporary map labels from report addresses and shared site names.
bool isReportAddress(String? value) {
  final name = (value ?? '').trim();
  return name.isNotEmpty &&
      !RegExp(
        r'^(pinned location|device location|loading|finding (location|address|the address)|coordinates|address unavailable)\b',
        caseSensitive: false,
      ).hasMatch(name) &&
      !RegExp(r'^[-\d., ()]+$').hasMatch(name);
}
