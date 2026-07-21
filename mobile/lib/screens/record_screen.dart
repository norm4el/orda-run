import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:easy_localization/easy_localization.dart';
import '../services/run_tracker.dart';
import '../services/api_service.dart';
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
    return '\$h:\$m:\$s';
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
      backgroundColor: Colors.transparent,
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Header
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'capture'.tr().toUpperCase(),
                    style: const TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w500,
                      color: Color(0xFF8B929C),
                      letterSpacing: 2,
                    ),
                  ),
                  const Icon(Icons.my_location_outlined, color: Color(0xFF8B929C)),
                ],
              ),
              const SizedBox(height: 30),

              // Stats Box
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(30),
                decoration: BoxDecoration(
                  color: const Color(0xFF15181E),
                  borderRadius: BorderRadius.circular(32),
                  boxShadow: const [
                    BoxShadow(
                      color: Colors.black54,
                      blurRadius: 40,
                      offset: Offset(0, 12),
                    ),
                  ],
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _buildStatRow('kilometers'.tr(), distanceKm, isBig: true),
                    const SizedBox(height: 30),
                    _buildStatRow('time'.tr(), _formatTime(tracker.elapsedSeconds), isBig: true),
                    const SizedBox(height: 30),
                    _buildStatRow(
                      'pace'.tr(),
                      tracker.distanceKm > 0 ? '$paceMins:${paceSecs.toString().padLeft(2, "0")}' : '0:00',
                      suffix: '/км',
                    ),
                    const SizedBox(height: 30),
                    _buildStatRow('calories'.tr(), calories.toString()),
                  ],
                ),
              ),

              const Spacer(),

              // Bottom Controls
              Padding(
                padding: const EdgeInsets.only(bottom: 20),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Container(
                      padding: const EdgeInsets.all(15),
                      decoration: BoxDecoration(
                        border: Border.all(color: Colors.white10),
                        shape: BoxShape.circle,
                      ),
                      child: const Icon(Icons.lock_outline, color: Color(0xFF8B929C)),
                    ),
                    const SizedBox(width: 30),
                    GestureDetector(
                      onTap: () async {
                        if (_isSaving) return;

                        if (!tracker.isRecording) {
                          tracker.startRun();
                        } else {
                          // Stop run
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
                                  backgroundColor: Colors.red,
                                ),
                              );
                            }
                          }
                        }
                      },
                      child: Container(
                        width: 120,
                        height: 120,
                        decoration: BoxDecoration(
                          color: Colors.transparent,
                          shape: BoxShape.circle,
                          border: Border.all(color: Theme.of(context).colorScheme.primary, width: 2),
                        ),
                        child: Center(
                          child: _isSaving
                              ? const CircularProgressIndicator()
                              : Text(
                                  tracker.isRecording ? 'pause'.tr().toUpperCase() : 'start'.tr().toUpperCase(),
                            style: TextStyle(
                              color: tracker.isRecording ? Colors.white : Colors.black,
                              fontSize: 16,
                              fontWeight: FontWeight.w500,
                              letterSpacing: 1,
                            ),
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(width: 30),
                    Container(
                      padding: const EdgeInsets.all(15),
                      decoration: BoxDecoration(
                        border: Border.all(color: Colors.white10),
                        shape: BoxShape.circle,
                      ),
                      child: const Icon(Icons.my_location_outlined, color: Color(0xFF8B929C)),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 80), // space for bottom nav
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildStatRow(String label, String value, {bool isBig = false, String? suffix}) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label.toUpperCase(),
          style: const TextStyle(
            fontSize: 12,
            color: Color(0xFF8B929C),
            letterSpacing: 1,
          ),
        ),
        const SizedBox(height: 8),
        Row(
          crossAxisAlignment: CrossAxisAlignment.baseline,
          textBaseline: TextBaseline.alphabetic,
          children: [
            Text(
              value,
              style: TextStyle(
                fontSize: isBig ? 42 : 28,
                fontWeight: FontWeight.w500,
                color: Colors.white,
                height: 1,
              ),
            ),
            if (suffix != null)
              Padding(
                padding: const EdgeInsets.only(left: 4),
                child: Text(
                  suffix,
                  style: const TextStyle(
                    fontSize: 16,
                    color: Color(0xFF8B929C),
                  ),
                ),
              ),
          ],
        ),
      ],
    );
  }
}
