import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:easy_localization/easy_localization.dart';
import 'package:url_launcher/url_launcher.dart';
import '../services/api_service.dart';
import '../utils/title_helper.dart';
import '../main.dart';
import 'orda_screen.dart';

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key});

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  final ApiService _apiService = ApiService();
  bool _isSyncingStrava = false;
  Future<Map<String, dynamic>?>? _statsFuture;

  @override
  void initState() {
    super.initState();
    // Delay fetching stats until context is ready to read current user
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final user = context.read<AppState>().currentUser;
      if (user != null) {
        setState(() {
          _statsFuture = _apiService.getUserStats(user.id);
        });
      }
    });
  }

  void _connectStrava() async {
    // В реальном приложении здесь должен открываться WebView / url_launcher
    // для OAuth флоу со Strava.
    final user = context.read<AppState>().currentUser;
    if (user == null) return;
    
    // Hardcoded OAuth URL
    final url = Uri.parse('https://www.strava.com/oauth/mobile/authorize?client_id=127394&redirect_uri=https://f0bd-212-98-154-152.ngrok-free.app/api/strava/callback?user_id=${user.id}&response_type=code&approval_prompt=auto&scope=activity:read_all');
    try {
      if (!await launchUrl(url, mode: LaunchMode.externalApplication)) {
        print('Could not launch url');
      }
    } catch (e) {
      print(e);
    }
  }

  void _showHistoryModal() {
    final user = context.read<AppState>().currentUser;
    if (user == null) return;

    showModalBottomSheet(
      context: context,
      backgroundColor: const Color(0xFF15181E),
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) {
        return FutureBuilder(
          future: _apiService.getUserRoutes(user.id),
          builder: (context, snapshot) {
            if (snapshot.connectionState == ConnectionState.waiting) {
              return const SizedBox(height: 300, child: Center(child: CircularProgressIndicator()));
            }
            if (!snapshot.hasData || (snapshot.data as List).isEmpty) {
              return const SizedBox(height: 300, child: Center(child: Text('Нет истории забегов')));
            }
            final routes = snapshot.data as List;
            return Container(
              height: MediaQuery.of(context).size.height * 0.7,
              padding: const EdgeInsets.all(20.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('history'.tr().toUpperCase(), style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, letterSpacing: 2, color: Colors.grey)),
                  const SizedBox(height: 20),
                  Expanded(
                    child: ListView.separated(
                      itemCount: routes.length,
                      separatorBuilder: (context, index) => const Divider(color: Colors.white10),
                      itemBuilder: (context, index) {
                        final r = routes[index];
                        final distance = (r['distance'] as num?) ?? 0;
                        final duration = (r['duration'] as num?) ?? 0;
                        
                        int minutes = duration ~/ 60;
                        int seconds = duration.toInt() % 60;
                        
                        return ListTile(
                          contentPadding: EdgeInsets.zero,
                          title: Text(
                            DateTime.parse(r['created_at']).toLocal().toString().split('.')[0],
                            style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
                          ),
                          subtitle: Text(
                            '${distance.toStringAsFixed(2)} км • $minutes:${seconds.toString().padLeft(2, '0')}',
                            style: const TextStyle(color: Colors.grey),
                          ),
                          trailing: const Icon(Icons.map, color: Colors.white54),
                        );
                      },
                    ),
                  ),
                ],
              ),
            );
          },
        );
      },
    );
  }

  void _syncStrava() async {
    final user = context.read<AppState>().currentUser;
    if (user != null) await _handleStravaSync(user.id);
  }

  Future<void> _handleStravaSync(String userId) async {
    setState(() => _isSyncingStrava = true);
    final success = await _apiService.syncStrava(userId);
    if (mounted) {
      setState(() => _isSyncingStrava = false);
      if (success) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Strava успешно синхронизирована!'), backgroundColor: Colors.green),
        );
        context.read<AppState>().triggerMapRefresh();
        setState(() {
          _statsFuture = _apiService.getUserStats(userId);
        });
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Ошибка синхронизации Strava'), backgroundColor: Colors.red),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final currentUser = context.watch<AppState>().currentUser;

    return Scaffold(
      backgroundColor: Colors.transparent, // Let parent background show if any
      body: currentUser == null
          ? Center(child: Text('need_auth'.tr()))
          : SafeArea(
              child: ListView(
                padding: const EdgeInsets.all(20),
                children: [
                  // Top Row
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        'profile'.tr().toUpperCase(),
                        style: const TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w500,
                          color: Color(0xFF8B929C),
                          letterSpacing: 2,
                        ),
                      ),
                      const Icon(Icons.settings_outlined, color: Color(0xFF8B929C)),
                    ],
                  ),
                  const SizedBox(height: 30),

                  // Profile Info
                  Row(
                    children: [
                      Container(
                        width: 80,
                        height: 80,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          border: Border.all(
                              color: Theme.of(context).colorScheme.primary,
                              width: 2),
                        ),
                        child: Icon(Icons.person_outline,
                            size: 40,
                            color: Theme.of(context).colorScheme.primary),
                      ),
                      const SizedBox(width: 20),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              currentUser.displayName.toUpperCase(),
                              style: const TextStyle(
                                fontSize: 20,
                                fontWeight: FontWeight.w500,
                                letterSpacing: 1,
                                color: Colors.white,
                              ),
                            ),
                            const SizedBox(height: 4),
                            Builder(
                              builder: (context) {
                                final titleInfo = TitleHelper.getTitleForInfluence(currentUser.influencePoints);
                                return Text(
                                  titleInfo.title,
                                  style: TextStyle(
                                    color: titleInfo.color,
                                    fontSize: 14,
                                    fontWeight: FontWeight.bold,
                                    letterSpacing: 1,
                                  ),
                                );
                              },
                            ),
                            const SizedBox(height: 8),
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Text(
                                  'tracker'.tr().toUpperCase(),
                                  style: TextStyle(
                                    color: Theme.of(context).colorScheme.primary,
                                    fontWeight: FontWeight.bold,
                                    fontSize: 12,
                                  ),
                                ),
                                Text(
                                  '${currentUser.influencePoints} / 500 XP',
                                  style: const TextStyle(color: Color(0xFF8B929C), fontSize: 12),
                                ),
                              ],
                            ),
                            const SizedBox(height: 8),
                            Container(
                              height: 4,
                              width: double.infinity,
                              decoration: BoxDecoration(
                                color: Colors.white10,
                                borderRadius: BorderRadius.circular(2),
                              ),
                              child: FractionallySizedBox(
                                alignment: Alignment.centerLeft,
                                widthFactor: (currentUser.influencePoints / 500.0).clamp(0.0, 1.0),
                                child: Container(
                                  decoration: BoxDecoration(
                                    color: Theme.of(context).colorScheme.primary,
                                    borderRadius: BorderRadius.circular(2),
                                  ),
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 40),

                  // Stats
                  Text(
                    'stats'.tr().toUpperCase(),
                    style: const TextStyle(
                        fontSize: 14,
                        color: Color(0xFF8B929C),
                        letterSpacing: 2,
                        fontWeight: FontWeight.w500),
                  ),
                  const SizedBox(height: 20),
                  FutureBuilder<Map<String, dynamic>?>(
                    future: _statsFuture,
                    builder: (context, snapshot) {
                      final stats = snapshot.data;
                      final runs = stats?['runs']?.toString() ?? '0';
                      final km = stats?['distance'] != null ? (stats!['distance'] as num).toStringAsFixed(1) : '0.0';
                      
                      return Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          _buildStatItem('runs'.tr().toUpperCase(), runs),
                          _buildStatItem('km'.tr().toUpperCase(), km),
                          _buildStatItem(
                              'sq_km'.tr().toUpperCase(),
                              (currentUser.influencePoints / 1000000).toStringAsFixed(2)),
                        ],
                      );
                    },
                  ),
                  
                  const SizedBox(height: 20),
                  GestureDetector(
                    onTap: _showHistoryModal,
                    child: Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: const Color.fromRGBO(216, 167, 96, 0.1),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: Theme.of(context).colorScheme.primary),
                      ),
                      child: Text(
                        'history'.tr().toUpperCase(),
                        textAlign: TextAlign.center,
                        style: TextStyle(
                          color: Theme.of(context).colorScheme.primary,
                          fontWeight: FontWeight.bold,
                          fontSize: 14,
                          letterSpacing: 1,
                        ),
                      ),
                    ),
                  ),

                  const SizedBox(height: 40),

                  // Settings
                  Text(
                    'app_settings'.tr().toUpperCase(),
                    style: const TextStyle(
                        fontSize: 14,
                        color: Color(0xFF8B929C),
                        letterSpacing: 2,
                        fontWeight: FontWeight.w500),
                  ),
                  const SizedBox(height: 20),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 15, vertical: 12),
                    decoration: BoxDecoration(
                      color: Colors.white.withValues(alpha: 0.05),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Row(
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text('language'.tr(), style: const TextStyle(fontWeight: FontWeight.w500, color: Colors.white)),
                              Text('language_desc'.tr(), style: const TextStyle(color: Color(0xFF8B929C), fontSize: 12)),
                            ],
                          ),
                        ),
                        Row(
                          children: [
                            _buildLangBtn(context, 'ru', 'RU'),
                            const SizedBox(width: 5),
                            _buildLangBtn(context, 'en', 'EN'),
                          ],
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 40),

                  // Orda Management Button
                  GestureDetector(
                    onTap: () {
                      Navigator.push(
                        context,
                        MaterialPageRoute(builder: (context) => const OrdaScreen()),
                      );
                    },
                    child: Container(
                      width: double.infinity,
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      decoration: BoxDecoration(
                        color: Colors.transparent,
                        border: Border.all(color: const Color(0xFFFFD700)),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          const Icon(Icons.shield, color: Color(0xFFFFD700)),
                          const SizedBox(width: 8),
                          const Text('УПРАВЛЕНИЕ ОРДОЙ', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: Color(0xFFFFD700))),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 20),

                  // Strava
                  GestureDetector(
                    onTap: _isSyncingStrava 
                      ? null 
                      : () {
                          // Show bottom sheet to choose "Connect" or "Sync"
                          showModalBottomSheet(
                            context: context,
                            backgroundColor: const Color(0xFF15181E),
                            builder: (ctx) => SafeArea(
                              child: Column(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  ListTile(
                                    leading: const Icon(Icons.link, color: Colors.white),
                                    title: Text('connect_strava'.tr(), style: const TextStyle(color: Colors.white)),
                                    onTap: () {
                                      Navigator.pop(ctx);
                                      _connectStrava();
                                    },
                                  ),
                                  ListTile(
                                    leading: const Icon(Icons.sync, color: Colors.white),
                                    title: const Text('Синхронизировать забеги', style: TextStyle(color: Colors.white)),
                                    onTap: () {
                                      Navigator.pop(ctx);
                                      _handleStravaSync(currentUser.id);
                                    },
                                  ),
                                ],
                              ),
                            ),
                          );
                        },
                    child: Container(
                      width: double.infinity,
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      decoration: BoxDecoration(
                        color: const Color(0xFFFC4C02),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          if (_isSyncingStrava)
                            const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                          else ...[
                            const Icon(Icons.directions_run_outlined, color: Colors.white),
                            const SizedBox(width: 8),
                            Text('connect_strava'.tr(), style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: Colors.white)),
                          ]
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 100), // padding for bottom nav
                ],
              ),
            ),
    );
  }

  Widget _buildLangBtn(BuildContext context, String code, String label) {
    final isActive = context.locale.languageCode == code;
    return InkWell(
      onTap: () => context.setLocale(Locale(code)),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
        decoration: BoxDecoration(
          color: isActive ? Theme.of(context).colorScheme.primary : Colors.transparent,
          border: Border.all(color: Theme.of(context).colorScheme.primary),
          borderRadius: BorderRadius.circular(6),
        ),
        child: Text(
          label,
          style: TextStyle(
            color: isActive ? Colors.black : Theme.of(context).colorScheme.primary,
            fontWeight: FontWeight.bold,
            fontSize: 10,
          ),
        ),
      ),
    );
  }

  Widget _buildStatItem(String label, String value) {
    return Column(
      children: [
        Text(
          value,
          style: const TextStyle(fontSize: 24, fontWeight: FontWeight.w500, color: Colors.white),
        ),
        const SizedBox(height: 4),
        Text(
          label,
          style: const TextStyle(fontSize: 12, color: Color(0xFF8B929C)),
        ),
      ],
    );
  }
}
