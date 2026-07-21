import 'dart:math' as math;
import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import 'package:provider/provider.dart';
import 'package:easy_localization/easy_localization.dart';
import '../models/models.dart';
import '../services/api_service.dart';
import '../services/run_tracker.dart';
import '../main.dart';
import 'package:google_polyline_algorithm/google_polyline_algorithm.dart';
class MapScreen extends StatefulWidget {
  const MapScreen({super.key});

  @override
  State<MapScreen> createState() => _MapScreenState();
}

class _MapScreenState extends State<MapScreen> {
  final ApiService _apiService = ApiService();
  List<Territory> _territories = [];
  List<RouteData> _routes = [];
  bool _isLoading = true;
  bool _isOrdaMode = false;
  bool _isDrawingMode = false;
  List<LatLng> _plannedPoints = [];
  bool _isSavingPlan = false;
  final MapController _mapController = MapController();

  int _lastRefresh = 0;

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final currentRefresh = context.watch<AppState>().lastMapRefresh;
    if (currentRefresh != _lastRefresh && _lastRefresh != 0) {
      _lastRefresh = currentRefresh;
      _loadData();
    } else if (_lastRefresh == 0) {
      _lastRefresh = currentRefresh;
    }
  }

  Future<void> _loadData() async {
    setState(() => _isLoading = true);
    // In a real app, you might want to fetch these concurrently
    final territories = await _apiService.getTerritories();
    final routes = await _apiService.getRoutes();
    
    if (mounted) {
      setState(() {
        _territories = territories;
        _routes = routes;
        _isLoading = false;
      });
    }
  }

  Color _getTerritoryColor(Territory t, AuthenticatedUser? currentUser) {
    if (_isOrdaMode) {
      // Color by Orda
      int hash = 0;
      final ordaId = t.ownerOrdaId ?? 'none';
      for (int i = 0; i < ordaId.length; i++) {
        hash = ordaId.codeUnitAt(i) + ((hash << 5) - hash);
      }
      final hue = (hash.abs() % 360).toDouble();
      return HSVColor.fromAHSV(1.0, hue, 0.7, 0.6).toColor();
    } else {
      if (currentUser != null && t.ownerId == currentUser.id) {
        return const Color(0xFFD8A760); // Primary color for self
      }
      // Color by ownerId
      int hash = 0;
      for (int i = 0; i < t.ownerId.length; i++) {
        hash = t.ownerId.codeUnitAt(i) + ((hash << 5) - hash);
      }
      final hue = (hash.abs() % 360).toDouble();
      return HSVColor.fromAHSV(1.0, hue, 0.65, 0.45).toColor();
    }
  }

  void _showUserProfile(String userId) async {
    // Show a bottom sheet with public profile
    showModalBottomSheet(
      context: context,
      backgroundColor: const Color(0xFF15181E),
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) {
        return FutureBuilder(
          future: _apiService.getUserPublicProfile(userId),
          builder: (context, snapshot) {
            if (snapshot.connectionState == ConnectionState.waiting) {
              return const SizedBox(height: 200, child: Center(child: CircularProgressIndicator()));
            }
            if (!snapshot.hasData || snapshot.data == null) {
              return const SizedBox(height: 200, child: Center(child: Text('Ошибка загрузки профиля')));
            }
            final profile = snapshot.data as Map<String, dynamic>;
            return Padding(
              padding: const EdgeInsets.all(24.0),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    (profile['displayName'] ?? 'Без имени').toUpperCase(),
                    style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: Colors.white),
                  ),
                  const SizedBox(height: 10),
                  Text(
                    'Орда: \${profile["ordaName"] ?? "Нет"}',
                    style: const TextStyle(fontSize: 16, color: Colors.grey),
                  ),
                  const SizedBox(height: 20),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      _buildStatColumn('ТЕРРИТОРИЯ', "\${((profile['influencePoints'] ?? 0) / 1000000).toStringAsFixed(2)} км²"),
                      _buildStatColumn('ПРОБЕЖКИ', '\${profile["runs"] ?? 0}'),
                      _buildStatColumn('ДИСТАНЦИЯ', '\${profile["distance"]?.toStringAsFixed(1) ?? "0.0"} км'),
                    ],
                  ),
                  const SizedBox(height: 30),
                ],
              ),
            );
          },
        );
      },
    );
  }

  Widget _buildStatColumn(String label, String value) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: const TextStyle(fontSize: 12, color: Colors.grey, letterSpacing: 1)),
        const SizedBox(height: 4),
        Text(value, style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: Colors.white)),
      ],
    );
  }

  bool _isPointInPolygon(LatLng point, List<LatLng> vs) {
    bool inside = false;
    for (int i = 0, j = vs.length - 1; i < vs.length; j = i++) {
      double xi = vs[i].longitude, yi = vs[i].latitude;
      double xj = vs[j].longitude, yj = vs[j].latitude;

      bool intersect = ((yi > point.latitude) != (yj > point.latitude))
          && (point.longitude < (xj - xi) * (point.latitude - yi) / (yj - yi) + xi);
      if (intersect) inside = !inside;
    }
    return inside;
  }

  void _handleMapTap(TapPosition tapPosition, LatLng point) {
    if (_isDrawingMode) {
      if (_plannedPoints.isEmpty || const Distance().distance(_plannedPoints.last, point) > 5) {
        setState(() => _plannedPoints.add(point));
      }
      return;
    }

    for (var territory in _territories) {
      for (var poly in territory.polygons) {
        if (_isPointInPolygon(point, poly)) {
          _showUserProfile(territory.ownerId);
          return;
        }
      }
    }
  }

  Future<void> _savePlannedRun(AuthenticatedUser currentUser) async {
    if (_plannedPoints.length < 3) return;
    setState(() => _isSavingPlan = true);
    
    double distance = 0;
    final dist = const Distance();
    for (int i = 0; i < _plannedPoints.length - 1; i++) {
      distance += dist.distance(_plannedPoints[i], _plannedPoints[i + 1]);
    }
    distance += dist.distance(_plannedPoints.last, _plannedPoints.first);
    
    final pointsList = _plannedPoints.map((p) => [p.latitude, p.longitude]).toList();
    // Do not artificially close the loop to prevent duplicate points that break ST_Node on the backend
    
    final encoded = encodePolyline(pointsList);
    
    final success = await _apiService.savePlannedRun(
      userId: currentUser.id,
      polyline: encoded,
      distance: distance,
      duration: distance / 2.5, // fake duration
    );
    
    setState(() => _isSavingPlan = false);

    if (success) {
      _loadData();
      setState(() {
        _isDrawingMode = false;
        _plannedPoints.clear();
      });
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('План успешно сохранен! Территория захвачена.')));
    } else {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Ошибка при сохранении плана.')));
    }
  }

  void _showActivityFeed() {
    showModalBottomSheet(
      context: context,
      backgroundColor: const Color(0xFF15181E),
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) {
        return FutureBuilder(
          future: _apiService.getEvents(),
          builder: (context, snapshot) {
            if (snapshot.connectionState == ConnectionState.waiting) {
              return const SizedBox(height: 300, child: Center(child: CircularProgressIndicator()));
            }
            if (!snapshot.hasData || (snapshot.data as List).isEmpty) {
              return const SizedBox(height: 300, child: Center(child: Text('Нет событий')));
            }
            final events = snapshot.data as List;
            return Container(
              height: MediaQuery.of(context).size.height * 0.6,
              padding: const EdgeInsets.all(20.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('ЛЕНТА СОБЫТИЙ', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, letterSpacing: 2, color: Colors.grey)),
                  const SizedBox(height: 20),
                  Expanded(
                    child: ListView.separated(
                      itemCount: events.length,
                      separatorBuilder: (context, index) => const Divider(color: Colors.white10),
                      itemBuilder: (context, index) {
                        final e = events[index];
                        return ListTile(
                          contentPadding: EdgeInsets.zero,
                          title: Text(e['message'] ?? '', style: const TextStyle(color: Colors.white)),
                          subtitle: Text(
                            DateTime.parse(e['created_at']).toLocal().toString().split('.')[0],
                            style: const TextStyle(color: Colors.grey, fontSize: 12),
                          ),
                          onTap: () {
                            Navigator.pop(context);
                            _showUserProfile(e['user_id']);
                          },
                        );
                      },
                    ),
                  ),
                ],
              ),
            );
          },
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final currentUser = context.watch<AppState>().currentUser;
    final runTracker = context.watch<RunTracker>();

    return Scaffold(
      body: Stack(
        children: [
          FlutterMap(
            mapController: _mapController,
            options: MapOptions(
              initialCenter: const LatLng(51.13, 71.43), // Astana coordinates
              initialZoom: 13.0,
              onTap: _handleMapTap,
              interactionOptions: const InteractionOptions(
                flags: InteractiveFlag.all,
              ),
            ),
            children: [
              TileLayer(
                urlTemplate: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
                subdomains: const ['a', 'b', 'c', 'd'],
                userAgentPackageName: 'com.ordarun.app',
                retinaMode: true,
              ),
              PolygonLayer(
                polygons: _territories.expand((t) {
                  final color = _getTerritoryColor(t, currentUser);
                  return t.polygons.map((points) => Polygon(
                    points: points,
                    color: color.withOpacity(0.4),
                    borderColor: color,
                    borderStrokeWidth: 2.0,
                  ));
                }).toList(),
              ),
              PolylineLayer(
                polylines: _routes.map((r) {
                  return Polyline(
                    points: r.coordinates,
                    color: Colors.white.withOpacity(0.5),
                    strokeWidth: 2.0,
                  );
                }).toList(),
              ),
              if (runTracker.isRecording && runTracker.routePoints.length >= 2)
                PolylineLayer(
                  polylines: [
                    Polyline(
                      points: runTracker.routePoints,
                      color: Theme.of(context).colorScheme.primary,
                      strokeWidth: 4.0,
                    ),
                  ],
                ),
              if (runTracker.isRecording && runTracker.routePoints.isNotEmpty)
                MarkerLayer(
                  markers: [
                    Marker(
                      point: runTracker.routePoints.last,
                      width: 16,
                      height: 16,
                      child: Container(
                        decoration: BoxDecoration(
                          color: Theme.of(context).colorScheme.primary,
                          shape: BoxShape.circle,
                          border: Border.all(color: Colors.white, width: 2),
                        ),
                      ),
                    ),
                  ],
                ),
                if (_isDrawingMode && _plannedPoints.length >= 3)
                  PolygonLayer(
                    polygons: [
                      Polygon(
                        points: _plannedPoints,
                        color: const Color(0xFFD8A760).withOpacity(0.3), // Gold for own plan
                        borderColor: const Color(0xFFD8A760),
                        borderStrokeWidth: 2.0,
                      ),
                    ],
                  ),
                if (_isDrawingMode && _plannedPoints.isNotEmpty)
                  PolylineLayer(
                    polylines: [
                      Polyline(
                        points: _plannedPoints,
                        color: const Color(0xFFD8A760),
                        strokeWidth: 2.0,
                      ),
                    ],
                  ),
            ],
          ),
          if (_isLoading)
            const Center(
              child: CircularProgressIndicator(),
            ),
          
          // Top HUD
          if (currentUser != null)
            Positioned(
              top: 40,
              left: 16,
              right: 16,
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                        decoration: BoxDecoration(
                          color: const Color(0xFF15181E),
                          borderRadius: BorderRadius.circular(20),
                          border: Border.all(color: Colors.white10),
                          boxShadow: const [BoxShadow(color: Colors.black26, blurRadius: 12, offset: Offset(0, 4))],
                        ),
                        child: Text(
                          currentUser.displayName.toUpperCase(),
                          style: const TextStyle(fontWeight: FontWeight.w500, fontSize: 14, color: Colors.white),
                        ),
                      ),
                      Row(
                        children: [
                          GestureDetector(
                            onTap: _showActivityFeed,
                            child: Container(
                              padding: const EdgeInsets.all(8),
                              decoration: BoxDecoration(
                                color: const Color(0xFF15181E),
                                shape: BoxShape.circle,
                                border: Border.all(color: Colors.white10),
                                boxShadow: const [BoxShadow(color: Colors.black26, blurRadius: 12, offset: Offset(0, 4))],
                              ),
                              child: const Icon(Icons.inbox_outlined, color: Colors.white, size: 18),
                            ),
                          ),
                          const SizedBox(width: 10),
                          GestureDetector(
                            onTap: () {
                              setState(() => _isOrdaMode = !_isOrdaMode);
                            },
                            child: Container(
                              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                              decoration: BoxDecoration(
                                color: _isOrdaMode ? Theme.of(context).colorScheme.primary : const Color(0xFF15181E),
                                borderRadius: BorderRadius.circular(20),
                                border: Border.all(color: Colors.white10),
                                boxShadow: const [BoxShadow(color: Colors.black26, blurRadius: 12, offset: Offset(0, 4))],
                              ),
                              child: Text(
                                (_isOrdaMode ? 'orda' : 'personal').tr().toUpperCase(),
                                style: TextStyle(
                                  fontWeight: FontWeight.bold, 
                                  fontSize: 12, 
                                  color: _isOrdaMode ? Colors.black : Colors.white,
                                ),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ],
              ),
            ),

          // Bottom HUD panel
          if (currentUser != null)
            Positioned(
              bottom: 90, // Above bottom nav
              left: 16,
              right: 16,
              child: Container(
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  color: const Color(0xFF15181E),
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: Colors.white10),
                  boxShadow: const [
                    BoxShadow(color: Colors.black45, blurRadius: 32, offset: Offset(0, 8)),
                  ],
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(
                          'your_area'.tr().toUpperCase(),
                          style: const TextStyle(fontSize: 12, color: Color(0xFF8B929C), letterSpacing: 1),
                        ),
                        const SizedBox(height: 4),
                        Row(
                          crossAxisAlignment: CrossAxisAlignment.baseline,
                          textBaseline: TextBaseline.alphabetic,
                          children: [
                            Text(
                              (currentUser.influencePoints / 1000000).toStringAsFixed(2),
                              style: const TextStyle(fontSize: 28, fontWeight: FontWeight.bold, color: Colors.white),
                            ),
                            const SizedBox(width: 4),
                            const Text(
                              'км²',
                              style: TextStyle(fontSize: 16, color: Color(0xFF8B929C)),
                            ),
                          ],
                        ),
                      ],
                    ),
                    if (_isDrawingMode) ...[
                      Row(
                        children: [
                          IconButton(
                            icon: const Icon(Icons.close, color: Colors.redAccent),
                            onPressed: () {
                              setState(() {
                                _isDrawingMode = false;
                                _plannedPoints.clear();
                              });
                            },
                          ),
                          if (_plannedPoints.isNotEmpty)
                          Padding(
                            padding: const EdgeInsets.only(right: 8.0),
                            child: IconButton(
                              icon: const Icon(Icons.undo, color: Colors.white),
                              onPressed: () {
                                setState(() {
                                  _plannedPoints.removeLast();
                                });
                              },
                            ),
                          ),
                          ElevatedButton(
                            style: ElevatedButton.styleFrom(
                              backgroundColor: Colors.white,
                              foregroundColor: Colors.black,
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
                            ),
                            onPressed: (_plannedPoints.length >= 3 && !_isSavingPlan) 
                                ? () => _savePlannedRun(currentUser) 
                                : null,
                            child: _isSavingPlan 
                                ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(color: Colors.black, strokeWidth: 2))
                                : Text('save'.tr(), style: const TextStyle(fontWeight: FontWeight.bold)),
                          ),
                        ],
                      ),
                    ] else ...[
                      ElevatedButton(
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF22C55E),
                          foregroundColor: Colors.black,
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
                        ),
                        onPressed: () {
                          setState(() => _isDrawingMode = true);
                        },
                        child: Text('plan'.tr(), style: const TextStyle(fontWeight: FontWeight.bold)),
                      ),
                    ],
                  ],
                ),
              ),
            ),
        ],
      ),
    );
  }
}
