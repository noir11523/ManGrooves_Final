import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import 'package:url_launcher/url_launcher.dart';

class ClusterHealthMap extends StatelessWidget {
  const ClusterHealthMap({
    super.key,
    required this.clusters,
    required this.onOpenReports,
    this.tileProvider,
    this.onOpenTimeline,
  });
  final List<Map<String, dynamic>> clusters;
  final ValueChanged<int> onOpenReports;
  final TileProvider? tileProvider;
  final void Function(int id, int tab)? onOpenTimeline;

  static Color healthColor(String health) => switch (health) {
    'Healthy' => Colors.green,
    'Stressed' => Colors.orange,
    'At Risk' => Colors.red,
    _ => Colors.grey,
  };

  LatLng? _point(Map<String, dynamic> cluster) {
    final lat = double.tryParse('${cluster['latitude']}');
    final lng = double.tryParse('${cluster['longitude']}');
    if (lat == null ||
        lng == null ||
        !lat.isFinite ||
        !lng.isFinite ||
        lat.abs() > 85 ||
        lng.abs() > 180) {
      return null;
    }
    return LatLng(lat, lng);
  }

  void _open(BuildContext context, Map<String, dynamic> cluster) {
    showModalBottomSheet<void>(
      context: context,
      showDragHandle: true,
      builder: (sheet) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(20, 0, 20, 24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text(
                '${cluster['name']}',
                style: Theme.of(context).textTheme.titleLarge,
              ),
              Text(
                '${cluster['latest_health'] ?? 'Unknown'} · ${cluster['barangay_name'] ?? ''}',
              ),
              const SizedBox(height: 16),
              FilledButton(
                onPressed: () {
                  Navigator.pop(sheet);
                  onOpenReports(int.parse('${cluster['id']}'));
                },
                child: const Text('View reports'),
              ),
              if (onOpenTimeline != null) ...[
                TextButton(
                  onPressed: () {
                    Navigator.pop(sheet);
                    onOpenTimeline!(int.parse('${cluster['id']}'), 0);
                  },
                  child: const Text('Health history'),
                ),
                TextButton(
                  onPressed: () {
                    Navigator.pop(sheet);
                    onOpenTimeline!(int.parse('${cluster['id']}'), 1);
                  },
                  child: const Text('Growth timeline'),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final located = clusters.where((item) => _point(item) != null).toList();
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text(
          'Cluster health map',
          style: Theme.of(context).textTheme.titleLarge
              ?.copyWith(fontWeight: FontWeight.w700),
        ),
        const SizedBox(height: 10),
        if (located.isEmpty)
          const Card(
            child: Padding(
              padding: EdgeInsets.all(20),
              child: Text('No clusters to show yet.'),
            ),
          )
        else ...[
          const Text('Tap a marker to view reports.'),
          const SizedBox(height: 8),
          SizedBox(
            height: 300,
            child: ClipRRect(
              borderRadius: BorderRadius.circular(16),
              child: FlutterMap(
                options: MapOptions(
                  initialCenter: _point(located.first)!,
                  initialZoom: 14,
                  initialCameraFit: located.length > 1
                      ? CameraFit.bounds(
                          bounds: LatLngBounds.fromPoints(
                            located.map((item) => _point(item)!).toList(),
                          ),
                          padding: const EdgeInsets.all(35),
                          maxZoom: 16,
                        )
                      : null,
                  interactionOptions: const InteractionOptions(
                    flags: InteractiveFlag.all & ~InteractiveFlag.rotate,
                  ),
                ),
                children: [
                  TileLayer(
                    urlTemplate:
                        'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                    userAgentPackageName: 'org.mangrooves.mobile',
                    tileProvider: tileProvider,
                  ),
                  MarkerLayer(
                    markers: located
                        .map(
                          (item) => Marker(
                            point: _point(item)!,
                            width: 48,
                            height: 48,
                            child: IconButton(
                              tooltip:
                                  '${item['name']}: ${item['latest_health'] ?? 'Unknown'}',
                              icon: Icon(
                                Icons.location_on,
                                size: 36,
                                color: healthColor('${item['latest_health']}'),
                              ),
                              onPressed: () => _open(context, item),
                            ),
                          ),
                        )
                        .toList(),
                  ),
                  Align(
                    alignment: Alignment.bottomRight,
                    child: ColoredBox(
                      color: Colors.white,
                      child: TextButton(
                        onPressed: () async {
                          try {
                            await launchUrl(
                              Uri.parse(
                                'https://www.openstreetmap.org/copyright',
                              ),
                            );
                          } catch (_) {
                            /* Attribution remains visible. */
                          }
                        },
                        child: const Text(
                          '© OpenStreetMap contributors',
                          style: TextStyle(fontSize: 10),
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 8),
          Wrap(
            spacing: 12,
            runSpacing: 4,
            children: ['Healthy', 'Stressed', 'At Risk', 'Unknown']
                .map(
                  (health) => Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(Icons.circle, size: 10, color: healthColor(health)),
                      const SizedBox(width: 4),
                      Text(health),
                    ],
                  ),
                )
                .toList(),
          ),
          // A list keeps clusters accessible when map tiles are unavailable.
          ExpansionTile(
            title: Text('View ${clusters.length} clusters'),
            children: clusters
                .map(
                  (item) => ListTile(
                    title: Text('${item['name']}'),
                    subtitle: Text('${item['latest_health'] ?? 'Unknown'}'),
                    trailing: const Icon(Icons.chevron_right),
                    onTap: () => _open(context, item),
                  ),
                )
                .toList(),
          ),
        ],
      ],
    );
  }
}
