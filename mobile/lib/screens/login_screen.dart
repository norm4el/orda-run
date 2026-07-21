import 'dart:async';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:easy_localization/easy_localization.dart';
import 'package:url_launcher/url_launcher.dart';
import '../services/api_service.dart';
import '../main.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final ApiService _apiService = ApiService();
  bool _isLoading = false;
  Timer? _pollTimer;

  @override
  void dispose() {
    _pollTimer?.cancel();
    super.dispose();
  }

  Future<void> _handleTelegramSignIn() async {
    setState(() => _isLoading = true);
    final sessionId = await _apiService.initMobileAuth();
    if (sessionId == null) {
      if (mounted) setState(() => _isLoading = false);
      return;
    }

    // ВНИМАНИЕ: Замените 'ordarunbot' на имя вашего реального бота
    final url = Uri.parse('tg://resolve?domain=ordarunbot&start=login_$sessionId');
    
    try {
      if (await canLaunchUrl(url)) {
        await launchUrl(url);
      } else {
        // Fallback если ТГ не установлен на устройстве/компе
        await launchUrl(Uri.parse('https://t.me/ordarunbot?start=login_$sessionId'));
      }
    } catch (e) {
      print('Could not launch Telegram: $e');
    }

    // Начать опрос бэкенда
    _pollTimer = Timer.periodic(const Duration(seconds: 2), (timer) async {
      final result = await _apiService.pollMobileAuth(sessionId);
      if (result != null) {
        if (result['status'] == 'success') {
          timer.cancel();
          if (mounted) {
            context.read<AppState>().setUser(result['user']);
            setState(() => _isLoading = false);
          }
        } else if (result['status'] == 'error' || result['status'] == null) {
          timer.cancel();
          if (mounted) setState(() => _isLoading = false);
        }
      }
    });
  }

  Future<void> _handleGoogleSignIn() async {
    setState(() => _isLoading = true);
    final user = await _apiService.signInWithGoogle();
    if (user != null && mounted) {
      context.read<AppState>().setUser(user);
    } else if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Вход через Google не удался. Требуется настройка GoogleService-Info.plist в консоли Firebase.')),
      );
    }
    if (mounted) setState(() => _isLoading = false);
  }

  Future<void> _handleAppleSignIn() async {
    setState(() => _isLoading = true);
    try {
      final user = await _apiService.signInWithApple();
      if (user != null && mounted) {
        context.read<AppState>().setUser(user);
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Ошибка Apple: $e\nОтправьте этот текст разработчику!')),
        );
      }
    }
    if (mounted) setState(() => _isLoading = false);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0A0B0E),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 30),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const Spacer(),
              // Logo
              const Center(
                child: Icon(Icons.directions_run, size: 80, color: Colors.white),
              ),
              const SizedBox(height: 20),
              const Center(
                child: Text(
                  'ORDA RUN',
                  style: TextStyle(
                    fontSize: 32,
                    fontWeight: FontWeight.bold,
                    letterSpacing: 4,
                    color: Colors.white,
                  ),
                ),
              ),
              const SizedBox(height: 10),
              Center(
                child: Text(
                  'landing_desc'.tr(),
                  textAlign: TextAlign.center,
                  style: const TextStyle(
                    fontSize: 14,
                    color: Color(0xFF8B929C),
                    height: 1.5,
                  ),
                ),
              ),
              const Spacer(),

              // Sign in buttons
              if (_isLoading)
                const Center(child: CircularProgressIndicator())
              else ...[
                // Telegram
                _buildSocialButton(
                  icon: Icons.telegram,
                  label: 'Войти через Telegram',
                  color: const Color(0xFF2AABEE),
                  textColor: Colors.white,
                  onPressed: _handleTelegramSignIn,
                ),
                const SizedBox(height: 16),
                // Apple
                _buildSocialButton(
                  icon: Icons.apple,
                  label: 'Войти через Apple', // hardcoded because no key in ru.json
                  color: Colors.white,
                  textColor: Colors.black,
                  onPressed: _handleAppleSignIn,
                ),
                const SizedBox(height: 16),
                // Google
                _buildSocialButton(
                  icon: Icons.g_mobiledata,
                  label: 'Войти через Google',
                  color: const Color(0xFF15181E),
                  textColor: Colors.white,
                  borderColor: Colors.white10,
                  onPressed: _handleGoogleSignIn,
                ),
              ],
              const SizedBox(height: 40),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildSocialButton({
    required IconData icon,
    required String label,
    required Color color,
    required Color textColor,
    Color? borderColor,
    required VoidCallback onPressed,
  }) {
    return ElevatedButton(
      style: ElevatedButton.styleFrom(
        backgroundColor: color,
        foregroundColor: textColor,
        padding: const EdgeInsets.symmetric(vertical: 16),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
          side: borderColor != null ? BorderSide(color: borderColor) : BorderSide.none,
        ),
        elevation: borderColor == null ? 4 : 0,
      ),
      onPressed: onPressed,
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(icon, size: 28),
          const SizedBox(width: 12),
          Text(
            label,
            style: const TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.bold,
            ),
          ),
        ],
      ),
    );
  }
}
