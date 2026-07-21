import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:latlong2/latlong.dart';
import 'package:geolocator/geolocator.dart';
import 'location_service.dart';

class RunTracker extends ChangeNotifier {
  final LocationService _locationService = LocationService();
  
  bool _isRecording = false;
  List<LatLng> _routePoints = [];
  double _distanceMeters = 0.0;
  int _elapsedSeconds = 0;
  Timer? _timer;
  StreamSubscription? _locationSub;

  bool get isRecording => _isRecording;
  List<LatLng> get routePoints => _routePoints;
  double get distanceKm => _distanceMeters / 1000.0;
  int get elapsedSeconds => _elapsedSeconds;

  void startRun() async {
    bool hasPerm = await _locationService.requestPermission();
    if (!hasPerm) return;

    _isRecording = true;
    _routePoints.clear();
    _distanceMeters = 0.0;
    _elapsedSeconds = 0;
    notifyListeners();

    _timer = Timer.periodic(const Duration(seconds: 1), (timer) {
      _elapsedSeconds++;
      notifyListeners();
    });

    await _locationService.startTracking();
    _locationSub = _locationService.locationStream.listen((LatLng point) {
      if (_routePoints.isNotEmpty) {
        final last = _routePoints.last;
        final d = Geolocator.distanceBetween(
          last.latitude, last.longitude,
          point.latitude, point.longitude,
        );
        _distanceMeters += d;
      }
      _routePoints.add(point);
      notifyListeners();
    });
  }

  void stopRun() {
    _isRecording = false;
    _timer?.cancel();
    _locationSub?.cancel();
    _locationService.stopTracking();
    notifyListeners();
  }
}
