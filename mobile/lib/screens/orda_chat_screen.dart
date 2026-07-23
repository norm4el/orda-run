import 'dart:async';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import '../services/api_service.dart';
import '../main.dart';

class OrdaChatScreen extends StatefulWidget {
  final String ordaId;
  final String ordaName;

  const OrdaChatScreen({
    super.key,
    required this.ordaId,
    required this.ordaName,
  });

  @override
  State<OrdaChatScreen> createState() => _OrdaChatScreenState();
}

class _OrdaChatScreenState extends State<OrdaChatScreen> {
  final ApiService _apiService = ApiService();
  final TextEditingController _messageController = TextEditingController();
  final ScrollController _scrollController = ScrollController();
  
  List<dynamic> _messages = [];
  bool _isLoading = true;
  Timer? _pollingTimer;

  @override
  void initState() {
    super.initState();
    _loadMessages();
    // Poll for new messages every 3 seconds
    _pollingTimer = Timer.periodic(const Duration(seconds: 3), (timer) {
      _loadMessages(silent: true);
    });
  }

  @override
  void dispose() {
    _pollingTimer?.cancel();
    _messageController.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  Future<void> _loadMessages({bool silent = false}) async {
    if (!silent) setState(() => _isLoading = true);
    final messages = await _apiService.getOrdaMessages(widget.ordaId);
    if (mounted) {
      final wasAtBottom = _isScrolledToBottom();
      setState(() {
        _messages = messages;
        _isLoading = false;
      });
      if (!silent || wasAtBottom) {
        _scrollToBottom();
      }
    }
  }

  bool _isScrolledToBottom() {
    if (!_scrollController.hasClients) return false;
    final maxScroll = _scrollController.position.maxScrollExtent;
    final currentScroll = _scrollController.offset;
    return currentScroll >= (maxScroll - 50);
  }

  void _scrollToBottom() {
    if (!_scrollController.hasClients) return;
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scrollController.hasClients) {
        _scrollController.animateTo(
          _scrollController.position.maxScrollExtent,
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeOut,
        );
      }
    });
  }

  Future<void> _sendMessage() async {
    final text = _messageController.text.trim();
    if (text.isEmpty) return;

    final user = context.read<AppState>().currentUser;
    if (user == null) return;

    _messageController.clear();
    final success = await _apiService.sendOrdaMessage(widget.ordaId, user.id, text);
    if (success) {
      _loadMessages();
    } else {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Ошибка отправки сообщения'), backgroundColor: Colors.red),
        );
      }
    }
  }

  Widget _buildMessageBubble(Map<String, dynamic> msg, String currentUserId) {
    final String senderId = (msg['frontend_user_id'] ?? msg['user_id']).toString();
    final isMe = senderId == currentUserId;

    final DateTime dt = DateTime.parse(msg['created_at']).toLocal();
    final String timeStr = DateFormat('HH:mm').format(dt);
    final String userName = msg['user_name'] ?? 'Игрок';

    return Align(
      alignment: isMe ? Alignment.centerRight : Alignment.centerLeft,
      child: Container(
        margin: const EdgeInsets.symmetric(vertical: 4, horizontal: 12),
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: isMe ? const Color(0xFFFFD60A).withValues(alpha: 0.15) : const Color(0xFF15181E),
          borderRadius: BorderRadius.circular(16).copyWith(
            bottomRight: isMe ? const Radius.circular(0) : const Radius.circular(16),
            bottomLeft: isMe ? const Radius.circular(16) : const Radius.circular(0),
          ),
          border: Border.all(
            color: isMe ? const Color(0xFFFFD60A).withValues(alpha: 0.5) : Colors.transparent,
          ),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            if (!isMe)
              Text(
                userName,
                style: const TextStyle(
                  color: Color(0xFF8A9099),
                  fontSize: 11,
                  fontWeight: FontWeight.bold,
                  letterSpacing: 1,
                ),
              ),
            if (!isMe) const SizedBox(height: 4),
            Text(
              msg['message'] ?? '',
              style: const TextStyle(color: Colors.white, fontSize: 16),
            ),
            const SizedBox(height: 4),
            Text(
              timeStr,
              style: const TextStyle(color: Colors.white54, fontSize: 10),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final user = context.watch<AppState>().currentUser;
    final currentUserId = user?.id ?? '';

    return Scaffold(
      backgroundColor: Colors.black,
      appBar: AppBar(
        backgroundColor: Colors.black,
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Чат Орды', style: TextStyle(color: Color(0xFF8A9099), fontSize: 12, letterSpacing: 1)),
            Text(
              widget.ordaName.toUpperCase(),
              style: const TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold, letterSpacing: 1),
            ),
          ],
        ),
        iconTheme: const IconThemeData(color: Color(0xFFFFD60A)),
      ),
      body: SafeArea(
        child: Column(
          children: [
            Expanded(
              child: _isLoading && _messages.isEmpty
                  ? const Center(child: CircularProgressIndicator(color: Color(0xFFFFD60A)))
                  : ListView.builder(
                      controller: _scrollController,
                      padding: const EdgeInsets.symmetric(vertical: 16),
                      itemCount: _messages.length,
                      itemBuilder: (context, index) {
                        return _buildMessageBubble(_messages[index], currentUserId);
                      },
                    ),
            ),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              decoration: const BoxDecoration(
                color: Color(0xFF15181E),
                border: Border(top: BorderSide(color: Colors.white10)),
              ),
              child: Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: _messageController,
                      style: const TextStyle(color: Colors.white),
                      decoration: InputDecoration(
                        hintText: 'Сообщение...',
                        hintStyle: TextStyle(color: Colors.white.withValues(alpha: 0.5)),
                        filled: true,
                        fillColor: const Color(0xFF1F222A),
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(24),
                          borderSide: BorderSide.none,
                        ),
                        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                      ),
                      textCapitalization: TextCapitalization.sentences,
                    ),
                  ),
                  const SizedBox(width: 8),
                  CircleAvatar(
                    backgroundColor: const Color(0xFFFFD60A),
                    child: IconButton(
                      icon: const Icon(Icons.send, color: Colors.black),
                      onPressed: _sendMessage,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
