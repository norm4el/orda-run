import 'package:flutter/material.dart';
import 'package:easy_localization/easy_localization.dart';
import '../services/api_service.dart';

class LeaderboardScreen extends StatefulWidget {
  const LeaderboardScreen({super.key});

  @override
  State<LeaderboardScreen> createState() => _LeaderboardScreenState();
}

class _LeaderboardScreenState extends State<LeaderboardScreen> {
  final ApiService _apiService = ApiService();
  bool _isLoading = true;
  bool _isOrdaMode = false;
  
  List<dynamic> _personalLeaderboard = [];
  List<dynamic> _ordaLeaderboard = [];

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    setState(() => _isLoading = true);
    final pData = await _apiService.getLeaderboard();
    final oData = await _apiService.getOrdaLeaderboard();
    
    if (mounted) {
      setState(() {
        _personalLeaderboard = pData;
        _ordaLeaderboard = oData;
        _isLoading = false;
      });
    }
  }

  void _showUserProfile(String userId) {
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
                    'Орда: \${profile["ordaName"] ?? "Нет"}',
                    style: const TextStyle(fontSize: 16, color: Colors.grey),
                  ),
                  const SizedBox(height: 20),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      _buildStatColumn('ТЕРРИТОРИЯ', "\${((profile['influencePoints'] ?? 0) / 1000000).toStringAsFixed(2)} км²"),
                      _buildStatColumn('ПРОБЕЖКИ', '\${profile["runs"] ?? 0}'),
                      _buildStatColumn('ДИСТАНЦИЯ', '\${profile["distance"]?.toStringAsFixed(1) ?? "0.0"} км'),
                    ],
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

  @override
  Widget build(BuildContext context) {
    final currentList = _isOrdaMode ? _ordaLeaderboard : _personalLeaderboard;

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
                    'leaderboard'.tr().toUpperCase(),
                    style: const TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w500,
                      color: Colors.grey,
                      letterSpacing: 2,
                    ),
                  ),
                  IconButton(
                    icon: const Icon(Icons.refresh, color: Colors.grey),
                    onPressed: _loadData,
                  ),
                ],
              ),
              const SizedBox(height: 20),
              
              // Toggle
              Container(
                decoration: BoxDecoration(
                  color: Colors.white.withOpacity(0.05),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Row(
                  children: [
                    Expanded(
                      child: GestureDetector(
                        onTap: () => setState(() => _isOrdaMode = false),
                        child: Container(
                          padding: const EdgeInsets.symmetric(vertical: 12),
                          decoration: BoxDecoration(
                            color: !_isOrdaMode ? Theme.of(context).colorScheme.primary : Colors.transparent,
                            borderRadius: BorderRadius.circular(12),
                          ),
                          alignment: Alignment.center,
                          child: Text(
                            'Игроки',
                            style: TextStyle(
                              fontWeight: FontWeight.bold,
                              color: !_isOrdaMode ? Colors.black : Colors.white70,
                            ),
                          ),
                        ),
                      ),
                    ),
                    Expanded(
                      child: GestureDetector(
                        onTap: () => setState(() => _isOrdaMode = true),
                        child: Container(
                          padding: const EdgeInsets.symmetric(vertical: 12),
                          decoration: BoxDecoration(
                            color: _isOrdaMode ? Theme.of(context).colorScheme.primary : Colors.transparent,
                            borderRadius: BorderRadius.circular(12),
                          ),
                          alignment: Alignment.center,
                          child: Text(
                            'Орды',
                            style: TextStyle(
                              fontWeight: FontWeight.bold,
                              color: _isOrdaMode ? Colors.black : Colors.white70,
                            ),
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 20),

              Text(
                'rank_by_area'.tr().toUpperCase(),
                style: const TextStyle(
                  fontSize: 14,
                  color: Colors.grey,
                  letterSpacing: 2,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 20),
              
              Expanded(
                child: _isLoading
                  ? const Center(child: CircularProgressIndicator())
                  : currentList.isEmpty
                    ? const Center(child: Text('Нет данных'))
                    : ListView.separated(
                        padding: const EdgeInsets.only(bottom: 100),
                        itemCount: currentList.length,
                        separatorBuilder: (context, index) => const Divider(color: Colors.white10),
                        itemBuilder: (context, index) {
                          final item = currentList[index];
                          // In personal it's item['influence_points'], in orda it's item['score'] (which we return as 'score')
                          // wait, let's look at getLeaderboard vs getOrdaLeaderboard.
                          // getLeaderboard in backend: 'score' (since we did AS score? No, backend leaderboard usually does influence_points AS score or just influence_points).
                          // Let's normalize it here.
                          final scoreRaw = item['influencePoints'] ?? item['influence_points'] ?? item['score'] ?? 0;
                          final score = (scoreRaw is int) ? scoreRaw : (double.tryParse(scoreRaw.toString())?.toInt() ?? 0);
                          final name = item['displayName'] ?? item['name'] ?? 'Без имени';

                          return ListTile(
                            contentPadding: EdgeInsets.zero,
                            onTap: (!_isOrdaMode && item['id'] != null) ? () => _showUserProfile(item['id']) : null,
                            leading: Text(
                              '\${index + 1}',
                              style: const TextStyle(
                                fontSize: 20,
                                fontWeight: FontWeight.bold,
                                color: Colors.grey,
                              ),
                            ),
                            title: Text(
                              name.toString().toUpperCase(),
                              style: const TextStyle(
                                fontWeight: FontWeight.w500,
                                fontSize: 16,
                                letterSpacing: 1,
                              ),
                            ),
                            trailing: Container(
                              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                              decoration: BoxDecoration(
                                color: Colors.white10,
                                borderRadius: BorderRadius.circular(20),
                              ),
                              child: Text(
                                (score / 1000000).toStringAsFixed(2),
                                style: const TextStyle(fontWeight: FontWeight.bold),
                              ),
                            ),
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
}
