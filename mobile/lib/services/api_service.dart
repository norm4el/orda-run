import 'dart:convert';
import 'package:http/http.dart' as http;
import '../models/models.dart';
import '../main.dart'; // For AuthenticatedUser
import 'package:latlong2/latlong.dart';
import 'package:flutter/foundation.dart'; // import kIsWeb
import 'package:google_polyline_algorithm/google_polyline_algorithm.dart';
import 'package:google_sign_in/google_sign_in.dart';
import 'package:sign_in_with_apple/sign_in_with_apple.dart';

class ApiService {
  static const String baseUrl = String.fromEnvironment('API_URL', defaultValue: kIsWeb ? 'http://localhost:3000/api' : 'http://192.168.1.12:3000/api'); 
  static const Duration timeoutDuration = Duration(seconds: 10); // 10 second timeout

  Future<AuthenticatedUser?> authenticate(String initData) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/auth'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'initData': initData}),
      ).timeout(timeoutDuration);

        if (response.statusCode == 200) {
          final u = jsonDecode(response.body);
          return AuthenticatedUser.fromJson(u);
        }
    } catch (e) {
      print('Auth error/timeout: $e');
    }
    return null;
  }

  Future<String?> initMobileAuth() async {
    try {
      final response = await http.post(Uri.parse('$baseUrl/auth/mobile/init')).timeout(timeoutDuration);
      if (response.statusCode == 200) {
        return jsonDecode(response.body)['sessionId'];
      }
    } catch (e) {
      print('Init mobile auth error: $e');
    }
    return null;
  }

  Future<Map<String, dynamic>?> pollMobileAuth(String sessionId) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/auth/mobile/poll'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'sessionId': sessionId}),
      ).timeout(timeoutDuration);

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        if (data['status'] == 'success' && data['user'] != null) {
          final u = data['user'];
          final user = AuthenticatedUser.fromJson(u);
          return {'status': 'success', 'user': user};
        }
        return {'status': data['status']};
      }
    } catch (e) {
      print('Poll auth error: $e');
    }
    return null;
  }

  Future<AuthenticatedUser?> signInWithGoogle() async {
    try {
      await GoogleSignIn.instance.initialize(
        clientId: '422197727001-ovgnsce2ju5hhpu7pr8alfj9gbkgrrov.apps.googleusercontent.com',
      );
      final GoogleSignInAccount googleUser = await GoogleSignIn.instance.authenticate();

      final GoogleSignInAuthentication googleAuth = await googleUser.authentication;
      final idToken = googleAuth.idToken;

      if (idToken != null) {
        final response = await http.post(
          Uri.parse('$baseUrl/auth/google'),
          headers: {'Content-Type': 'application/json'},
          body: jsonEncode({'idToken': idToken}),
        ).timeout(timeoutDuration);

        if (response.statusCode == 200) {
          final data = jsonDecode(response.body);
          if (data['id'] != null) {
            return AuthenticatedUser.fromJson(data);
          }
        }
      }
    } catch (e) {
      print('Google sign in error: $e');
    }
    return null;
  }

  Future<AuthenticatedUser?> signInWithApple() async {
    try {
      final credential = await SignInWithApple.getAppleIDCredential(
        scopes: [
          AppleIDAuthorizationScopes.email,
          AppleIDAuthorizationScopes.fullName,
        ],
      );

      final response = await http.post(
        Uri.parse('$baseUrl/auth/apple'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'identityToken': credential.identityToken,
          'givenName': credential.givenName,
          'familyName': credential.familyName,
        }),
      ).timeout(timeoutDuration);

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        if (data['id'] != null) {
          return AuthenticatedUser.fromJson(data);
        } else {
          throw Exception('Неверный формат ответа от сервера');
        }
      } else {
        throw Exception('Ошибка сервера: ${response.statusCode}');
      }
    } catch (e) {
      print('Apple sign in error: $e');
      throw Exception(e.toString());
    }
  }

  String lastTerritoryError = '';

  Future<List<Territory>> getTerritories() async {
    try {
      final response = await http.get(Uri.parse('$baseUrl/territories')).timeout(timeoutDuration);
      if (response.statusCode == 200) {
        final List<dynamic> data = jsonDecode(response.body);
        return data.map((json) => Territory.fromJson(json)).toList();
      } else {
        lastTerritoryError = 'Status: ${response.statusCode} - ${response.body}';
      }
    } catch (e) {
      lastTerritoryError = 'Error: $e';
      print('Fetch territories error/timeout: $e');
    }
    // Return empty list on timeout so it doesn't break
    return [];
  }

  Future<List<RouteData>> getRoutes() async {
    try {
      final response = await http.get(Uri.parse('\$baseUrl/routes')).timeout(timeoutDuration);
      if (response.statusCode == 200) {
        final List<dynamic> data = jsonDecode(response.body);
        return data.map((json) => RouteData.fromJson(json)).toList();
      }
    } catch (e) {
      print('Fetch routes error/timeout: \$e');
    }
    // Return empty list on timeout
    return [];
  }

  Future<bool> saveManualRun(List<LatLng> points, double distanceKm, int durationSecs, String userId) async {
    try {
      final polylineString = encodePolyline(
        points.map((p) => [p.latitude, p.longitude]).toList(),
      );

      final response = await http.post(
        Uri.parse('$baseUrl/runs/manual'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'user_id': userId,
          'polyline': polylineString,
          'distance': distanceKm,
          'duration': durationSecs,
        }),
      ).timeout(timeoutDuration);

      return response.statusCode == 200;
    } catch (e) {
      print('Save manual run error: $e');
      return false;
    }
  }

  Future<Map<String, dynamic>?> getUserStats(String userId) async {
    try {
      final response = await http.get(Uri.parse('$baseUrl/user/stats/$userId')).timeout(timeoutDuration);
      if (response.statusCode == 200) {
        return jsonDecode(response.body);
      }
    } catch (e) {
      print('Get user stats error: $e');
    }
    return null;
  }

  Future<bool> syncStrava(String userId) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/strava/sync'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'user_id': userId}),
      ).timeout(timeoutDuration);
      return response.statusCode == 200;
    } catch (e) {
      print('Sync strava error: $e');
      return false;
    }
  }

  Future<List<dynamic>> getLeaderboard() async {
    try {
      final response = await http.get(Uri.parse('$baseUrl/leaderboard')).timeout(timeoutDuration);
      if (response.statusCode == 200) return jsonDecode(response.body);
    } catch (e) {
      print('getLeaderboard error: $e');
    }
    return [];
  }

  Future<List<dynamic>> getOrdaLeaderboard() async {
    try {
      final response = await http.get(Uri.parse('$baseUrl/orda/leaderboard')).timeout(timeoutDuration);
      if (response.statusCode == 200) return jsonDecode(response.body);
    } catch (e) {
      print('getOrdaLeaderboard error: $e');
    }
    return [];
  }

  Future<List<dynamic>> getQuests(String userId) async {
    try {
      final response = await http.get(Uri.parse('$baseUrl/user/quests/$userId')).timeout(timeoutDuration);
      if (response.statusCode == 200) return jsonDecode(response.body);
    } catch (e) {
      print('getQuests error: $e');
    }
    return [];
  }

  Future<bool> claimQuest(String userId, String questId) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/user/quests/claim'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'user_id': userId, 'quest_id': questId}),
      ).timeout(timeoutDuration);
      return response.statusCode == 200;
    } catch (e) {
      print('claimQuest error: $e');
      return false;
    }
  }

  Future<List<dynamic>> getOrdaList() async {
    try {
      final response = await http.get(Uri.parse('$baseUrl/orda/list')).timeout(timeoutDuration);
      if (response.statusCode == 200) return jsonDecode(response.body);
    } catch (e) {
      print('getOrdaList error: $e');
    }
    return [];
  }

  Future<bool> joinOrda(String userId, String ordaId) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/orda/join'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'user_id': userId, 'orda_id': ordaId}),
      ).timeout(timeoutDuration);
      return response.statusCode == 200;
    } catch (e) {
      print('joinOrda error: $e');
      return false;
    }
  }

  Future<String?> createOrda(String userId, String name) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/orda/create'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'user_id': userId, 'name': name}),
      ).timeout(timeoutDuration);
      if (response.statusCode == 200) {
        return jsonDecode(response.body)['ordaId'];
      }
    } catch (e) {
      print('createOrda error: $e');
    }
    return null;
  }

  Future<bool> leaveOrda(String userId) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/orda/leave'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'user_id': userId}),
      ).timeout(timeoutDuration);
      return response.statusCode == 200;
    } catch (e) {
      print('leaveOrda error: $e');
      return false;
    }
  }

  Future<Map<String, dynamic>?> getUserPublicProfile(String id) async {
    try {
      final response = await http.get(Uri.parse('$baseUrl/user/public/$id')).timeout(timeoutDuration);
      if (response.statusCode == 200) return jsonDecode(response.body);
    } catch (e) {
      print('getUserPublicProfile error: $e');
    }
    return null;
  }

  Future<List<dynamic>> getEvents() async {
    try {
      final response = await http.get(Uri.parse('$baseUrl/events')).timeout(timeoutDuration);
      if (response.statusCode == 200) return jsonDecode(response.body);
    } catch (e) {
      print('getEvents error: $e');
    }
    return [];
  }

  Future<List<dynamic>> getUserRoutes(String userId) async {
    try {
      final response = await http.get(Uri.parse('$baseUrl/user/routes/$userId')).timeout(timeoutDuration);
      if (response.statusCode == 200) return jsonDecode(response.body);
    } catch (e) {
      print('getUserRoutes error: $e');
    }
    return [];
  }

  Future<bool> savePlannedRun({
    required String userId,
    required String polyline,
    required double distance,
    required double duration,
  }) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/runs/manual'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'user_id': userId,
          'polyline': polyline,
          'distance': distance,
          'duration': duration,
        }),
      ).timeout(timeoutDuration);

      if (response.statusCode == 200) {
        return true;
      } else {
        print('Failed to save planned run: ${response.body}');
        return false;
      }
    } catch (e) {
      print('Error saving planned run: \$e');
      return false;
    }
  }

  Future<List<LootDrop>> getDrops() async {
    try {
      final response = await http.get(Uri.parse('$baseUrl/drops')).timeout(timeoutDuration);
      if (response.statusCode == 200) {
        final List<dynamic> data = jsonDecode(response.body);
        return data.map((json) => LootDrop.fromJson(json)).toList();
      } else {
        return [];
      }
    } catch (e) {
      return [];
    }
  }

  Future<Map<String, dynamic>?> claimDrop({required String userId, required String dropId}) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/drops/claim'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'user_id': userId,
          'drop_id': dropId,
        }),
      ).timeout(timeoutDuration);

      if (response.statusCode == 200) {
        return jsonDecode(response.body);
      } else {
        return null;
      }
    } catch (e) {
      return null;
    }
  }
}
