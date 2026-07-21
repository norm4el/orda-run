import 'package:flutter/material.dart';
import 'package:timeago/timeago.dart' as timeago;
import '../services/api_service.dart';

class FeedModal extends StatefulWidget {
  const FeedModal({super.key});

  @override
  State<FeedModal> createState() => _FeedModalState();
}

class _FeedModalState extends State<FeedModal> {
  final ApiService _apiService = ApiService();
  bool _isLoading = true;
  List<dynamic> _events = [];

  @override
  void initState() {
    super.initState();
    timeago.setLocaleMessages('ru', timeago.RuMessages());
    _loadEvents();
  }

  Future<void> _loadEvents() async {
    final events = await _apiService.getEvents();
    if (mounted) {
      setState(() {
        _events = events;
        _isLoading = false;
      });
    }
  }

  Widget _buildEventIcon(String type) {
    switch (type) {
      case 'STEAL':
        return const CircleAvatar(
          backgroundColor: Colors.redAccent,
          child: Icon(Icons.warning_amber_rounded, color: Colors.white, size: 20),
        );
      case 'CAPTURE':
        return CircleAvatar(
          backgroundColor: const Color(0xFFF5D142).withOpacity(0.2),
          child: const Icon(Icons.map, color: Color(0xFFF5D142), size: 20),
        );
      case 'ORDA_CREATE':
        return CircleAvatar(
          backgroundColor: Colors.purpleAccent.withOpacity(0.2),
          child: const Icon(Icons.shield, color: Colors.purpleAccent, size: 20),
        );
      case 'ORDA_JOIN':
        return CircleAvatar(
          backgroundColor: Colors.blueAccent.withOpacity(0.2),
          child: const Icon(Icons.group_add, color: Colors.blueAccent, size: 20),
        );
      case 'QUEST_CLAIM':
        return CircleAvatar(
          backgroundColor: Colors.greenAccent.withOpacity(0.2),
          child: const Icon(Icons.star, color: Colors.greenAccent, size: 20),
        );
      default:
        return CircleAvatar(
          backgroundColor: Colors.white.withOpacity(0.1),
          child: const Icon(Icons.info_outline, color: Colors.white, size: 20),
        );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      height: MediaQuery.of(context).size.height * 0.75,
      padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 20.0),
      decoration: const BoxDecoration(
        color: Color(0xFF15181E),
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text(
                'ЛЕНТА СОБЫТИЙ',
                style: TextStyle(
                  fontSize: 20,
                  fontWeight: FontWeight.bold,
                  letterSpacing: 1.5,
                  color: Colors.white,
                ),
              ),
              IconButton(
                icon: const Icon(Icons.refresh, color: Color(0xFFF5D142)),
                onPressed: () {
                  setState(() => _isLoading = true);
                  _loadEvents();
                },
              ),
            ],
          ),
          const SizedBox(height: 16),
          Expanded(
            child: _isLoading
                ? const Center(child: CircularProgressIndicator(color: Color(0xFFF5D142)))
                : _events.isEmpty
                    ? const Center(child: Text('Пока в городе тихо...', style: TextStyle(color: Colors.grey)))
                    : ListView.separated(
                        itemCount: _events.length,
                        separatorBuilder: (context, index) => const Divider(color: Colors.white10),
                        itemBuilder: (context, index) {
                          final event = _events[index];
                          final type = event['event_type'] as String;
                          final message = event['message'] as String;
                          final username = event['user_display_name'] ?? 'Игрок';
                          final date = DateTime.parse(event['created_at']).toLocal();
                          
                          // Style changes based on event type
                          bool isSteal = type == 'STEAL';

                          return ListTile(
                            contentPadding: EdgeInsets.zero,
                            leading: _buildEventIcon(type),
                            title: Text(
                              isSteal ? 'КОНФЛИКТ!' : username,
                              style: TextStyle(
                                color: isSteal ? Colors.redAccent : const Color(0xFFF5D142),
                                fontWeight: FontWeight.bold,
                                fontSize: 14,
                              ),
                            ),
                            subtitle: Padding(
                              padding: const EdgeInsets.only(top: 4.0),
                              child: Text(
                                message,
                                style: const TextStyle(color: Colors.white, fontSize: 16),
                              ),
                            ),
                            trailing: Text(
                              timeago.format(date, locale: 'ru'),
                              style: const TextStyle(color: Colors.grey, fontSize: 12),
                            ),
                          );
                        },
                      ),
          ),
        ],
      ),
    );
  }
}
