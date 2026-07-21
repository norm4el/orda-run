import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:easy_localization/easy_localization.dart';
import '../services/run_tracker.dart';
import '../services/api_service.dart';
import '../models/models.dart';
import '../main.dart';

class RecordScreen extends StatefulWidget {
  const RecordScreen({super.key});

  @override
  State<RecordScreen> createState() => _RecordScreenState();
}

class _RecordScreenState extends State<RecordScreen> {
  final ApiService _apiService = ApiService();
  bool _isSaving = false;

  String _formatTime(int seconds) {
    final h = (seconds / 3600).floor().toString().padLeft(2, '0');
    final m = ((seconds % 3600) / 60).floor().toString().padLeft(2, '0');
    final s = (seconds % 60).toString().padLeft(2, '0');
    if (seconds >= 3600) return '$h:$m:$s';
    return '$m:$s';
  }

  Future<void> _finishRun(RunTracker tracker) async {
    if (_isSaving) return;
    tracker.stopRun();
    
    if (tracker.routePoints.length < 2) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('too_short'.tr())),
      );
      return;
    }

    final currentUser = context.read<AppState>().currentUser;
    if (currentUser == null) return;

    setState(() => _isSaving = true);
    final success = await _apiService.saveManualRun(
      tracker.routePoints,
      tracker.distanceKm,
      tracker.elapsedSeconds,
      currentUser.id,
    );
    
    if (mounted) {
      setState(() => _isSaving = false);
      if (success) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Маршрут сохранен!'.tr()),
            backgroundColor: Colors.green,
          ),
        );
        context.read<AppState>().triggerMapRefresh();
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Ошибка сохранения'.tr()),
            backgroundColor: Colors.redAccent,
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final tracker = context.watch<RunTracker>();
    final distanceKm = (tracker.distanceKm).toStringAsFixed(2);
    final currentPace = tracker.distanceKm > 0 ? (tracker.elapsedSeconds / 60) / tracker.distanceKm : 0;
    final paceMins = currentPace.floor();
    final paceSecs = ((currentPace - paceMins) * 60).floor();
    final calories = (tracker.distanceKm * 1000 * 0.07).floor();

    return Scaffold(
      backgroundColor: Colors.transparent, // Important: lets the MapScreen show through
      body: Stack(
        children: [
          SafeArea(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                // Top Indicator (Recording dot)
                Padding(
                  padding: const EdgeInsets.only(top: 20.0),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      if (tracker.isRecording)
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                          decoration: BoxDecoration(
                            color: Colors.redAccent.withOpacity(0.9),
                            borderRadius: BorderRadius.circular(30),
                            boxShadow: [
                              BoxShadow(color: Colors.redAccent.withOpacity(0.5), blurRadius: 10, spreadRadius: 2),
                            ],
                          ),
                          child: const Row(
                            children: [
                              Icon(Icons.fiber_manual_record, color: Colors.white, size: 14),
                              SizedBox(width: 8),
                              Text('REC', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, letterSpacing: 2)),
                            ],
                          ),
                        ),
                    ],
                  ),
                ),
                
                // Bottom HUD with Glassmorphism
                ClipRRect(
                  borderRadius: const BorderRadius.vertical(top: Radius.circular(40)),
                  child: BackdropFilter(
                    filter: ImageFilter.blur(sigmaX: 15, sigmaY: 15),
                    child: Container(
                      width: double.infinity,
                      padding: const EdgeInsets.fromLTRB(30, 40, 30, 100), // extra padding for bottom nav
                      decoration: BoxDecoration(
                        color: const Color(0xFF0A0B0E).withOpacity(0.65),
                        border: const Border(
                          top: BorderSide(color: Colors.white24, width: 1.5),
                        ),
                      ),
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          // Main Distance
                          Text(
                            distanceKm,
                            style: const TextStyle(
                              fontSize: 80,
                              fontWeight: FontWeight.w900,
                              color: Colors.white,
                              height: 1,
                              letterSpacing: -2,
                            ),
                          ),
                          const SizedBox(height: 5),
                          Text(
                            'kilometers'.tr().toUpperCase(),
                            style: const TextStyle(
                              fontSize: 14,
                              color: Color(0xFF8B929C),
                              letterSpacing: 4,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                          const SizedBox(height: 40),
                          
                          // Secondary Stats Row
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                            children: [
                              _buildHudStat('time'.tr(), _formatTime(tracker.elapsedSeconds)),
                              Container(width: 1, height: 40, color: Colors.white24),
                              _buildHudStat('pace'.tr(), tracker.distanceKm > 0 ? '$paceMins:${paceSecs.toString().padLeft(2, "0")}' : '0:00'),
                              Container(width: 1, height: 40, color: Colors.white24),
                              _buildHudStat('calories'.tr(), calories.toString()),
                            ],
                          ),
                          
                          const SizedBox(height: 40),
                          
                          // Controls
                          Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              if (tracker.isRecording) ...[
                                _buildControlButton(
                                  icon: Icons.stop_rounded,
                                  color: Colors.redAccent,
                                  onTap: () => _finishRun(tracker),
                                ),
                              ] else ...[
                                _buildControlButton(
                                  icon: Icons.play_arrow_rounded,
                                  color: Theme.of(context).colorScheme.primary,
                                  size: 80,
                                  onTap: () => tracker.startRun(),
                                ),
                              ],
                            ],
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
          
          if (_isSaving)
            Container(
              color: Colors.black54,
              child: const Center(
                child: CircularProgressIndicator(color: Colors.white),
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildHudStat(String label, String value) {
    return Column(
      children: [
        Text(
          value,
          style: const TextStyle(
            fontSize: 28,
            fontWeight: FontWeight.bold,
            color: Colors.white,
          ),
        ),
        const SizedBox(height: 4),
        Text(
          label.toUpperCase(),
          style: const TextStyle(
            fontSize: 11,
            color: Color(0xFF8B929C),
            letterSpacing: 1.5,
            fontWeight: FontWeight.w500,
          ),
        ),
      ],
    );
  }

  Widget _buildControlButton({required IconData icon, required Color color, required VoidCallback onTap, double size = 70}) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: size,
        height: size,
        decoration: BoxDecoration(
          color: color,
          shape: BoxShape.circle,
          boxShadow: [
            BoxShadow(
              color: color.withOpacity(0.4),
              blurRadius: 20,
              spreadRadius: 5,
            ),
          ],
        ),
        child: Icon(icon, color: Colors.white, size: size * 0.5),
      ),
    );
  }
}
