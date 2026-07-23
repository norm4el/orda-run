import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:easy_localization/easy_localization.dart';
import '../services/run_tracker.dart';
import '../services/api_service.dart';
import '../models/models.dart';
import '../main.dart';
import 'run_result_screen.dart';

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
        context.read<AppState>().triggerMapRefresh();
        
        Navigator.pushReplacement(
          context,
          MaterialPageRoute(
            builder: (context) => RunResultScreen(
              distanceKm: tracker.distanceKm,
              elapsedSeconds: tracker.elapsedSeconds,
            ),
          ),
        );
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
                            color: Colors.redAccent.withValues(alpha: 0.9),
                            borderRadius: BorderRadius.circular(30),
                            boxShadow: [
                              BoxShadow(color: Colors.redAccent.withValues(alpha: 0.5), blurRadius: 10, spreadRadius: 2),
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
                Expanded(
                  child: Container(
                    width: double.infinity,
                    color: const Color(0xFF05070A).withValues(alpha: 0.9), // almost opaque to focus on run
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const Text(
                          'ЦЕЛЬ ЗАБЕГА',
                          style: TextStyle(fontSize: 13, color: Color(0xFF8A9099), letterSpacing: 2, fontWeight: FontWeight.bold),
                        ),
                        const SizedBox(height: 8),
                        const Text(
                          'Захватить 1.50 км²',
                          style: TextStyle(fontSize: 20, color: Color(0xFFFFD60A), fontWeight: FontWeight.bold),
                        ),
                        const SizedBox(height: 40),
                        
                        // Large Circle
                        Container(
                          width: 280,
                          height: 280,
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            border: Border.all(color: Theme.of(context).colorScheme.primary, width: 6),
                          ),
                          child: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Text(
                                distanceKm,
                                style: const TextStyle(fontSize: 80, fontWeight: FontWeight.w900, color: Colors.white, height: 1, letterSpacing: -2),
                              ),
                              const Text(
                                'КМ',
                                style: TextStyle(fontSize: 16, color: Color(0xFF8A9099), letterSpacing: 2, fontWeight: FontWeight.w600),
                              ),
                              const SizedBox(height: 16),
                              Text(
                                '+${(tracker.distanceKm * 0.15).toStringAsFixed(2)} км²',
                                style: const TextStyle(fontSize: 18, color: Colors.white, fontWeight: FontWeight.bold),
                              ),
                              const Text(
                                'ЗАХВАЧЕНО',
                                style: TextStyle(fontSize: 12, color: Color(0xFF8A9099), letterSpacing: 1),
                              ),
                            ],
                          ),
                        ),
                        
                        const SizedBox(height: 40),
                        
                        // Stats Row
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                          children: [
                            _buildHudStat('темп', tracker.distanceKm > 0 ? '$paceMins:${paceSecs.toString().padLeft(2, "0")}' : '0:00'),
                            _buildHudStat('время', _formatTime(tracker.elapsedSeconds)),
                            _buildHudStat('ккал', calories.toString()),
                          ],
                        ),
                        
                        const SizedBox(height: 40),
                        
                        // Controls
                        if (tracker.isRecording)
                          _buildControlButton(
                            icon: Icons.pause_rounded,
                            color: Theme.of(context).colorScheme.primary,
                            size: 72,
                            onTap: () => _finishRun(tracker),
                          )
                        else
                          _buildControlButton(
                            icon: Icons.play_arrow_rounded,
                            color: Theme.of(context).colorScheme.primary,
                            size: 72,
                            onTap: () => tracker.startRun(),
                          ),
                        const SizedBox(height: 40),
                      ],
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

  Widget _buildControlButton({required IconData icon, required Color color, required VoidCallback onTap, double size = 72}) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: size,
        height: size,
        decoration: BoxDecoration(
          color: color,
          shape: BoxShape.circle,
          boxShadow: const [
            BoxShadow(
              color: Colors.black26,
              blurRadius: 8,
              offset: Offset(0, 4),
            ),
          ],
        ),
        child: Icon(icon, color: Colors.black, size: size * 0.5),
      ),
    );
  }
}
