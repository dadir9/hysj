import 'dart:convert';
import 'dart:typed_data';

import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:http/http.dart' as http;

import 'auth_service.dart';
import 'chat_service.dart';

class ApiException implements Exception {
  final int statusCode;
  final String message;

  ApiException(this.statusCode, this.message);

  @override
  String toString() => 'ApiException($statusCode): $message';
}

class ApiClient {
  final String baseUrl;
  final AuthService _authService;
  final http.Client _http;

  bool _isRefreshing = false;

  static String get _defaultBaseUrl =>
      kIsWeb ? 'http://localhost:8080' : 'http://10.0.2.2:8080';

  ApiClient({
    String? baseUrl,
    required AuthService authService,
    http.Client? httpClient,
  })  : baseUrl = baseUrl ?? _defaultBaseUrl,
        _authService = authService,
        _http = httpClient ?? http.Client();

  // ---------------------------------------------------------------------------
  // Auth endpoints
  // ---------------------------------------------------------------------------

  Future<Map<String, dynamic>> sendOtp(String phoneNumber) async {
    return _post('/api/auth/otp/send', body: {'phone_number': phoneNumber});
  }

  Future<Map<String, dynamic>> verifyOtp(
      String phoneNumber, String code) async {
    return _post('/api/auth/otp/verify', body: {
      'phone_number': phoneNumber,
      'code': code,
    });
  }

  Future<Map<String, dynamic>> register(
      Map<String, dynamic> registerRequest) async {
    return _post('/api/auth/register', body: registerRequest);
  }

  Future<Map<String, dynamic>> login(
      String phoneNumber, String password) async {
    return _post('/api/auth/login', body: {
      'phone_number': phoneNumber,
      'password': password,
    });
  }

  Future<Map<String, dynamic>> refresh(String refreshToken) async {
    return _post('/api/auth/refresh', body: {'refresh_token': refreshToken});
  }

  // ---------------------------------------------------------------------------
  // Contacts
  // ---------------------------------------------------------------------------

  Future<Map<String, dynamic>> getContacts() async {
    return _get('/api/contacts');
  }

  /// Add a user as contact.
  Future<Map<String, dynamic>> addContact(String userId) async {
    return _post('/api/contacts/$userId', body: {});
  }

  /// Get contacts as a typed list.
  Future<List<Contact>> getContactsList() async {
    final response = await _http.get(
      Uri.parse('$baseUrl/api/contacts'),
      headers: await _headers(),
    );
    if (response.statusCode == 401 && !_isRefreshing) {
      final refreshed = await _tryRefresh();
      if (refreshed) return getContactsList();
    }
    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw ApiException(response.statusCode, response.body);
    }
    final list = jsonDecode(response.body) as List;
    return list.map((e) => Contact.fromJson(e as Map<String, dynamic>)).toList();
  }

  /// Get a user's devices (to find recipient_device_id for messaging).
  Future<List<Map<String, dynamic>>> getUserDevices(String userId) async {
    final response = await _http.get(
      Uri.parse('$baseUrl/api/keys/$userId'),
      headers: await _headers(),
    );
    if (response.statusCode < 200 || response.statusCode >= 300) {
      return [];
    }
    final data = jsonDecode(response.body);
    if (data is Map && data.containsKey('device_id')) {
      return [data.cast<String, dynamic>()];
    }
    if (data is List) {
      return data.cast<Map<String, dynamic>>();
    }
    return [if (data is Map) data.cast<String, dynamic>()];
  }

  /// Check username availability.
  Future<bool> checkUsername(String username) async {
    final response = await _http.get(
      Uri.parse('$baseUrl/api/auth/username-available/$username'),
      headers: await _headers(),
    );
    if (response.statusCode != 200) return false;
    final data = jsonDecode(response.body) as Map<String, dynamic>;
    return data['available'] == true;
  }

  // ---------------------------------------------------------------------------
  // Keys
  // ---------------------------------------------------------------------------

  Future<Map<String, dynamic>> getPreKeyBundle(String userId) async {
    return _get('/api/keys/$userId');
  }

  // ---------------------------------------------------------------------------
  // Audio
  // ---------------------------------------------------------------------------

  Future<Map<String, dynamic>> uploadAudioInit({
    required String recipientDeviceId,
    required int duration,
    required int size,
  }) async {
    return _post('/api/audio/upload-init', body: {
      'recipient_device_id': recipientDeviceId,
      'duration': duration,
      'size': size,
    });
  }

  Future<Map<String, dynamic>> uploadAudioBlob(
      String audioId, Uint8List bytes) async {
    return _putBytes('/api/audio/$audioId/upload', bytes);
  }

  Future<Uint8List> downloadAudio(String audioId) async {
    return _getBytes('/api/audio/$audioId');
  }

  // ---------------------------------------------------------------------------
  // Push
  // ---------------------------------------------------------------------------

  Future<Map<String, dynamic>> registerPushToken(
      String token, String platform) async {
    return _post('/api/push/register', body: {
      'token': token,
      'platform': platform,
    });
  }

  // ---------------------------------------------------------------------------
  // Internal HTTP helpers
  // ---------------------------------------------------------------------------

  Future<Map<String, String>> _headers({bool withAuth = true}) async {
    final headers = <String, String>{
      'Content-Type': 'application/json',
    };
    if (withAuth) {
      final token = await _authService.accessToken;
      if (token != null) {
        headers['Authorization'] = 'Bearer $token';
      }
    }
    return headers;
  }

  Future<Map<String, dynamic>> _get(String path) async {
    final response = await _http.get(
      Uri.parse('$baseUrl$path'),
      headers: await _headers(),
    );
    return _handleResponse(response, () => _get(path));
  }

  Future<Uint8List> _getBytes(String path) async {
    final response = await _http.get(
      Uri.parse('$baseUrl$path'),
      headers: await _headers(),
    );
    if (response.statusCode == 401 && !_isRefreshing) {
      final refreshed = await _tryRefresh();
      if (refreshed) {
        return _getBytes(path);
      }
    }
    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw ApiException(response.statusCode, response.body);
    }
    return response.bodyBytes;
  }

  Future<Map<String, dynamic>> _post(String path,
      {required Map<String, dynamic> body}) async {
    final response = await _http.post(
      Uri.parse('$baseUrl$path'),
      headers: await _headers(),
      body: jsonEncode(body),
    );
    return _handleResponse(response, () => _post(path, body: body));
  }

  Future<Map<String, dynamic>> _putBytes(
      String path, Uint8List bytes) async {
    final headers = await _headers();
    headers['Content-Type'] = 'application/octet-stream';
    final response = await _http.put(
      Uri.parse('$baseUrl$path'),
      headers: headers,
      body: bytes,
    );
    return _handleResponse(response, () => _putBytes(path, bytes));
  }

  Future<Map<String, dynamic>> _handleResponse(
    http.Response response,
    Future<Map<String, dynamic>> Function() retry,
  ) async {
    if (response.statusCode == 401 && !_isRefreshing) {
      final refreshed = await _tryRefresh();
      if (refreshed) {
        return retry();
      }
    }

    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw ApiException(response.statusCode, response.body);
    }

    if (response.body.isEmpty) {
      return <String, dynamic>{};
    }

    return jsonDecode(response.body) as Map<String, dynamic>;
  }

  Future<bool> _tryRefresh() async {
    _isRefreshing = true;
    try {
      final rt = await _authService.refreshToken;
      if (rt == null) return false;

      final response = await _http.post(
        Uri.parse('$baseUrl/api/auth/refresh'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'refresh_token': rt}),
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body) as Map<String, dynamic>;
        await _authService.saveTokens(
          accessToken: data['access_token'] as String,
          refreshToken: data['refresh_token'] as String,
        );
        return true;
      }
      return false;
    } finally {
      _isRefreshing = false;
    }
  }

  void dispose() {
    _http.close();
  }
}
