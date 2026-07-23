import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import '../services/api_service.dart';
import '../models/models.dart';

class PublicProfileModal extends StatelessWidget {
  final String userId;
  final Territory territory;

  const PublicProfileModal({super.key, required this.userId, required this.territory});

  Future<void> _launchUrl(String urlStr) async {
    final Uri url = Uri.parse(urlStr);
    if (!await launchUrl(url, mode: LaunchMode.externalApplication)) {
      debugPrint('Could not launch \$url');
    }
  }

  @override
  Widget build(BuildContext context) {
    return FutureBuilder(
      future: ApiService().getUserPublicProfile(userId),
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return const SizedBox(height: 200, child: Center(child: CircularProgressIndicator()));
        }
        if (!snapshot.hasData || snapshot.data == null) {
          return const SizedBox(height: 200, child: Center(child: Text('Ошибка загрузки профиля', style: TextStyle(color: Colors.white))));
        }
        final profile = snapshot.data as Map<String, dynamic>;
        
        return Padding(
          padding: const EdgeInsets.all(24.0),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                crossAxisAlignment: CrossAxisAlignment.center,
                children: [
                  Container(
                    width: 72,
                    height: 72,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: const Color(0xFF15181E),
                      border: Border.all(color: Theme.of(context).colorScheme.primary, width: 2),
                    ),
                    clipBehavior: Clip.hardEdge,
                    child: profile['avatarUrl'] != null
                        ? Image.network(
                            ApiService.baseUrl.replaceAll('/api', '') + profile['avatarUrl'],
                            fit: BoxFit.cover,
                          )
                        : const Center(child: Text('👤', style: TextStyle(fontSize: 32))),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          (profile['displayName'] ?? 'Без имени').toUpperCase(),
                          style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: Colors.white),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          'Орда: ${profile["ordaName"] ?? "Нет"}',
                          style: const TextStyle(fontSize: 16, color: Colors.grey),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              if (profile['socialLinks'] != null && (profile['socialLinks']['instagram'] != null || profile['socialLinks']['telegram'] != null)) ...[
                const SizedBox(height: 16),
                Row(
                  children: [
                    if (profile['socialLinks']['instagram'] != null && profile['socialLinks']['instagram'].toString().isNotEmpty)
                      GestureDetector(
                        onTap: () => _launchUrl("https://instagram.com/${profile['socialLinks']['instagram']}"),
                        child: Container(
                          margin: const EdgeInsets.only(right: 12),
                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                          decoration: BoxDecoration(
                            color: const Color(0xFFE1306C).withValues(alpha: 0.2),
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(color: const Color(0xFFE1306C)),
                          ),
                          child: const Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Icon(Icons.camera_alt, color: Color(0xFFE1306C), size: 16),
                              SizedBox(width: 6),
                              Text('Instagram', style: TextStyle(color: Color(0xFFE1306C), fontWeight: FontWeight.bold)),
                            ],
                          ),
                        ),
                      ),
                    if (profile['socialLinks']['telegram'] != null && profile['socialLinks']['telegram'].toString().isNotEmpty)
                      GestureDetector(
                        onTap: () => _launchUrl("https://t.me/${profile['socialLinks']['telegram'].toString().replaceAll('@', '')}"),
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                          decoration: BoxDecoration(
                            color: const Color(0xFF229ED9).withValues(alpha: 0.2),
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(color: const Color(0xFF229ED9)),
                          ),
                          child: const Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Icon(Icons.send, color: Color(0xFF229ED9), size: 16),
                              SizedBox(width: 6),
                              Text('Telegram', style: TextStyle(color: Color(0xFF229ED9), fontWeight: FontWeight.bold)),
                            ],
                          ),
                        ),
                      ),
                  ],
                ),
              ],
              const SizedBox(height: 24),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  _buildStatColumn('ТЕРРИТОРИЯ', "${((profile['influencePoints'] ?? 0) / 1000000).toStringAsFixed(2)} км²"),
                  _buildStatColumn('ПРОБЕЖКИ', '${profile["runs"] ?? 0}'),
                  _buildStatColumn('ДИСТАНЦИЯ', '${profile["distance"]?.toStringAsFixed(1) ?? "0.0"} км'),
                ],
              ),
              const SizedBox(height: 30),
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: const Color(0xFF1F222A),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: territory.health < 50 ? Colors.redAccent.withValues(alpha: 0.5) : const Color(0xFFFFD700).withValues(alpha: 0.3)),
                ),
                child: Column(
                  children: [
                    const Text('СОСТОЯНИЕ ТЕРРИТОРИИ', style: TextStyle(fontSize: 12, color: Colors.grey, letterSpacing: 1)),
                    const SizedBox(height: 8),
                    Text(
                      'Прочность: ${territory.health}%',
                      style: TextStyle(
                        fontSize: 20, 
                        fontWeight: FontWeight.bold, 
                        color: territory.health < 50 ? Colors.redAccent : const Color(0xFFFFD700),
                      ),
                    ),
                    if (territory.health < 100)
                      const Padding(
                        padding: EdgeInsets.only(top: 8.0),
                        child: Text('Территория разрушается из-за бездействия.', style: TextStyle(fontSize: 12, color: Colors.white70)),
                      ),
                  ],
                ),
              ),
              const SizedBox(height: 20),
            ],
          ),
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
}
