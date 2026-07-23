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
import 'feed_modal.dart';
import 'package:google_polyline_algorithm/google_polyline_algorithm.dart';
import 'package:geolocator/geolocator.dart';
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
  
  List<Polygon> _cachedPolygons = [];
  List<Polyline> _cachedPolylines = [];
  List<Marker> _cachedCenterMarkers = [];
  List<LootDrop> _drops = [];
  final Distance _distance = const Distance();
  int _lastRefresh = 0;

  @override
  void initState() {
    super.initState();
    _loadData();
    _centerOnUser();
  }

  Future<void> _centerOnUser() async {
    bool serviceEnabled = await Geolocator.isLocationServiceEnabled();
    if (!serviceEnabled) return;

    LocationPermission permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
      if (permission == LocationPermission.denied) return;
    }
    
    if (permission == LocationPermission.deniedForever) return;

    final position = await Geolocator.getCurrentPosition();
    _mapController.move(LatLng(position.latitude, position.longitude), 15.0);
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
    final drops = await _apiService.getDrops();
    
    if (mounted) {
      setState(() {
        _territories = territories;
        _routes = routes;
        _drops = drops;
        _isLoading = false;
        _buildMapObjects(context.read<AppState>().currentUser);
      });
    }
  }

  LatLng _computeCenter(List<LatLng> points) {
    if (points.isEmpty) return const LatLng(0, 0);
    double lat = 0, lng = 0;
    for (var p in points) {
      lat += p.latitude;
      lng += p.longitude;
    }
    return LatLng(lat / points.length, lng / points.length);
  }

  void _buildMapObjects(AuthenticatedUser? currentUser) {
    _cachedPolygons = _territories.expand((t) {
      final color = _getTerritoryColor(t, currentUser);
      final double healthRatio = t.health / 100.0;
      final double fillAlpha = 0.2 + (0.1 * healthRatio);
      return t.polygons.map((points) => Polygon(
        points: points,
        color: color.withValues(alpha: fillAlpha),
        borderColor: color,
        borderStrokeWidth: 3.0,
      ));
    }).toList();

    final groupedByOwner = <String, List<Territory>>{};
    for (var t in _territories) {
      if (t.ownerId != '00000000-0000-0000-0000-000000000001') {
        groupedByOwner.putIfAbsent(t.ownerId, () => []).add(t);
      }
    }

    _cachedCenterMarkers = groupedByOwner.values.map((userTerritories) {
      // For simplicity, just place the marker on the first territory of this user
      final t = userTerritories.first;
      final isSelf = currentUser != null && t.ownerId == currentUser.id;
      final displayName = t.ownerDisplayName ?? (isSelf ? currentUser!.displayName : 'Игрок');
      final color = _getTerritoryColor(t, currentUser);
      
      // Compute center from the largest polygon or just the first one
      var largestPolygon = t.polygons.first;
      for (var poly in t.polygons) {
        if (poly.length > largestPolygon.length) {
          largestPolygon = poly;
        }
      }
      
      return Marker(
        point: _computeCenter(largestPolygon),
        width: 120,
        height: 32,
        child: Center(
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
            decoration: BoxDecoration(
              color: const Color(0xFF0D1117).withValues(alpha: 0.9),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: color.withValues(alpha: 0.8), width: 1.5),
            ),
            child: Text(
              displayName.toUpperCase(),
              style: const TextStyle(
                fontSize: 10,
                fontWeight: FontWeight.bold,
                color: Colors.white,
                letterSpacing: 0.5,
              ),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
          ),
        ),
      );
    }).toList();

    _cachedPolylines = _routes.map((r) {
      return Polyline(
        points: r.coordinates,
        color: Colors.white.withValues(alpha: 0.5),
        strokeWidth: 2.0,
      );
    }).toList();
  }

  Color _getTerritoryColor(Territory t, AuthenticatedUser? currentUser) {
    if (t.ownerId == '00000000-0000-0000-0000-000000000001') {
      return Colors.grey.shade700; // Нейтральная зона
    }
    
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
        return const Color(0xFFFFD700); // Primary color for self
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

  void _showUserProfile(Territory territory) async {
    final userId = territory.ownerId;
    if (userId == '00000000-0000-0000-0000-000000000001') {
      showModalBottomSheet(
        context: context,
        backgroundColor: const Color(0xFF15181E),
        shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
        builder: (context) => const Padding(
          padding: EdgeInsets.all(24.0),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('НЕЙТРАЛЬНАЯ ЗОНА', style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: Colors.white)),
              SizedBox(height: 10),
              Text('Эта территория пока никому не принадлежит. Пробегите через нее, чтобы присоединить к своим владениям!', style: TextStyle(fontSize: 16, color: Colors.grey)),
              SizedBox(height: 30),
            ],
          ),
        ),
      );
      return;
    }

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
                    'Орда: ${profile["ordaName"] ?? "Нет"}',
                    style: const TextStyle(fontSize: 16, color: Colors.grey),
                  ),
                  const SizedBox(height: 20),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      _buildStatColumn('ТЕРРИТОРИЯ', "${((profile['influencePoints'] ?? 0) / 1000000).toStringAsFixed(2)} км²"),
                      _buildStatColumn('ПРОБЕЖКИ', '${profile["runs"] ?? 0}'),
                      _buildStatColumn('ДИСТАНЦИЯ', '${profile["distance"]?.toStringAsFixed(1) ?? "0.0"} км'),
                    ],
                  ),
                  const SizedBox(height: 30),
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: const Color(0xFF1F222A),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: territory.health < 50 ? Colors.redAccent.withValues(alpha: 0.5) : const Color(0xFFFFD700).withValues(alpha: 0.3)),
                    ),
                    child: Column(
                      children: [
                        const Text('СОСТОЯНИЕ ТЕРРИТОРИИ', style: TextStyle(fontSize: 12, color: Colors.grey, letterSpacing: 1)),
                        const SizedBox(height: 8),
                        Text(
                          'Прочность: ${territory.health}%',
                          style: TextStyle(
                            fontSize: 18, 
                            fontWeight: FontWeight.bold, 
                            color: territory.health < 50 ? Colors.redAccent : const Color(0xFFFFD700),
                          ),
                        ),
                        if (territory.health < 100)
                          const Padding(
                            padding: EdgeInsets.only(top: 8.0),
                            child: Text('Территория разрушается из-за бездействия.', style: TextStyle(fontSize: 12, color: Colors.white70)),
                          ),
                      ],
                    ),
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
          _showUserProfile(territory);
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
      backgroundColor: Colors.transparent,
      isScrollControlled: true,
      builder: (context) => const FeedModal(),
    );
  }

  Future<void> _claimDrop(LootDrop drop) async {
    final currentUser = context.read<AppState>().currentUser;
    if (currentUser == null) return;

    try {
      final position = await Geolocator.getCurrentPosition();
      final userLatLng = LatLng(position.latitude, position.longitude);
      final dist = _distance.distance(userLatLng, drop.position);

      if (dist > 100) {
        if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Слишком далеко! Подойдите ближе (еще ${(dist - 100).toInt()} м)')));
        return;
      }

      final res = await _apiService.claimDrop(userId: currentUser.id, dropId: drop.id);
      if (res != null) {
        setState(() {
          _drops.removeWhere((d) => d.id == drop.id);
        });
        if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Вы нашли сундук! +${res['value']} ${res['type'] == 'XP_BOOST' ? 'XP' : 'Энергии'}!'), backgroundColor: Colors.green));
      } else {
        if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Не удалось забрать сундук. Возможно, его уже кто-то забрал.')));
      }
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Ошибка доступа к геопозиции')));
    }
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
              interactionOptions: InteractionOptions(
                flags: _isDrawingMode ? InteractiveFlag.none : InteractiveFlag.all,
              ),
            ),
            children: [
              TileLayer(
                urlTemplate: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
                subdomains: const ['a', 'b', 'c', 'd'],
                userAgentPackageName: 'com.ordarun.app',
                retinaMode: true,
                panBuffer: 1,
                keepBuffer: 3,
              ),
              PolygonLayer(
                polygons: _cachedPolygons,
                simplificationTolerance: 0.5,
              ),
              MarkerLayer(
                markers: _cachedCenterMarkers,
              ),
              PolylineLayer(
                polylines: _cachedPolylines,
                simplificationTolerance: 0.5,
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
                        color: const Color(0xFFFFD700).withValues(alpha: 0.5), // Gold for own plan
                        borderColor: const Color(0xFFFFD700),
                        borderStrokeWidth: 3.5,
                      ),
                    ],
                  ),
                if (_isDrawingMode && _plannedPoints.isNotEmpty)
                  PolylineLayer(
                    polylines: [
                      Polyline(
                        points: _plannedPoints,
                        color: const Color(0xFFFFD700),
                        strokeWidth: 2.0,
                      ),
                    ],
                  ),
                MarkerLayer(
                  markers: _drops.map((drop) {
                    return Marker(
                      point: drop.position,
                      width: 40,
                      height: 40,
                      child: GestureDetector(
                        onTap: () => _claimDrop(drop),
                        child: Container(
                          decoration: BoxDecoration(
                            color: drop.type == 'XP_BOOST' ? Colors.blue.withValues(alpha: 0.8) : Colors.orange.withValues(alpha: 0.8),
                            shape: BoxShape.circle,
                            border: Border.all(color: Colors.white, width: 2),
                            boxShadow: [
                              BoxShadow(
                                color: drop.type == 'XP_BOOST' ? Colors.blue : Colors.orange,
                                blurRadius: 10,
                                spreadRadius: 2,
                              ),
                            ],
                          ),
                          child: Center(
                            child: Text(
                              drop.type == 'XP_BOOST' ? '🎁' : '⚡',
                              style: const TextStyle(fontSize: 20),
                            ),
                          ),
                        ),
                      ),
                    );
                  }).toList(),
                ),
            ],
          ),
          if (_isDrawingMode)
            Positioned.fill(
              child: GestureDetector(
                behavior: HitTestBehavior.opaque,
                onPanUpdate: (details) {
                  final latlng = _mapController.camera.screenOffsetToLatLng(details.localPosition);
                  if (_plannedPoints.isEmpty || const Distance().distance(_plannedPoints.last, latlng) > 5) {
                    setState(() => _plannedPoints.add(latlng));
                  }
                },
                onTapDown: (details) {
                  final latlng = _mapController.camera.screenOffsetToLatLng(details.localPosition);
                  setState(() => _plannedPoints.add(latlng));
                },
              ),
            ),
          if (_isLoading)
            const Center(
              child: CircularProgressIndicator(),
            ),
          
          // Top Dashboard
          if (currentUser != null)
            Positioned(
              top: 50,
              left: 16,
              right: 16,
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 20),
                decoration: BoxDecoration(
                  color: const Color(0xFF0D1117).withValues(alpha: 0.95),
                  borderRadius: BorderRadius.circular(24),
                  boxShadow: const [BoxShadow(color: Colors.black45, blurRadius: 20, offset: Offset(0, 4))],
                ),
                child: Column(
                  children: [
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Container(
                          width: 64,
                          height: 64,
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            border: Border.all(color: Theme.of(context).colorScheme.primary, width: 2),
                            color: const Color(0xFF15181E),
                          ),
                          child: const Center(child: Text('👤', style: TextStyle(fontSize: 32))),
                        ),
                        const SizedBox(width: 16),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                currentUser.displayName.toUpperCase(),
                                style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 18, color: Colors.white, letterSpacing: 0.5),
                              ),
                              const SizedBox(height: 2),
                              Text(
                                'Воин II',
                                style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: Theme.of(context).colorScheme.primary),
                              ),
                              const SizedBox(height: 8),
                              Container(
                                height: 4,
                                width: 120,
                                decoration: BoxDecoration(color: Colors.white10, borderRadius: BorderRadius.circular(2)),
                                child: FractionallySizedBox(
                                  alignment: Alignment.centerLeft,
                                  widthFactor: 0.45,
                                  child: Container(
                                    decoration: BoxDecoration(color: Theme.of(context).colorScheme.primary, borderRadius: BorderRadius.circular(2)),
                                  ),
                                ),
                              ),
                              const SizedBox(height: 6),
                              const Text('450 / 1000 XP', style: TextStyle(color: Color(0xFF8A9099), fontSize: 12)),
                            ],
                          ),
                        ),
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.end,
                          children: [
                            Row(
                              children: const [
                                Text('🔥', style: TextStyle(fontSize: 16)),
                                SizedBox(width: 4),
                                Text('17', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18, color: Colors.white)),
                              ],
                            ),
                            const Text('серия дней', style: TextStyle(color: Color(0xFF8A9099), fontSize: 12)),
                          ],
                        ),
                      ],
                    ),
                    const SizedBox(height: 20),
                    Container(height: 1, color: Colors.white.withOpacity(0.05)),
                    const SizedBox(height: 16),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        _buildStatCol('${(currentUser.influencePoints / 1000000).toStringAsFixed(1)} км²', 'твоя земля'),
                        _buildStatCol('245', 'место\nв рейтинге'),
                        _buildStatCol('1.2k XP', 'до след. ранга'),
                      ],
                    ),
                  ],
                ),
              ),
            ),

          // Left side buttons
          if (currentUser != null)
            Positioned(
              top: 260,
              left: 16,
              child: Column(
                children: [
                  _buildSideButton(Icons.my_location, 'Центрировать\nкарту', _centerOnUser),
                  const SizedBox(height: 12),
                  _buildSideButton(Icons.shield_outlined, 'Защита\nтерритории', () {}),
                  const SizedBox(height: 12),
                  _buildSideButton(Icons.layers_outlined, 'Слои карты\nвкл / выкл', () {}),
                ],
              ),
            ),

          // Bottom HUD panel
          if (currentUser != null)
            Positioned(
              bottom: 90,
              left: 16,
              right: 16,
              child: Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: const Color(0xFF0D1117),
                  borderRadius: BorderRadius.circular(24),
                  border: Border.all(color: Colors.white.withOpacity(0.05)),
                  boxShadow: const [
                    BoxShadow(color: Colors.black54, blurRadius: 40, offset: Offset(0, 10)),
                  ],
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text(
                              'ВАША ОРДА',
                              style: TextStyle(fontSize: 12, color: Color(0xFF8A9099), letterSpacing: 1),
                            ),
                            const SizedBox(height: 4),
                            Row(
                              crossAxisAlignment: CrossAxisAlignment.end,
                              children: [
                                Text(
                                  (currentUser.influencePoints / 1000000).toStringAsFixed(1),
                                  style: const TextStyle(fontSize: 32, fontWeight: FontWeight.bold, color: Colors.white),
                                ),
                                const Padding(
                                  padding: EdgeInsets.only(bottom: 5, left: 4),
                                  child: Text(
                                    'км²',
                                    style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.white),
                                  ),
                                ),
                              ],
                            ),
                            const Text(
                              'площадь владений',
                              style: TextStyle(fontSize: 12, color: Color(0xFF8A9099)),
                            ),
                          ],
                        ),
                        Container(
                          width: 48,
                          height: 48,
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            border: Border.all(color: Colors.white.withOpacity(0.1), width: 1.5),
                          ),
                          child: const Icon(Icons.flag_outlined, color: Colors.white, size: 24),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    Container(
                      height: 4,
                      width: double.infinity,
                      decoration: BoxDecoration(
                        color: Colors.white10,
                        borderRadius: BorderRadius.circular(2),
                      ),
                      child: FractionallySizedBox(
                        alignment: Alignment.centerLeft,
                        widthFactor: 0.6,
                        child: Container(
                          decoration: BoxDecoration(
                            color: Theme.of(context).colorScheme.primary,
                            borderRadius: BorderRadius.circular(2),
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(height: 8),
                    const Text(
                      'До следующего ранга: 320 XP',
                      style: TextStyle(fontSize: 12, color: Color(0xFF8A9099)),
                    ),
                    const SizedBox(height: 16),
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
                          Expanded(
                            child: ElevatedButton(
                              style: ElevatedButton.styleFrom(
                                backgroundColor: Theme.of(context).colorScheme.primary,
                                foregroundColor: Colors.black,
                                padding: const EdgeInsets.symmetric(vertical: 14),
                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                              ),
                              onPressed: (_plannedPoints.length >= 3 && !_isSavingPlan) 
                                  ? () => _savePlannedRun(currentUser) 
                                  : null,
                              child: _isSavingPlan 
                                  ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(color: Colors.black, strokeWidth: 2))
                                  : Text('save'.tr(), style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                            ),
                          ),
                        ],
                      ),
                    ] else ...[
                      Row(
                        children: [
                          Expanded(
                            child: ElevatedButton.icon(
                              style: ElevatedButton.styleFrom(
                                backgroundColor: Theme.of(context).colorScheme.primary,
                                foregroundColor: Colors.black,
                                padding: const EdgeInsets.symmetric(vertical: 14),
                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                              ),
                              onPressed: () {
                                context.read<AppState>().setTabIndex(1); // Перекидывает во вкладку трекера
                              },
                              icon: const Icon(Icons.directions_run),
                              label: const Text('НАЧАТЬ ЗАХВАТ', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
                            ),
                          ),
                          const SizedBox(width: 12),
                          ElevatedButton(
                            style: ElevatedButton.styleFrom(
                              backgroundColor: const Color(0xFF15181E),
                              foregroundColor: Colors.white,
                              padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 20),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(16),
                                side: const BorderSide(color: Colors.white10),
                              ),
                            ),
                            onPressed: () => setState(() => _isDrawingMode = true),
                            child: const Text('ПЛАН', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
                          ),
                        ],
                      ),
                    ],
                    const SizedBox(height: 12),
                    const Center(
                      child: Text('Перейдите в трекер и захватите новую землю', style: TextStyle(color: Color(0xFF8A9099), fontSize: 12)),
                    ),
                  ],
                ),
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildStatCol(String top, String bottom) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.center,
      children: [
        Text(top, style: const TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold)),
        const SizedBox(height: 2),
        Text(bottom, style: const TextStyle(color: Color(0xFF8A9099), fontSize: 11), textAlign: TextAlign.center),
      ],
    );
  }

  Widget _buildSideButton(IconData icon, String tooltip, VoidCallback onTap) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: 48,
        height: 48,
        decoration: BoxDecoration(
          color: const Color(0xFF15181E).withValues(alpha: 0.8),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: Colors.white10),
        ),
        child: Icon(icon, color: Colors.white, size: 24),
      ),
    );
  }
}
