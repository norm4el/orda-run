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

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.transparent,
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(20.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'quests'.tr().toUpperCase(),
                    style: const TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w500,
                      color: Colors.grey,
                      letterSpacing: 2,
                    ),
                  ),
                  IconButton(
                    icon: const Icon(Icons.refresh, color: Colors.grey),
                    onPressed: _loadQuests,
                  ),
                ],
              ),
              const SizedBox(height: 30),
              Text(
                'daily_quests'.tr().toUpperCase(),
                style: const TextStyle(
                  fontSize: 14,
                  color: Colors.grey,
                  letterSpacing: 2,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 10),
              Text(
                'q_desc'.tr(),
                style: const TextStyle(color: Colors.white70),
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
                        separatorBuilder: (context, index) => const SizedBox(height: 16),
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
                            reward: "+ \${q['reward']} XP",
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
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.05),
        borderRadius: BorderRadius.circular(16),
        border: Border(
          left: BorderSide(
            color: isCompleted ? primaryColor : Colors.white10,
            width: 4,
          ),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      title,
                      style: const TextStyle(
                        fontSize: 18,
                        color: Colors.white,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      description,
                      style: const TextStyle(color: Color(0xFF8B929C), fontSize: 13),
                    ),
                  ],
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                decoration: BoxDecoration(
                  color: isClaimed ? Colors.white10 : const Color.fromRGBO(216, 167, 96, 0.2),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  isClaimed ? 'Выполнено' : reward,
                  style: TextStyle(
                    color: isClaimed ? Colors.grey : primaryColor,
                    fontWeight: FontWeight.bold,
                    fontSize: 12,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 15),
          
          if (!isClaimed) ...[
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text('q_prog'.tr(), style: const TextStyle(fontSize: 12, color: Color(0xFF8B929C))),
                Text('\${currentVal.toInt()} / \${targetVal.toInt()}', style: const TextStyle(fontSize: 12, color: Color(0xFF8B929C))),
              ],
            ),
            const SizedBox(height: 8),
            Container(
              height: 8,
              width: double.infinity,
              decoration: BoxDecoration(
                color: Colors.white10,
                borderRadius: BorderRadius.circular(4),
              ),
              child: FractionallySizedBox(
                alignment: Alignment.centerLeft,
                widthFactor: progress,
                child: Container(
                  decoration: BoxDecoration(
                    color: isCompleted ? primaryColor : const Color(0xFF4CAF50),
                    borderRadius: BorderRadius.circular(4),
                  ),
                ),
              ),
            ),
          ],

          if (canClaim) ...[
            const SizedBox(height: 16),
            SizedBox(
              width: double.infinity,
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
