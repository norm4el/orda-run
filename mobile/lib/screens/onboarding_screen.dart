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
  final PageController _pageController = PageController();
  
  int _currentPage = 0;
  bool _isLoading = true;
  List<dynamic> _ordasList = [];
  String? _selectedOrdaId;

  @override
  void initState() {
    super.initState();
    _fetchOrdas();
  }

  @override
  void dispose() {
    _pageController.dispose();
    super.dispose();
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

  void _nextPage() {
    if (_currentPage < 3) {
      _pageController.nextPage(
        duration: const Duration(milliseconds: 300),
        curve: Curves.easeInOut,
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0A0B0E),
      body: SafeArea(
        child: Column(
          children: [
            // Skip button (Top Right)
            Align(
              alignment: Alignment.topRight,
              child: TextButton(
                onPressed: () {
                  context.read<AppState>().skipOnboarding();
                },
                child: const Text(
                  'ПРОПУСТИТЬ',
                  style: TextStyle(color: Colors.grey, fontSize: 14),
                ),
              ),
            ),
            
            // Carousel
            Expanded(
              child: PageView(
                controller: _pageController,
                onPageChanged: (index) {
                  setState(() => _currentPage = index);
                },
                children: [
                  _buildSlide(
                    icon: Icons.map_outlined,
                    title: 'Добро пожаловать!',
                    description: 'Город — это твоя игровая площадка. Совершай пробежки, чтобы захватывать реальные территории и улицы.',
                  ),
                  _buildSlide(
                    icon: Icons.directions_run,
                    title: 'Как играть?',
                    description: 'Включи трекер пробежек. Твой GPS-маршрут замкнется в полигон, и эта земля станет твоей!',
                  ),
                  _buildSlide(
                    icon: Icons.emoji_events_outlined,
                    title: 'Влияние и Рейтинги',
                    description: 'Чем больше площадь твоей территории, тем больше Очков Влияния ты получаешь. Доминируй в своем городе!',
                  ),
                  _buildOrdaSelectionSlide(),
                ],
              ),
            ),
            
            // Bottom Controls (Dots & Button)
            Padding(
              padding: const EdgeInsets.all(24.0),
              child: Column(
                children: [
                  // Dots indicator
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: List.generate(4, (index) {
                      return AnimatedContainer(
                        duration: const Duration(milliseconds: 300),
                        margin: const EdgeInsets.symmetric(horizontal: 4),
                        height: 8,
                        width: _currentPage == index ? 24 : 8,
                        decoration: BoxDecoration(
                          color: _currentPage == index ? const Color(0xFFD8A760) : Colors.white24,
                          borderRadius: BorderRadius.circular(4),
                        ),
                      );
                    }),
                  ),
                  const SizedBox(height: 30),
                  
                  // Main Button
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFFD8A760),
                        foregroundColor: Colors.black,
                        padding: const EdgeInsets.symmetric(vertical: 16),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(16),
                        ),
                        disabledBackgroundColor: Colors.grey.withOpacity(0.3),
                      ),
                      onPressed: () {
                        if (_currentPage == 3) {
                          _selectedOrdaId == null || _isLoading ? null : _joinSelectedOrda();
                        } else {
                          _nextPage();
                        }
                      },
                      child: _isLoading && _currentPage == 3 && _selectedOrdaId != null 
                        ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(color: Colors.black, strokeWidth: 2))
                        : Text(
                            _currentPage == 3 ? 'ВСТУПИТЬ В ОРДУ' : 'ДАЛЕЕ',
                            style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                          ),
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

  Widget _buildSlide({required IconData icon, required String title, required String description}) {
    return Padding(
      padding: const EdgeInsets.all(40.0),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Container(
            padding: const EdgeInsets.all(30),
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: const Color(0xFFD8A760).withOpacity(0.1),
            ),
            child: Icon(icon, size: 80, color: const Color(0xFFD8A760)),
          ),
          const SizedBox(height: 50),
          Text(
            title,
            textAlign: TextAlign.center,
            style: const TextStyle(
              fontSize: 28,
              fontWeight: FontWeight.bold,
              color: Colors.white,
            ),
          ),
          const SizedBox(height: 20),
          Text(
            description,
            textAlign: TextAlign.center,
            style: const TextStyle(
              fontSize: 16,
              color: Colors.grey,
              height: 1.5,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildOrdaSelectionSlide() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 24.0),
      child: Column(
        children: [
          const SizedBox(height: 20),
          const Text(
            'Выбери свою Орду',
            textAlign: TextAlign.center,
            style: TextStyle(
              fontSize: 28,
              fontWeight: FontWeight.bold,
              color: Colors.white,
            ),
          ),
          const SizedBox(height: 10),
          const Text(
            'Ты не один. Выбери команду и помоги ей захватить весь город!',
            textAlign: TextAlign.center,
            style: TextStyle(
              fontSize: 14,
              color: Colors.grey,
              height: 1.5,
            ),
          ),
          const SizedBox(height: 30),
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
        ],
      ),
    );
  }
}
