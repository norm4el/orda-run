import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:easy_localization/easy_localization.dart';
import 'services/run_tracker.dart';
import 'screens/map_screen.dart';
import 'screens/record_screen.dart';
import 'screens/profile_screen.dart';
import 'screens/leaderboard_screen.dart';
import 'screens/quests_screen.dart';
import 'screens/login_screen.dart';
import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';
import 'screens/onboarding_screen.dart';

class AuthenticatedUser {
  final String id;
  final String displayName;
  final int influencePoints;
  String? ordaId;
  String? ordaName;

  AuthenticatedUser({
    required this.id,
    required this.displayName,
    required this.influencePoints,
    this.ordaId,
    this.ordaName,
  });

  factory AuthenticatedUser.fromJson(Map<String, dynamic> json) {
    return AuthenticatedUser(
      id: json['id'],
      displayName: json['displayName'] ?? json['firstName'] ?? 'Игрок',
      influencePoints: json['influencePoints'] ?? 0,
      ordaId: json['ordaId'],
      ordaName: json['ordaName'],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'displayName': displayName,
      'influencePoints': influencePoints,
      'ordaId': ordaId,
      'ordaName': ordaName,
    };
  }
}

class AppState extends ChangeNotifier {
  AuthenticatedUser? currentUser;
  int lastMapRefresh = DateTime.now().millisecondsSinceEpoch;
  bool hasSkippedOnboarding = false;
  int currentTabIndex = 0;

  void setTabIndex(int index) {
    currentTabIndex = index;
    notifyListeners();
  }

  void setUser(AuthenticatedUser? user) {
    currentUser = user;
    notifyListeners();
    _saveUserToPrefs(user);
  }

  Future<void> _saveUserToPrefs(AuthenticatedUser? user) async {
    final prefs = await SharedPreferences.getInstance();
    if (user == null) {
      await prefs.remove('cached_user');
    } else {
      await prefs.setString('cached_user', jsonEncode(user.toJson()));
    }
  }

  void skipOnboarding() {
    hasSkippedOnboarding = true;
    notifyListeners();
  }

  void logout() {
    setUser(null);
  }

  void triggerMapRefresh() {
    lastMapRefresh = DateTime.now().millisecondsSinceEpoch;
    notifyListeners();
  }
}

// --- Main ---
void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await EasyLocalization.ensureInitialized();

  final prefs = await SharedPreferences.getInstance();
  AuthenticatedUser? savedUser;
  final savedUserStr = prefs.getString('cached_user');
  if (savedUserStr != null) {
    try {
      savedUser = AuthenticatedUser.fromJson(jsonDecode(savedUserStr));
    } catch (e) {
      // Ignored
    }
  }

  final appState = AppState();
  if (savedUser != null) {
    appState.setUser(savedUser);
  }

  runApp(
    EasyLocalization(
      supportedLocales: const [Locale('en'), Locale('ru')],
      path: 'assets/translations',
      fallbackLocale: const Locale('en'),
      child: MultiProvider(
        providers: [
          ChangeNotifierProvider.value(value: appState),
          ChangeNotifierProvider(create: (_) => RunTracker()),
        ],
        child: const MyApp(),
      ),
    ),
  );
}

// --- App ---
class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Orda Run',
      localizationsDelegates: context.localizationDelegates,
      supportedLocales: context.supportedLocales,
      locale: context.locale,
      debugShowCheckedModeBanner: false,
      scrollBehavior: const MaterialScrollBehavior().copyWith(
        dragDevices: {
          PointerDeviceKind.mouse,
          PointerDeviceKind.touch,
          PointerDeviceKind.trackpad,
        },
      ),
      theme: ThemeData(
        useMaterial3: true,
        brightness: Brightness.dark,
        scaffoldBackgroundColor: const Color(0xFF05070A),
        colorScheme: const ColorScheme.dark(
          primary: Color(0xFFFFD60A),
          secondary: Color(0xFF2C5A5A),
          surface: Color(0xFF0D1117),
          background: Color(0xFF05070A),
        ),
        textTheme: GoogleFonts.outfitTextTheme(ThemeData.dark().textTheme).apply(
          bodyColor: Colors.white,
          displayColor: Colors.white,
        ).copyWith(
          displayLarge: GoogleFonts.outfit(fontSize: 32, fontWeight: FontWeight.bold, color: Colors.white),
          headlineMedium: GoogleFonts.outfit(fontSize: 32, fontWeight: FontWeight.bold, color: Colors.white),
          titleLarge: GoogleFonts.outfit(fontSize: 20, fontWeight: FontWeight.w600, color: Colors.white),
          bodyLarge: GoogleFonts.outfit(fontSize: 16, color: Colors.white),
          bodyMedium: GoogleFonts.outfit(fontSize: 16, color: Colors.white),
          bodySmall: GoogleFonts.outfit(fontSize: 13, color: const Color(0xFF8A9099)),
          labelSmall: GoogleFonts.outfit(fontSize: 13, color: const Color(0xFF8A9099)),
        ),
      ),
      home: Consumer<AppState>(
        builder: (context, appState, child) {
          final currentUser = appState.currentUser;
          if (currentUser == null) {
            return const LoginScreen();
          }
          if (currentUser.ordaId == null && !appState.hasSkippedOnboarding) {
            return const OnboardingScreen();
          }
          return const AppShell();
        },
      ),
    );
  }
}

// --- App Shell (Navigation) ---
class AppShell extends StatefulWidget {
  const AppShell({super.key});

  @override
  State<AppShell> createState() => _AppShellState();
}

class _AppShellState extends State<AppShell> {
  @override
  Widget build(BuildContext context) {
    final _currentIndex = context.watch<AppState>().currentTabIndex;
    return Scaffold(
      body: Stack(
        children: [
          // 1. Always show MapScreen if we are on Map (0) or Record (1) tabs
          if (_currentIndex == 0 || _currentIndex == 1)
            const MapScreen(),
            
          // 2. Show other screens on top
          if (_currentIndex == 1)
            const RecordScreen()
          else if (_currentIndex == 2)
            const QuestsScreen()
          else if (_currentIndex == 3)
            const LeaderboardScreen()
          else if (_currentIndex == 4)
            const ProfileScreen(),
            
          Positioned(
            left: 0,
            right: 0,
            bottom: 0,
            child: _buildBottomNav(),
          ),
        ],
      ),
    );
  }

  Widget _buildBottomNav() {
    return Container(
      height: 72,
      decoration: const BoxDecoration(
        color: Color(0xFF0A0B0E), // No blur, solid background
        border: Border(top: BorderSide(color: Color.fromRGBO(255, 255, 255, 0.05))),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceAround,
        children: [
          _buildNavItem(0, Icons.map_outlined, context.watch<AppState>().currentTabIndex),
          _buildNavItem(1, Icons.play_circle_outline, context.watch<AppState>().currentTabIndex),
          _buildNavItem(2, Icons.flag_outlined, context.watch<AppState>().currentTabIndex),
          _buildNavItem(3, Icons.bar_chart_outlined, context.watch<AppState>().currentTabIndex),
          _buildNavItem(4, Icons.person_outline, context.watch<AppState>().currentTabIndex),
        ],
      ),
    );
  }

  Widget _buildNavItem(int index, IconData icon, int currentIndex) {
    final isActive = currentIndex == index;
    final color = isActive ? Theme.of(context).colorScheme.primary : const Color(0xFF8B929C);

    return Expanded(
      child: GestureDetector(
        behavior: HitTestBehavior.opaque,
        onTap: () => context.read<AppState>().setTabIndex(index),
        child: Column(
          children: [
            Container(
              height: 3,
              width: 32,
              decoration: BoxDecoration(
                color: isActive ? Theme.of(context).colorScheme.primary : Colors.transparent,
                borderRadius: const BorderRadius.only(
                  bottomLeft: Radius.circular(3),
                  bottomRight: Radius.circular(3),
                ),
              ),
            ),
            const Spacer(),
            Icon(icon, color: color, size: 24),
            const Spacer(),
          ],
        ),
      ),
    );
  }
}
