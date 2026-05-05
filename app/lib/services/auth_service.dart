import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';

class AuthService {
  static const _keyAccessToken = 'access_token';
  static const _keyRefreshToken = 'refresh_token';
  static const _keyUserId = 'user_id';
  static const _keyDeviceId = 'device_id';
  static const _keyUsername = 'username';

  SharedPreferences? _prefs;

  Future<SharedPreferences> get _preferences async {
    _prefs ??= await SharedPreferences.getInstance();
    return _prefs!;
  }

  // --- Tokens ---

  Future<void> saveTokens({
    required String accessToken,
    required String refreshToken,
  }) async {
    final prefs = await _preferences;
    await prefs.setString(_keyAccessToken, accessToken);
    await prefs.setString(_keyRefreshToken, refreshToken);
    // Extract username from JWT payload
    final username = _extractFromJwt(accessToken, 'username');
    if (username != null) {
      await prefs.setString(_keyUsername, username);
    }
  }

  Future<String?> get accessToken async {
    final prefs = await _preferences;
    return prefs.getString(_keyAccessToken);
  }

  Future<String?> get refreshToken async {
    final prefs = await _preferences;
    return prefs.getString(_keyRefreshToken);
  }

  // --- User info ---

  Future<void> saveUserInfo({
    required String userId,
    required String deviceId,
  }) async {
    final prefs = await _preferences;
    await prefs.setString(_keyUserId, userId);
    await prefs.setString(_keyDeviceId, deviceId);
  }

  Future<String?> get currentUserId async {
    final prefs = await _preferences;
    return prefs.getString(_keyUserId);
  }

  Future<String?> get currentDeviceId async {
    final prefs = await _preferences;
    return prefs.getString(_keyDeviceId);
  }

  Future<String?> get currentUsername async {
    final prefs = await _preferences;
    return prefs.getString(_keyUsername);
  }

  Future<bool> get isLoggedIn async {
    final token = await accessToken;
    return token != null && token.isNotEmpty;
  }

  // --- Logout ---

  Future<void> logout() async {
    final prefs = await _preferences;
    await prefs.remove(_keyAccessToken);
    await prefs.remove(_keyRefreshToken);
    await prefs.remove(_keyUserId);
    await prefs.remove(_keyDeviceId);
    await prefs.remove(_keyUsername);
  }

  /// Extract a field from a JWT token payload (base64 decoded).
  String? _extractFromJwt(String token, String field) {
    try {
      final parts = token.split('.');
      if (parts.length != 3) return null;
      final payload = parts[1];
      // Add padding if needed
      final padded = payload.padRight((payload.length + 3) & ~3, '=');
      final decoded = utf8.decode(base64Url.decode(padded));
      final json = jsonDecode(decoded) as Map<String, dynamic>;
      return json[field] as String?;
    } catch (_) {
      return null;
    }
  }
}
