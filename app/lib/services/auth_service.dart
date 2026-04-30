import 'package:shared_preferences/shared_preferences.dart';

class AuthService {
  static const _keyAccessToken = 'access_token';
  static const _keyRefreshToken = 'refresh_token';
  static const _keyUserId = 'user_id';
  static const _keyDeviceId = 'device_id';

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
  }
}
