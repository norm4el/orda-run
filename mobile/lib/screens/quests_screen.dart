import 'package:flutter/material.dart';
import 'package:easy_localization/easy_localization.dart';
import 'package:provider/provider.dart';
import '../services/api_service.dart';
import '../main.dart';

class QuestsScreen extends StatefulWidget {
  const QuestsScreen({super.key});

  @override
  State<QuestsScreen> createState() => _QuestsScreenState();
}

class _QuestsScreenState extends State<QuestsScreen> {
  final ApiService _apiService = ApiService();
  bool _isLoading = true;
  List<dynamic> _quests = [];

  @override
  void initState() {
    super.initState();
    _loadQuests();
  }

  Future<void> _loadQuests() async {
    final user = context.read<AppState>().currentUser;
    if (user == null) return;
    
    setState(() => _isLoading = true);
    final quests = await _apiService.getQuests(user.id);
    
    if (mounted) {
      setState(() {
        _quests = quests;
        _isLoading = false;
      });
    }
  }

  Future<void> _claim(String questId) async {
    final user = context.read<AppState>().currentUser;
    if (user == null) return;
    
    final success = await _apiService.claimQuest(user.id, questId);
    if (success && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Награда получена!')),
      );
      _loadQuests(); // Refresh
      context.read<AppState>().triggerMapRefresh(); // trigger map/profile reload
    } else if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Ошибка получения награды')),
      );
    }
  }

  bool _isDaily = true;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.transparent,
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 20.0, vertical: 10.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'ЗАДАНИЯ',
                    style: const TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w500,
                      color: Colors.white,
                      letterSpacing: 2,
                    ),
                  ),
                  IconButton(
                    icon: const Icon(Icons.refresh, color: Colors.white),
                    onPressed: _loadQuests,
                  ),
                ],
              ),
              const SizedBox(height: 20),
              
              // Toggles
              Container(
                height: 44,
                decoration: BoxDecoration(
                  color: Theme.of(context).colorScheme.surface,
                  borderRadius: BorderRadius.circular(22),
                ),
                child: Row(
                  children: [
                    Expanded(
                      child: GestureDetector(
                        onTap: () => setState(() => _isDaily = true),
                        child: Container(
                          decoration: BoxDecoration(
                            color: _isDaily ? Theme.of(context).colorScheme.primary : Colors.transparent,
                            borderRadius: BorderRadius.circular(22),
                          ),
                          alignment: Alignment.center,
                          child: Text(
                            'Ежедневные',
                            style: TextStyle(
                              color: _isDaily ? Colors.black : Colors.white,
                              fontWeight: FontWeight.bold,
                              fontSize: 13,
                            ),
                          ),
                        ),
                      ),
                    ),
                    Expanded(
                      child: GestureDetector(
                        onTap: () => setState(() => _isDaily = false),
                        child: Container(
                          decoration: BoxDecoration(
                            color: !_isDaily ? Theme.of(context).colorScheme.primary : Colors.transparent,
                            borderRadius: BorderRadius.circular(22),
                          ),
                          alignment: Alignment.center,
                          child: Text(
                            'Квесты орды',
                            style: TextStyle(
                              color: !_isDaily ? Colors.black : Colors.white,
                              fontWeight: FontWeight.bold,
                              fontSize: 13,
                            ),
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              
              const SizedBox(height: 30),
              Expanded(
                child: _isLoading
                  ? const Center(child: CircularProgressIndicator())
                  : _quests.isEmpty
                    ? const Center(child: Text('Нет доступных заданий'))
                    : ListView.separated(
                        padding: const EdgeInsets.only(bottom: 100),
                        itemCount: _quests.length,
                        separatorBuilder: (context, index) => const SizedBox(height: 12),
                        itemBuilder: (context, index) {
                          final q = _quests[index];
                          final double current = (q['progress'] ?? 0).toDouble();
                          final double target = (q['target'] ?? 1).toDouble();
                          final double ratio = (current / target).clamp(0.0, 1.0);
                          final bool isCompleted = q['completed'] ?? false;
                          final bool isClaimed = q['claimed'] ?? false;

                          return _buildQuestCard(
                            context,
                            id: q['id'],
                            title: q['title'] ?? '',
                            description: q['description'] ?? '',
                            reward: (q['reward'] ?? 0).toString(),
                            progress: ratio,
                            currentVal: current,
                            targetVal: target,
                            isCompleted: isCompleted,
                            isClaimed: isClaimed,
                          );
                        },
                      ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildQuestCard(
    BuildContext context, {
    required String id,
    required String title,
    required String description,
    required String reward,
    required double progress,
    required double currentVal,
    required double targetVal,
    required bool isCompleted,
    required bool isClaimed,
  }) {
    final bool canClaim = isCompleted && !isClaimed;
    final primaryColor = Theme.of(context).colorScheme.primary;

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surface,
        borderRadius: BorderRadius.circular(16),
      ),
      child: Column(
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Icon(Icons.explore_outlined, color: Colors.white, size: 24),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      title,
                      style: const TextStyle(fontSize: 16, color: Colors.white, fontWeight: FontWeight.bold),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      description,
                      style: const TextStyle(color: Color(0xFF8A9099), fontSize: 13),
                    ),
                    const SizedBox(height: 12),
                    if (!isClaimed) ...[
                      Text(
                        '${currentVal.toInt()} / ${targetVal.toInt()}',
                        style: const TextStyle(fontSize: 11, color: Color(0xFF8A9099)),
                      ),
                      const SizedBox(height: 4),
                      Container(
                        height: 2,
                        width: double.infinity,
                        decoration: BoxDecoration(
                          color: Colors.white10,
                          borderRadius: BorderRadius.circular(1),
                        ),
                        child: FractionallySizedBox(
                          alignment: Alignment.centerLeft,
                          widthFactor: progress,
                          child: Container(
                            decoration: BoxDecoration(
                              color: isCompleted ? primaryColor : Colors.white,
                              borderRadius: BorderRadius.circular(1),
                            ),
                          ),
                        ),
                      ),
                    ],
                  ],
                ),
              ),
              const SizedBox(width: 16),
              if (isClaimed)
                Container(
                  padding: const EdgeInsets.all(8),
                  decoration: const BoxDecoration(shape: BoxShape.circle, color: Colors.white10),
                  child: const Icon(Icons.check, color: Colors.white54, size: 16),
                )
              else
                Column(
                  children: [
                    CircleAvatar(
                      radius: 14,
                      backgroundColor: Colors.white10,
                      child: const Text('XP', style: TextStyle(fontSize: 9, color: Colors.white, fontWeight: FontWeight.bold)),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      reward,
                      style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.white),
                    ),
                  ],
                ),
            ],
          ),
          if (canClaim) ...[
            const SizedBox(height: 12),
            SizedBox(
              width: double.infinity,
              height: 36,
              child: ElevatedButton(
                style: ElevatedButton.styleFrom(
                  backgroundColor: primaryColor,
                  foregroundColor: Colors.black,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
                onPressed: () => _claim(id),
                child: const Text('Забрать награду', style: TextStyle(fontWeight: FontWeight.bold)),
              ),
            ),
          ],
        ],
      ),
    );
  }
}
