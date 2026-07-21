import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../models/models.dart';
import '../main.dart';

class RunResultScreen extends StatefulWidget {
  final double distanceKm;
  final int elapsedSeconds;

  const RunResultScreen({
    super.key,
    required this.distanceKm,
    required this.elapsedSeconds,
  });

  @override
  State<RunResultScreen> createState() => _RunResultScreenState();
}

class _RunResultScreenState extends State<RunResultScreen> with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _fadeAnimation;
  late Animation<Offset> _slideAnimation;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1500),
    );
    _fadeAnimation = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(parent: _controller, curve: const Interval(0.0, 0.5, curve: Curves.easeIn)),
    );
    _slideAnimation = Tween<Offset>(begin: const Offset(0, 0.2), end: Offset.zero).animate(
      CurvedAnimation(parent: _controller, curve: const Interval(0.2, 1.0, curve: Curves.easeOutBack)),
    );

    _controller.forward();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final user = context.read<AppState>().currentUser;
    // Mock calculations for WOW effect until backend returns exact data
    final estimatedArea = (widget.distanceKm * widget.distanceKm * 0.1).toStringAsFixed(2);
    final xpEarned = (widget.distanceKm * 100).floor();
    final ordaInfluence = xpEarned * 3;

    return Scaffold(
      backgroundColor: const Color(0xFF0A0B0E),
      body: SafeArea(
        child: AnimatedBuilder(
          animation: _controller,
          builder: (context, child) {
            return FadeTransition(
              opacity: _fadeAnimation,
              child: SlideTransition(
                position: _slideAnimation,
                child: Padding(
                  padding: const EdgeInsets.all(24.0),
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      const Icon(Icons.workspace_premium, size: 100, color: Color(0xFFF5D142)),
                      const SizedBox(height: 30),
                      const Text(
                        'ЗАХВАТ УСПЕШЕН!',
                        textAlign: TextAlign.center,
                        style: TextStyle(
                          fontSize: 32,
                          fontWeight: FontWeight.bold,
                          color: Colors.white,
                          letterSpacing: 2,
                        ),
                      ),
                      const SizedBox(height: 40),
                      _buildStatRow(Icons.map, 'Новая территория', '+$estimatedArea км²'),
                      const SizedBox(height: 16),
                      _buildStatRow(Icons.star, 'Личный рейтинг', '+$xpEarned XP'),
                      const SizedBox(height: 16),
                      if (user?.ordaId != null)
                        _buildStatRow(Icons.shield, 'Влияние Орды', '+$ordaInfluence'),
                      const SizedBox(height: 50),
                      const Text(
                        '🔥🔥🔥',
                        textAlign: TextAlign.center,
                        style: TextStyle(fontSize: 40),
                      ),
                      const SizedBox(height: 50),
                      ElevatedButton(
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFFF5D142),
                          foregroundColor: Colors.black,
                          padding: const EdgeInsets.symmetric(vertical: 20),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(16),
                          ),
                        ),
                        onPressed: () {
                          Navigator.pop(context); // Go back to Map
                        },
                        child: const Text(
                          'ПРОДОЛЖИТЬ',
                          style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            );
          },
        ),
      ),
    );
  }

  Widget _buildStatRow(IconData icon, String label, String value) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.05),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFF5D142).withOpacity(0.3)),
      ),
      child: Row(
        children: [
          Icon(icon, color: const Color(0xFFF5D142), size: 28),
          const SizedBox(width: 16),
          Expanded(
            child: Text(
              label,
              style: const TextStyle(color: Colors.grey, fontSize: 16),
            ),
          ),
          Text(
            value,
            style: const TextStyle(
              color: Color(0xFFF5D142),
              fontSize: 20,
              fontWeight: FontWeight.bold,
            ),
          ),
        ],
      ),
    );
  }
}
