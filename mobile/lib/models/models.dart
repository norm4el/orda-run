import 'package:latlong2/latlong.dart';

class Territory {
  final String id;
  final String ownerId;
  final String? ownerOrdaId;
  final String? ownerDisplayName;
  final int ownerInfluencePoints;
  // Simplifying polygon for now to a list of points per polygon ring
  final List<List<LatLng>> polygons;

  Territory({
    required this.id,
    required this.ownerId,
    this.ownerOrdaId,
    this.ownerDisplayName,
    required this.ownerInfluencePoints,
    required this.polygons,
  });

  factory Territory.fromJson(Map<String, dynamic> json) {
    // Parsing GeoJSON format for Polygon or MultiPolygon
    List<List<LatLng>> multiPolygons = [];
    
    if (json['polygon'] != null && json['polygon']['coordinates'] != null) {
      try {
        final type = json['polygon']['type'];
        final coords = json['polygon']['coordinates'] as List;
        
        if (type == 'Polygon') {
          List<LatLng> points = [];
          final ring = coords[0] as List; // Outer ring
          for (var point in ring) {
            points.add(LatLng((point[1] as num).toDouble(), (point[0] as num).toDouble())); // GeoJSON is [lng, lat]
          }
          multiPolygons.add(points);
        } else if (type == 'MultiPolygon') {
          for (var poly in coords) {
            List<LatLng> points = [];
            final ring = poly[0] as List; // Outer ring of this polygon
            for (var point in ring) {
              points.add(LatLng((point[1] as num).toDouble(), (point[0] as num).toDouble()));
            }
            multiPolygons.add(points);
          }
        }
      } catch (e) {
        print('Error parsing polygon for territory ${json['id']}: $e');
      }
    }

    return Territory(
      id: json['id'],
      ownerId: json['owner_id'],
      ownerOrdaId: json['owner_orda_id'],
      ownerDisplayName: json['owner_display_name'],
      ownerInfluencePoints: (json['owner_influence_points'] as num?)?.toInt() ?? 0,
      polygons: multiPolygons,
    );
  }
}

class RouteData {
  final String id;
  final String ownerId;
  final List<LatLng> coordinates;

  RouteData({
    required this.id,
    required this.ownerId,
    required this.coordinates,
  });

  factory RouteData.fromJson(Map<String, dynamic> json) {
    List<LatLng> points = [];
    if (json['coordinates'] != null) {
      final coords = json['coordinates'] as List;
      for (var point in coords) {
        points.add(LatLng((point[1] as num).toDouble(), (point[0] as num).toDouble())); // assuming [lng, lat] from backend
      }
    }

    return RouteData(
      id: json['id'],
      ownerId: json['owner_id'],
      coordinates: points,
    );
  }
}
