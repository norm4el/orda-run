import 'package:flutter/material.dart';
import '../services/api_service.dart';

class PublicOrdaModal extends StatelessWidget {
  final String ordaId;
  final String ordaName;

  const PublicOrdaModal({super.key, required this.ordaId, required this.ordaName});

  @override
  Widget build(BuildContext context) {
    return FutureBuilder(
      future: ApiService().getOrdaPublicProfile(ordaId),
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return Container(
            color: const Color(0xFF15181E),
            height: 200, 
            child: const Center(child: CircularProgressIndicator())
          );
        }
        if (!snapshot.hasData || snapshot.data == null) {
          return Container(
            color: const Color(0xFF15181E),
            height: 200, 
            child: const Center(child: Text('Ошибка загрузки профиля Орды', style: TextStyle(color: Colors.white)))
          );
        }
        final orda = snapshot.data as Map<String, dynamic>;
        
        return Container(
          decoration: const BoxDecoration(
            color: Color(0xFF15181E),
            borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
          ),
          padding: const EdgeInsets.all(24.0),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                crossAxisAlignment: CrossAxisAlignment.center,
                children: [
                  Container(
                    width: 80,
                    height: 80,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: const Color(0xFF1F222A),
                      border: Border.all(color: Theme.of(context).colorScheme.primary, width: 2),
                    ),
                    clipBehavior: Clip.hardEdge,
                    child: orda['avatar_url'] != null && orda['avatar_url'].toString().isNotEmpty
                        ? Image.network(
                            ApiService.baseUrl.replaceAll('/api', '') + orda['avatar_url'],
                            fit: BoxFit.cover,
                            errorBuilder: (context, error, stackTrace) => const Center(child: Icon(Icons.shield, size: 36, color: Colors.white)),
                          )
                        : const Center(child: Icon(Icons.shield, size: 36, color: Colors.white)),
                  ),
                  const SizedBox(width: 20),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          orda['name']?.toUpperCase() ?? 'ОРДА',
                          style: const TextStyle(fontSize: 26, fontWeight: FontWeight.bold, color: Colors.white),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          'Хан: \${orda["khan_name"] ?? "Неизвестно"}',
                          style: TextStyle(fontSize: 16, color: Theme.of(context).colorScheme.primary, fontWeight: FontWeight.bold),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 30),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  _buildStatColumn(context, 'УЧАСТНИКИ', '\${orda["member_count"] ?? 0} чел.'),
                  _buildStatColumn(context, 'ВЛИЯНИЕ', '\${orda["total_influence"] ?? 0} XP'),
                ],
              ),
              const SizedBox(height: 20),
            ],
          ),
        );
      },
    );
  }

  Widget _buildStatColumn(BuildContext context, String label, String value) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
      decoration: BoxDecoration(
        color: const Color(0xFF1F222A),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.white10),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          Text(label, style: const TextStyle(fontSize: 12, color: Colors.grey, letterSpacing: 1)),
          const SizedBox(height: 8),
          Text(value, style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: Theme.of(context).colorScheme.primary)),
        ],
      ),
    );
  }
}
