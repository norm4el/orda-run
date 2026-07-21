import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../services/api_service.dart';
import '../main.dart';

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
    final name = await showDialog<String>(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: const Color(0xFF15181E),
        title: const Text('Создать Орду', style: TextStyle(color: Colors.white)),
        content: TextField(
          controller: controller,
          style: const TextStyle(color: Colors.white),
          decoration: InputDecoration(
            hintText: 'Название вашей Орды',
            hintStyle: TextStyle(color: Colors.white.withValues(alpha: 0.5)),
            enabledBorder: const UnderlineInputBorder(borderSide: BorderSide(color: Color(0xFFFFD700))),
            focusedBorder: const UnderlineInputBorder(borderSide: BorderSide(color: Color(0xFFFFD700))),
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('ОТМЕНА', style: TextStyle(color: Colors.grey)),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, controller.text),
            child: const Text('СОЗДАТЬ', style: TextStyle(color: Color(0xFFFFD700))),
          ),
        ],
      ),
    );

    if (name != null && name.trim().isNotEmpty) {
      setState(() => _isLoading = true);
      final ordaId = await _apiService.createOrda(user.id, name.trim());
      if (ordaId != null && mounted) {
        final appState = context.read<AppState>();
        user.ordaId = ordaId;
        user.ordaName = name.trim();
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
          const Icon(Icons.shield_outlined, size: 80, color: Colors.grey),
          const SizedBox(height: 20),
          const Text(
            'Вы — Одиночка',
            textAlign: TextAlign.center,
            style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: Colors.white),
          ),
          const SizedBox(height: 10),
          const Text(
            'Вступите в Орду, чтобы зарабатывать бонусы с друзьями и участвовать в клановых войнах.',
            textAlign: TextAlign.center,
            style: TextStyle(fontSize: 16, color: Colors.grey),
          ),
          const SizedBox(height: 40),
          ElevatedButton.icon(
            icon: const Icon(Icons.add_moderator),
            label: const Text('СОЗДАТЬ СВОЮ ОРДУ', style: TextStyle(fontWeight: FontWeight.bold)),
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFFFFD700),
              foregroundColor: Colors.black,
              padding: const EdgeInsets.symmetric(vertical: 16),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            ),
            onPressed: _createOrda,
          ),
          const SizedBox(height: 30),
          const Text('ИЛИ ВСТУПИТЕ В СУЩЕСТВУЮЩУЮ:', style: TextStyle(color: Colors.grey, fontSize: 12, fontWeight: FontWeight.bold)),
          const SizedBox(height: 10),
          Expanded(
            child: ListView.builder(
              itemCount: _availableOrdas.length,
              itemBuilder: (context, index) {
                final orda = _availableOrdas[index];
                return Card(
                  color: const Color(0xFF15181E),
                  margin: const EdgeInsets.only(bottom: 8),
                  child: ListTile(
                    leading: const Icon(Icons.shield, color: Color(0xFFFFD700)),
                    title: Text(orda['name'], style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                    subtitle: Text('Участников: ${orda['member_count']}', style: const TextStyle(color: Colors.grey)),
                    trailing: TextButton(
                      onPressed: () => _joinOrda(orda['id'], orda['name']),
                      child: const Text('ВСТУПИТЬ', style: TextStyle(color: Color(0xFFFFD700))),
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
    return Padding(
      padding: const EdgeInsets.all(24.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const Icon(Icons.shield, size: 100, color: Color(0xFFFFD700)),
          const SizedBox(height: 20),
          Text(
            user.ordaName ?? 'Ваша Орда',
            textAlign: TextAlign.center,
            style: const TextStyle(fontSize: 32, fontWeight: FontWeight.bold, color: Colors.white, letterSpacing: 1.5),
          ),
          const SizedBox(height: 40),
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: const Color(0xFF15181E),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: const Color(0xFFFFD700).withValues(alpha: 0.3)),
            ),
            child: const Column(
              children: [
                Text('Здесь скоро появится статистика вашей Орды, чат и список участников.', 
                  textAlign: TextAlign.center,
                  style: TextStyle(color: Colors.grey, fontSize: 16, height: 1.5),
                ),
                SizedBox(height: 20),
                Icon(Icons.construction, color: Colors.grey, size: 40),
              ],
            ),
          ),
          const Spacer(),
          OutlinedButton.icon(
            icon: const Icon(Icons.exit_to_app),
            label: const Text('ПОКИНУТЬ ОРДУ'),
            style: OutlinedButton.styleFrom(
              foregroundColor: Colors.redAccent,
              side: const BorderSide(color: Colors.redAccent),
              padding: const EdgeInsets.symmetric(vertical: 16),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            ),
            onPressed: _leaveOrda,
          ),
        ],
      ),
    );
  }
}
