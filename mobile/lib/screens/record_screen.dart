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

    if (!tracker.isRecording) {
      // ----------------------------------------
      // IDLE STATE (Image 1) - Full screen, no map
      // ----------------------------------------
      return Scaffold(
        backgroundColor: const Color(0xFF05070A), // Solid dark background
        body: Stack(
          children: [
            SafeArea(
              child: Column(
                children: [
                  const SizedBox(height: 20),
                  const Text(
                    'ЦЕЛЬ ЗАБЕГА',
                    style: TextStyle(fontSize: 12, color: Color(0xFF8A9099), letterSpacing: 2, fontWeight: FontWeight.w600),
                  ),
                  const SizedBox(height: 8),
                  const Text(
                    'Захватить 1.50 км²',
                    style: TextStyle(fontSize: 18, color: Colors.white, fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 50),
                  
                  // Large Circle
                  Center(
                    child: Container(
                      width: 320,
                      height: 320,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        color: const Color(0xFF0D1117), // very dark circle bg
                        border: Border.all(color: Colors.white.withOpacity(0.05), width: 2),
                      ),
                      child: Stack(
                        alignment: Alignment.center,
                        children: [
                          // Top arc (yellow progress indicator)
                          Positioned(
                            top: 0,
                            child: Container(
                              width: 12,
                              height: 12,
                              decoration: BoxDecoration(
                                shape: BoxShape.circle,
                                color: Theme.of(context).colorScheme.primary,
                                boxShadow: [
                                  BoxShadow(color: Theme.of(context).colorScheme.primary.withOpacity(0.5), blurRadius: 10)
                                ],
                              ),
                            ),
                          ),
                          Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Text(
                                distanceKm,
                                style: const TextStyle(fontSize: 96, fontWeight: FontWeight.w600, color: Colors.white, height: 1, letterSpacing: -2),
                              ),
                              const Text(
                                'КМ',
                                style: TextStyle(fontSize: 16, color: Color(0xFF8A9099), letterSpacing: 2, fontWeight: FontWeight.w600),
                              ),
                              const SizedBox(height: 24),
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                                decoration: BoxDecoration(
                                  color: Colors.white.withOpacity(0.03),
                                  borderRadius: BorderRadius.circular(30),
                                  border: Border.all(color: Colors.white.withOpacity(0.05)),
                                ),
                                child: Column(
                                  children: [
                                    Text(
                                      '+${(tracker.distanceKm * 0.15).toStringAsFixed(2)} км²',
                                      style: TextStyle(fontSize: 16, color: Theme.of(context).colorScheme.primary, fontWeight: FontWeight.bold),
                                    ),
                                    const SizedBox(height: 4),
                                    const Text(
                                      'ЗАХВАЧЕНО',
                                      style: TextStyle(fontSize: 10, color: Color(0xFF8A9099), letterSpacing: 1),
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ),
                  
                  const Spacer(),
                  
                  // Stats Row
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                    children: [
                      _buildIdleStatItem(Icons.av_timer_rounded, '0:00', 'ТЕМП'),
                      Container(width: 1, height: 40, color: Colors.white.withOpacity(0.1)),
                      _buildIdleStatItem(Icons.timer_outlined, '00:00:00', 'ВРЕМЯ'),
                      Container(width: 1, height: 40, color: Colors.white.withOpacity(0.1)),
                      _buildIdleStatItem(Icons.local_fire_department_outlined, '0', 'ККАЛ'),
                    ],
                  ),
                  
                  const Spacer(),
                  
                  // Play Button
                  GestureDetector(
                    onTap: () => tracker.startRun(),
                    child: Container(
                      width: 88,
                      height: 88,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        color: Theme.of(context).colorScheme.primary,
                        boxShadow: [
                          BoxShadow(color: Theme.of(context).colorScheme.primary.withOpacity(0.2), blurRadius: 20, spreadRadius: 5),
                        ],
                      ),
                      child: const Center(
                        child: Icon(Icons.play_arrow_rounded, color: Colors.black, size: 48),
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),
                  const Text('Нажмите для начала', style: TextStyle(color: Color(0xFF8A9099), fontSize: 13)),
                  const SizedBox(height: 40),
                ],
              ),
            ),
            if (_isSaving)
              Container(color: Colors.black54, child: const Center(child: CircularProgressIndicator(color: Colors.white))),
          ],
        ),
      );
    } else {
      // ----------------------------------------
      // RUNNING STATE (Image 2) - Map is visible
      // ----------------------------------------
      return Scaffold(
        backgroundColor: Colors.transparent, // Map shows through
        body: Stack(
          children: [
            // Bottom Compact Panel
            Positioned(
              bottom: 90,
              left: 16,
              right: 16,
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
                decoration: BoxDecoration(
                  color: const Color(0xFF0D1117).withValues(alpha: 0.95),
                  borderRadius: BorderRadius.circular(32),
                  border: Border.all(color: Colors.white.withOpacity(0.05)),
                  boxShadow: const [BoxShadow(color: Colors.black45, blurRadius: 20, offset: Offset(0, 10))],
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  crossAxisAlignment: CrossAxisAlignment.center,
                  children: [
                    // Left Stats
                    Expanded(
                      flex: 1,
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Text(
                            distanceKm,
                            style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: Colors.white, height: 1.1),
                          ),
                          const Text('KM', style: TextStyle(fontSize: 10, color: Color(0xFF8A9099), letterSpacing: 1, fontWeight: FontWeight.bold)),
                          const SizedBox(height: 8),
                          Text(
                            '+${(tracker.distanceKm * 0.15).toStringAsFixed(2)} км²',
                            style: TextStyle(fontSize: 13, color: Theme.of(context).colorScheme.primary, fontWeight: FontWeight.bold),
                          ),
                          const Text('ЗАХВАЧЕНО', style: TextStyle(fontSize: 10, color: Color(0xFF8A9099), letterSpacing: 1)),
                          const SizedBox(height: 4),
                          Container(
                            height: 2,
                            width: 60,
                            color: Theme.of(context).colorScheme.primary,
                          ),
                        ],
                      ),
                    ),
                    
                    // Stop Button
                    GestureDetector(
                      onTap: () => _finishRun(tracker),
                      child: Container(
                        width: 76,
                        height: 76,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          color: Theme.of(context).colorScheme.primary,
                          border: Border.all(color: const Color(0xFF0D1117), width: 6), // Inner stroke effect
                          boxShadow: [
                            BoxShadow(color: Colors.black.withOpacity(0.5), blurRadius: 10, offset: const Offset(0, 4)),
                          ],
                        ),
                        child: Center(
                          child: Container(
                            width: 24,
                            height: 24,
                            decoration: BoxDecoration(
                              color: Colors.black,
                              borderRadius: BorderRadius.circular(4),
                            ),
                          ),
                        ),
                      ),
                    ),
                    
                    // Right Stats
                    Expanded(
                      flex: 1,
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.end,
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Text(
                            tracker.distanceKm > 0 ? '$paceMins:${paceSecs.toString().padLeft(2, "0")}' : '0:00',
                            style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.white),
                          ),
                          const Text('ТЕМП', style: TextStyle(fontSize: 10, color: Color(0xFF8A9099), letterSpacing: 1)),
                          const SizedBox(height: 12),
                          Text(
                            _formatTime(tracker.elapsedSeconds),
                            style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.white),
                          ),
                          const Text('ВРЕМЯ', style: TextStyle(fontSize: 10, color: Color(0xFF8A9099), letterSpacing: 1)),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),
            
            if (_isSaving)
              Container(color: Colors.black54, child: const Center(child: CircularProgressIndicator(color: Colors.white))),
          ],
        ),
      );
    }
  }

  Widget _buildIdleStatItem(IconData icon, String value, String label) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(icon, color: Theme.of(context).colorScheme.primary, size: 28),
        const SizedBox(height: 8),
        Text(value, style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: Colors.white)),
        const SizedBox(height: 4),
        Text(label, style: const TextStyle(fontSize: 11, color: Color(0xFF8B929C), letterSpacing: 1.5, fontWeight: FontWeight.w500)),
      ],
    );
  }
}
