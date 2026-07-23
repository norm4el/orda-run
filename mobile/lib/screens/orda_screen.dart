import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:image_picker/image_picker.dart';
import '../services/api_service.dart';
import '../main.dart';
import 'orda_chat_screen.dart';

class OrdaScreen extends StatefulWidget {
  const OrdaScreen({super.key});

  @override
  State<OrdaScreen> createState() => _OrdaScreenState();
}

class _OrdaScreenState extends State<OrdaScreen> {
  final ApiService _apiService = ApiService();
  bool _isLoading = false;
  List<dynamic> _availableOrdas = [];

  @override
  void initState() {
    super.initState();
    _fetchOrdas();
  }

  Future<void> _fetchOrdas() async {
    setState(() => _isLoading = true);
    final ordas = await _apiService.getOrdaList();
    if (mounted) {
      setState(() {
        _availableOrdas = ordas;
        _isLoading = false;
      });
    }
  }

  Future<void> _createOrda() async {
    final user = context.read<AppState>().currentUser;
    if (user == null) return;

    final controller = TextEditingController();
    String selectedEmoji = '🐺';
    final emojis = ['🐺', '🦅', '🐻', '🐍', '🦁'];

    final result = await showDialog<String>(
      context: context,
      builder: (context) {
        return StatefulBuilder(
          builder: (context, setState) {
            return AlertDialog(
              backgroundColor: Theme.of(context).colorScheme.surface,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
              title: const Text('Создать Орду', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
              content: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                    children: emojis.map((e) => GestureDetector(
                      onTap: () => setState(() => selectedEmoji = e),
                      child: Container(
                        padding: const EdgeInsets.all(8),
                        decoration: BoxDecoration(
                          color: selectedEmoji == e ? const Color(0xFF15181E) : Colors.transparent,
                          borderRadius: BorderRadius.circular(12),
                          border: selectedEmoji == e ? Border.all(color: const Color(0xFFFFD60A)) : null,
                        ),
                        child: Text(e, style: const TextStyle(fontSize: 28)),
                      ),
                    )).toList(),
                  ),
                  const SizedBox(height: 20),
                  TextField(
                    controller: controller,
                    style: const TextStyle(color: Colors.white),
                    decoration: InputDecoration(
                      hintText: 'Название',
                      hintStyle: const TextStyle(color: Color(0xFF8A9099)),
                      filled: true,
                      fillColor: const Color(0xFF15181E),
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
                    ),
                  ),
                ],
              ),
              actions: [
                TextButton(
                  onPressed: () => Navigator.pop(context),
                  child: const Text('ОТМЕНА', style: TextStyle(color: Color(0xFF8A9099))),
                ),
                TextButton(
                  onPressed: () => Navigator.pop(context, '$selectedEmoji ${controller.text.trim()}'),
                  child: const Text('СОЗДАТЬ', style: TextStyle(color: Color(0xFFFFD60A), fontWeight: FontWeight.bold)),
                ),
              ],
            );
          }
        );
      },
    );

    if (result != null && result.length > 2) {
      setState(() => _isLoading = true);
      final ordaId = await _apiService.createOrda(user.id, result);
      if (ordaId != null && mounted) {
        final appState = context.read<AppState>();
        user.ordaId = ordaId;
        user.ordaName = result;
        appState.setUser(user);
      }
      setState(() => _isLoading = false);
    }
  }

  Future<void> _joinOrda(String ordaId, String ordaName) async {
    final user = context.read<AppState>().currentUser;
    if (user == null) return;

    setState(() => _isLoading = true);
    final success = await _apiService.joinOrda(user.id, ordaId);
    if (success && mounted) {
      final appState = context.read<AppState>();
      user.ordaId = ordaId;
      user.ordaName = ordaName;
      appState.setUser(user);
    }
    setState(() => _isLoading = false);
  }

  Future<void> _leaveOrda() async {
    final user = context.read<AppState>().currentUser;
    if (user == null) return;

    final confirm = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: const Color(0xFF15181E),
        title: const Text('Покинуть Орду?', style: TextStyle(color: Colors.white)),
        content: const Text('Вы уверены, что хотите уйти? Если вы Хан, Орда будет распущена.', style: TextStyle(color: Colors.grey)),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('ОТМЕНА', style: TextStyle(color: Colors.grey)),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('ПОКИНУТЬ', style: TextStyle(color: Colors.redAccent)),
          ),
        ],
      ),
    );

    if (confirm == true) {
      setState(() => _isLoading = true);
      final success = await _apiService.leaveOrda(user.id);
      if (success && mounted) {
        final appState = context.read<AppState>();
        user.ordaId = null;
        user.ordaName = null;
        appState.setUser(user);
      }
      setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final user = context.watch<AppState>().currentUser;
    
    return Scaffold(
      backgroundColor: Colors.black,
      appBar: AppBar(
        title: const Text('Управление Ордой', style: TextStyle(fontWeight: FontWeight.bold, letterSpacing: 1.2)),
        backgroundColor: Colors.black,
        elevation: 0,
        iconTheme: const IconThemeData(color: Color(0xFFFFD700)),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator(color: Color(0xFFFFD700)))
          : user?.ordaId == null
              ? _buildNoOrdaView()
              : _buildHasOrdaView(user!),
    );
  }

  Widget _buildNoOrdaView() {
    return Padding(
      padding: const EdgeInsets.all(24.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const SizedBox(height: 20),
          const Center(child: Text('🏕️', style: TextStyle(fontSize: 80))),
          const SizedBox(height: 20),
          const Text(
            'Вы — Одиночка',
            textAlign: TextAlign.center,
            style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: Colors.white),
          ),
          const SizedBox(height: 10),
          const Text(
            'Вступите в Орду или создайте свою, чтобы зарабатывать бонусы с друзьями и участвовать в войнах.',
            textAlign: TextAlign.center,
            style: TextStyle(fontSize: 14, color: Color(0xFF8A9099)),
          ),
          const SizedBox(height: 40),
          ElevatedButton.icon(
            icon: const Icon(Icons.add),
            label: const Text('СОЗДАТЬ СВОЮ ОРДУ', style: TextStyle(fontWeight: FontWeight.bold, letterSpacing: 1)),
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFFFFD60A),
              foregroundColor: Colors.black,
              padding: const EdgeInsets.symmetric(vertical: 16),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            ),
            onPressed: _createOrda,
          ),
          const SizedBox(height: 40),
          const Text('ИЛИ ВСТУПИТЕ В СУЩЕСТВУЮЩУЮ', style: TextStyle(color: Color(0xFF8A9099), fontSize: 12, fontWeight: FontWeight.bold, letterSpacing: 1)),
          const SizedBox(height: 16),
          Expanded(
            child: ListView.builder(
              itemCount: _availableOrdas.length,
              itemBuilder: (context, index) {
                final orda = _availableOrdas[index];
                return Container(
                  margin: const EdgeInsets.only(bottom: 8),
                  decoration: BoxDecoration(
                    color: Theme.of(context).colorScheme.surface,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: ListTile(
                    contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
                    leading: Container(
                      width: 40, height: 40,
                      decoration: BoxDecoration(color: const Color(0xFF15181E), borderRadius: BorderRadius.circular(8)),
                      child: const Center(child: Text('🏴', style: TextStyle(fontSize: 20))),
                    ),
                    title: Text(orda['name'].toString().toUpperCase(), style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 14)),
                    subtitle: Text('Участников: ${orda['member_count']}', style: const TextStyle(color: Color(0xFF8A9099), fontSize: 12)),
                    trailing: TextButton(
                      style: TextButton.styleFrom(
                        backgroundColor: const Color(0xFFFFD60A).withValues(alpha: 0.1),
                        foregroundColor: const Color(0xFFFFD60A),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                      ),
                      onPressed: () => _joinOrda(orda['id'], orda['name']),
                      child: const Text('ВСТУПИТЬ', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
                    ),
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildHasOrdaView(AuthenticatedUser user) {
    final serverHost = ApiService.baseUrl.replaceAll('/api', '');
    final myOrdaInfo = _availableOrdas.firstWhere(
      (o) => o['id'] == user.ordaId,
      orElse: () => null,
    );
    final avatarUrl = myOrdaInfo?['avatar_url'];
    final isKhan = myOrdaInfo?['khan_id'] == user.id;

    return Padding(
      padding: const EdgeInsets.all(24.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const SizedBox(height: 20),
          GestureDetector(
            onTap: () async {
              if (!isKhan) return;
              final picker = ImagePicker();
              final pickedFile = await picker.pickImage(source: ImageSource.gallery, imageQuality: 80);
              if (pickedFile != null) {
                setState(() => _isLoading = true);
                final url = await _apiService.uploadOrdaAvatar(user.ordaId!, pickedFile.path);
                if (url != null) {
                  await _fetchOrdas(); // refresh the list to get new avatar_url
                  ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Герб Орды обновлен!'), backgroundColor: Colors.green));
                } else {
                  ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Ошибка загрузки'), backgroundColor: Colors.red));
                }
                setState(() => _isLoading = false);
              }
            },
            child: Center(
              child: Container(
                width: 100,
                height: 100,
                decoration: BoxDecoration(
                  color: const Color(0xFF15181E),
                  shape: BoxShape.circle,
                  border: Border.all(color: const Color(0xFFFFD60A), width: 2),
                  image: avatarUrl != null
                    ? DecorationImage(
                        image: NetworkImage(serverHost + avatarUrl),
                        fit: BoxFit.cover,
                      )
                    : null,
                ),
                child: avatarUrl == null 
                  ? const Center(child: Text('🏴', style: TextStyle(fontSize: 50)))
                  : null,
              ),
            ),
          ),
          const SizedBox(height: 20),
          Text(
            (user.ordaName ?? 'ВАША ОРДА').toUpperCase(),
            textAlign: TextAlign.center,
            style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: Colors.white, letterSpacing: 2),
          ),
          if (isKhan)
            const Text(
              'Вы Хан этой Орды (нажмите на герб для изменения)',
              textAlign: TextAlign.center,
              style: TextStyle(color: Color(0xFF8A9099), fontSize: 12),
            ),
          const SizedBox(height: 40),
          
          FutureBuilder(
            future: _apiService.getLeaderboard(),
            builder: (context, snapshot) {
              if (snapshot.connectionState == ConnectionState.waiting) {
                return const Center(child: CircularProgressIndicator());
              }
              final allPlayers = snapshot.data as List<dynamic>? ?? [];
              final myOrdaMembers = allPlayers.where((p) => p['ordaName'] == user.ordaName).toList();
              
              double totalScore = 0;
              for (var p in myOrdaMembers) {
                final s = p['influencePoints'] ?? p['influence_points'] ?? p['score'] ?? 0;
                totalScore += (s is int) ? s : (double.tryParse(s.toString())?.toInt() ?? 0);
              }

              return Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  // Stat row
                  Text(
                    '${(totalScore / 1000000).toStringAsFixed(2)} км²  |  ${myOrdaMembers.length} участников',
                    textAlign: TextAlign.center,
                    style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Color(0xFF8A9099)),
                  ),
                  const SizedBox(height: 40),
                  
                  const Text('УЧАСТНИКИ', style: TextStyle(color: Color(0xFF8A9099), fontSize: 12, fontWeight: FontWeight.bold, letterSpacing: 1)),
                  const SizedBox(height: 16),
                  
                  ...myOrdaMembers.map((m) {
                    final name = m['displayName'] ?? m['name'] ?? 'Без имени';
                    final s = m['influencePoints'] ?? m['influence_points'] ?? m['score'] ?? 0;
                    final score = (s is int) ? s : (double.tryParse(s.toString())?.toInt() ?? 0);
                    final isMe = m['id'] == user.id;

                    return Container(
                      margin: const EdgeInsets.only(bottom: 8),
                      decoration: BoxDecoration(
                        color: Theme.of(context).colorScheme.surface,
                        borderRadius: BorderRadius.circular(12),
                        border: isMe ? Border.all(color: const Color(0xFFFFD60A)) : null,
                      ),
                      child: ListTile(
                        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
                        leading: CircleAvatar(
                          backgroundColor: const Color(0xFF15181E),
                          child: Icon(Icons.person, color: isMe ? const Color(0xFFFFD60A) : Colors.white),
                        ),
                        title: Text(name.toString().toUpperCase(), style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 14)),
                        trailing: Text('${(score / 1000000).toStringAsFixed(2)} км²', style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                      ),
                    );
                  }),
                ],
              );
            }
          ),

          const Spacer(),
          Row(
            children: [
              Expanded(
                child: ElevatedButton.icon(
                  icon: const Icon(Icons.chat_bubble_outline),
                  label: const Text('ЧАТ ОРДЫ', style: TextStyle(fontWeight: FontWeight.bold)),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFFFFD60A),
                    foregroundColor: Colors.black,
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  onPressed: () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (context) => OrdaChatScreen(
                          ordaId: user.ordaId!,
                          ordaName: user.ordaName!,
                        ),
                      ),
                    );
                  },
                ),
              ),
              const SizedBox(width: 12),
              OutlinedButton(
                style: OutlinedButton.styleFrom(
                  foregroundColor: Colors.redAccent,
                  side: const BorderSide(color: Colors.redAccent),
                  padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 16),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
                onPressed: _leaveOrda,
                child: const Icon(Icons.exit_to_app),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
