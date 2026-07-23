import 'package:flutter/material.dart';
import 'package:easy_localization/easy_localization.dart';
import 'package:provider/provider.dart';
import '../main.dart';
import '../services/api_service.dart';
import '../utils/title_helper.dart';

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
                  const SizedBox(height: 4),
                  Builder(
                    builder: (context) {
                      final titleInfo = TitleHelper.getTitleForInfluence(profile['influencePoints'] ?? 0);
                      return Text(
                        titleInfo.title,
                        style: TextStyle(
                          color: titleInfo.color,
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                          letterSpacing: 1,
                        ),
                      );
                    },
                  ),
                  const SizedBox(height: 10),
                  Text(
                    'Орда: ${profile["ordaName"] ?? "Нет"}',
                    style: const TextStyle(fontSize: 16, color: Colors.grey),
                  ),
                  const SizedBox(height: 20),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      _buildStatColumn('ТЕРРИТОРИЯ', "${((profile['influencePoints'] ?? 0) / 1000000).toStringAsFixed(2)} км²"),
                      _buildStatColumn('ПРОБЕЖКИ', '${profile["runs"] ?? 0}'),
                      _buildStatColumn('ДИСТАНЦИЯ', '${profile["distance"]?.toStringAsFixed(1) ?? "0.0"} км'),
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
    final currentUserId = context.watch<AppState>().currentUser?.id;

    final top3 = currentList.take(3).toList();
    final restList = currentList.length > 3 ? currentList.sublist(3) : [];

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
                  const Text(
                    'РЕЙТИНГ',
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w500,
                      color: Colors.white,
                      letterSpacing: 2,
                    ),
                  ),
                  IconButton(
                    icon: const Icon(Icons.refresh, color: Colors.white),
                    onPressed: _loadData,
                  ),
                ],
              ),
              const SizedBox(height: 20),
              
              // Toggle
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
                        onTap: () => setState(() => _isOrdaMode = false),
                        child: Container(
                          decoration: BoxDecoration(
                            color: !_isOrdaMode ? Theme.of(context).colorScheme.primary : Colors.transparent,
                            borderRadius: BorderRadius.circular(22),
                          ),
                          alignment: Alignment.center,
                          child: Text(
                            '👤 Игроки',
                            style: TextStyle(
                              fontWeight: FontWeight.bold,
                              fontSize: 13,
                              color: !_isOrdaMode ? Colors.black : Colors.white,
                            ),
                          ),
                        ),
                      ),
                    ),
                    Expanded(
                      child: GestureDetector(
                        onTap: () => setState(() => _isOrdaMode = true),
                        child: Container(
                          decoration: BoxDecoration(
                            color: _isOrdaMode ? Theme.of(context).colorScheme.primary : Colors.transparent,
                            borderRadius: BorderRadius.circular(22),
                          ),
                          alignment: Alignment.center,
                          child: Text(
                            '🏴 Орды',
                            style: TextStyle(
                              fontWeight: FontWeight.bold,
                              fontSize: 13,
                              color: _isOrdaMode ? Colors.black : Colors.white,
                            ),
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 30),

              if (_isLoading)
                const Expanded(child: Center(child: CircularProgressIndicator()))
              else if (currentList.isEmpty)
                const Expanded(child: Center(child: Text('Нет данных')))
              else ...[
                _buildTop3(top3, currentUserId),
                Expanded(
                  child: ListView.builder(
                    padding: const EdgeInsets.only(bottom: 100),
                    itemCount: restList.length,
                    itemBuilder: (context, index) {
                      final item = restList[index];
                      final realIndex = index + 4;
                      return _buildListItem(item, realIndex, currentUserId);
                    },
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildTop3(List<dynamic> list, String? currentUserId) {
    if (list.isEmpty) return const SizedBox();
    
    final top1 = list.isNotEmpty ? list[0] : null;
    final top2 = list.length > 1 ? list[1] : null;
    final top3 = list.length > 2 ? list[2] : null;

    return Padding(
      padding: const EdgeInsets.only(bottom: 20),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          if (top2 != null) Expanded(child: _buildPodiumCard(top2, 2, 130, currentUserId)),
          if (top2 != null) const SizedBox(width: 12),
          if (top1 != null) Expanded(child: _buildPodiumCard(top1, 1, 160, currentUserId)),
          if (top3 != null) const SizedBox(width: 12),
          if (top3 != null) Expanded(child: _buildPodiumCard(top3, 3, 115, currentUserId)),
        ],
      ),
    );
  }

  Widget _buildPodiumCard(dynamic item, int rank, double height, String? currentUserId) {
    final scoreRaw = item['influencePoints'] ?? item['influence_points'] ?? item['score'] ?? 0;
    final score = (scoreRaw is int) ? scoreRaw : (double.tryParse(scoreRaw.toString())?.toInt() ?? 0);
    final name = item['displayName'] ?? item['name'] ?? 'Без имени';
    final isMe = currentUserId != null && item['id'] == currentUserId;
    
    String emoji = rank == 1 ? '🥇' : rank == 2 ? '🥈' : '🥉';

    return GestureDetector(
      onTap: (!_isOrdaMode && item['id'] != null) ? () => _showUserProfile(item['id']) : null,
      child: Container(
        height: height,
        padding: const EdgeInsets.all(8),
        decoration: BoxDecoration(
          color: Theme.of(context).colorScheme.surface,
          borderRadius: BorderRadius.circular(16),
          border: isMe ? Border.all(color: const Color(0xFFFFD60A), width: 1.5) : null,
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.end,
          children: [
            Text(emoji, style: const TextStyle(fontSize: 28)),
            const SizedBox(height: 8),
            Text(
              name.toString().toUpperCase(),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 11, color: Colors.white, letterSpacing: 1),
            ),
            const SizedBox(height: 4),
            Text(
              '${(score / 1000000).toStringAsFixed(2)} км²',
              style: const TextStyle(fontSize: 12, color: Color(0xFF8A9099)),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildListItem(dynamic item, int rank, String? currentUserId) {
    final scoreRaw = item['influencePoints'] ?? item['influence_points'] ?? item['score'] ?? 0;
    final score = (scoreRaw is int) ? scoreRaw : (double.tryParse(scoreRaw.toString())?.toInt() ?? 0);
    final name = item['displayName'] ?? item['name'] ?? 'Без имени';
    final isMe = currentUserId != null && item['id'] == currentUserId;

    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surface,
        borderRadius: BorderRadius.circular(12),
        border: isMe ? Border.all(color: const Color(0xFFFFD60A), width: 1.0) : null,
      ),
      child: ListTile(
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
        onTap: (!_isOrdaMode && item['id'] != null) ? () => _showUserProfile(item['id']) : null,
        leading: SizedBox(
          width: 30,
          child: Text(
            rank.toString(),
            style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Color(0xFF8A9099)),
            textAlign: TextAlign.center,
          ),
        ),
        title: Text(
          name.toString().toUpperCase(),
          style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14, color: Colors.white),
        ),
        subtitle: Builder(
          builder: (context) {
            final titleInfo = TitleHelper.getTitleForInfluence(score);
            return Text(
              titleInfo.title,
              style: TextStyle(color: titleInfo.color, fontSize: 11, fontWeight: FontWeight.bold),
            );
          },
        ),
        trailing: Text(
          (score / 1000000).toStringAsFixed(2) + ' км²',
          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Colors.white),
        ),
      ),
    );
  }
}
