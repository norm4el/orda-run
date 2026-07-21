import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../services/api_service.dart';
import '../main.dart';

class OnboardingScreen extends StatefulWidget {
  const OnboardingScreen({super.key});

  @override
  State<OnboardingScreen> createState() => _OnboardingScreenState();
}

class _OnboardingScreenState extends State<OnboardingScreen> {
  final ApiService _apiService = ApiService();
  bool _isLoading = true;
  List<dynamic> _ordasList = [];
  String? _selectedOrdaId;

  @override
  void initState() {
    super.initState();
    _fetchOrdas();
  }

  Future<void> _fetchOrdas() async {
    final ordas = await _apiService.getOrdaList();
    if (mounted) {
      setState(() {
        _ordasList = ordas;
        _isLoading = false;
      });
    }
  }

  Future<void> _joinSelectedOrda() async {
    if (_selectedOrdaId == null) return;
    
    setState(() => _isLoading = true);
    
    final currentUser = context.read<AppState>().currentUser;
    if (currentUser == null) return;

    final success = await _apiService.joinOrda(currentUser.id, _selectedOrdaId!);
    
    if (success && mounted) {
      final orda = _ordasList.firstWhere((o) => o['id'] == _selectedOrdaId, orElse: () => null);
      currentUser.ordaId = _selectedOrdaId;
      currentUser.ordaName = orda?['name'] ?? 'Орда';
      context.read<AppState>().setUser(currentUser); 
    } else if (mounted) {
      setState(() => _isLoading = false);
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Ошибка при вступлении в Орду')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0A0B0E),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const SizedBox(height: 20),
              const Center(
                child: Icon(Icons.shield, size: 60, color: Color(0xFFD8A760)),
              ),
              const SizedBox(height: 20),
              const Text(
                'Добро пожаловать!',
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontSize: 28,
                  fontWeight: FontWeight.bold,
                  color: Colors.white,
                ),
              ),
              const SizedBox(height: 10),
              const Text(
                'Для начала игры выберите свою Орду. Вы будете захватывать территории для своей команды.',
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontSize: 14,
                  color: Colors.grey,
                  height: 1.5,
                ),
              ),
              const SizedBox(height: 40),
              Expanded(
                child: _isLoading 
                  ? const Center(child: CircularProgressIndicator())
                  : _ordasList.isEmpty 
                    ? const Center(child: Text('Нет доступных Орд'))
                    : ListView.separated(
                        itemCount: _ordasList.length,
                        separatorBuilder: (context, index) => const SizedBox(height: 12),
                        itemBuilder: (context, index) {
                          final orda = _ordasList[index];
                          final isSelected = _selectedOrdaId == orda['id'];
                          
                          return GestureDetector(
                            onTap: () => setState(() => _selectedOrdaId = orda['id']),
                            child: Container(
                              padding: const EdgeInsets.all(20),
                              decoration: BoxDecoration(
                                color: isSelected 
                                  ? const Color(0xFFD8A760).withOpacity(0.2)
                                  : Colors.white.withOpacity(0.05),
                                borderRadius: BorderRadius.circular(16),
                                border: Border.all(
                                  color: isSelected 
                                    ? const Color(0xFFD8A760)
                                    : Colors.transparent,
                                  width: 2,
                                ),
                              ),
                              child: Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  Text(
                                    orda['name'].toString().toUpperCase(),
                                    style: TextStyle(
                                      fontSize: 18,
                                      fontWeight: FontWeight.bold,
                                      color: isSelected ? const Color(0xFFD8A760) : Colors.white,
                                    ),
                                  ),
                                  Text(
                                    "\${orda['member_count']} чел.",
                                    style: const TextStyle(color: Colors.grey),
                                  ),
                                ],
                              ),
                            ),
                          );
                        },
                      ),
              ),
              const SizedBox(height: 20),
              ElevatedButton(
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFFD8A760),
                  foregroundColor: Colors.black,
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(16),
                  ),
                  disabledBackgroundColor: Colors.grey.withOpacity(0.3),
                ),
                onPressed: _selectedOrdaId == null || _isLoading ? null : _joinSelectedOrda,
                child: _isLoading && _selectedOrdaId != null 
                  ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(color: Colors.black, strokeWidth: 2))
                  : const Text(
                      'ВСТУПИТЬ В ОРДУ',
                      style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                    ),
              ),
              const SizedBox(height: 10),
              TextButton(
                onPressed: () {
                  context.read<AppState>().skipOnboarding();
                },
                child: const Text(
                  'ПРОПУСТИТЬ',
                  style: TextStyle(color: Colors.grey, fontSize: 14),
                ),
              ),
              const SizedBox(height: 10),
            ],
          ),
        ),
      ),
    );
  }
}
