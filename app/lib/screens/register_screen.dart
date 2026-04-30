import 'dart:convert';
import 'dart:math';
import 'package:flutter/material.dart';
import '../theme/app_theme.dart';
import '../main.dart' show apiClient, authService;
import '../services/api_client.dart';
import 'home_shell.dart';

/// Handles both registration (new users) and login (existing users).
/// After OTP verification, we don't know which case it is, so we start
/// in register mode and switch to login if registration returns 409.
class RegisterScreen extends StatefulWidget {
  final String phoneNumber;
  final String verificationToken;

  const RegisterScreen({
    super.key,
    required this.phoneNumber,
    required this.verificationToken,
  });

  @override
  State<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends State<RegisterScreen> {
  final _passwordController = TextEditingController();
  final _confirmController = TextEditingController();
  bool _isLoading = false;
  bool _obscurePassword = true;
  bool _obscureConfirm = true;
  bool _isLoginMode = false;

  @override
  void dispose() {
    _passwordController.dispose();
    _confirmController.dispose();
    super.dispose();
  }

  /// Generate random base64 bytes (temporary placeholder until FRB crypto).
  // TODO: Replace with real key generation via Flutter Rust Bridge
  String _randomBase64(int bytes) {
    final rng = Random.secure();
    final data = List<int>.generate(bytes, (_) => rng.nextInt(256));
    return base64Encode(data);
  }

  Future<void> _handleLoginResponse(Map<String, dynamic> result) async {
    await authService.saveTokens(
      accessToken: result['access_token'] as String,
      refreshToken: result['refresh_token'] as String,
    );
    await authService.saveUserInfo(
      userId: result['user_id'] as String,
      deviceId: result['device_id'] as String,
    );

    if (!mounted) return;
    Navigator.pushAndRemoveUntil(
      context,
      MaterialPageRoute(builder: (_) => const HomeShell()),
      (_) => false,
    );
  }

  Future<void> _onSubmit() async {
    final password = _passwordController.text;
    if (password.length < 8) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Password must be at least 8 characters')),
      );
      return;
    }

    if (!_isLoginMode) {
      final confirm = _confirmController.text;
      if (password != confirm) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Passwords do not match')),
        );
        return;
      }
    }

    if (_isLoading) return;
    setState(() => _isLoading = true);

    try {
      if (_isLoginMode) {
        final result = await apiClient.login(widget.phoneNumber, password);
        await _handleLoginResponse(result);
      } else {
        // TODO: Replace with real X3DH keys via Flutter Rust Bridge
        final identityKey = _randomBase64(32);
        final signedPreKey = _randomBase64(32);
        final signedPreKeySig = _randomBase64(64);
        final kyberKey = _randomBase64(32);
        final oneTimePreKeys = List.generate(10, (_) => _randomBase64(32));

        try {
          final result = await apiClient.register({
            'phone_number': widget.phoneNumber,
            'password': password,
            'identity_public_key': identityKey,
            'signed_pre_key': signedPreKey,
            'signed_pre_key_signature': signedPreKeySig,
            'kyber_public_key': kyberKey,
            'one_time_pre_keys': oneTimePreKeys,
            'device_name': 'Flutter App',
          });
          await _handleLoginResponse(result);
        } on ApiException catch (e) {
          // 409 = user already exists → switch to login mode
          if (e.statusCode == 409) {
            if (!mounted) return;
            setState(() => _isLoginMode = true);
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(
                content: Text('Account exists. Enter your password to log in.'),
              ),
            );
            return;
          }
          rethrow;
        }
      }
    } on ApiException catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(_isLoginMode
            ? 'Login failed: ${e.message}'
            : 'Registration failed: ${e.message}')),
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Error: $e')),
      );
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 32),
          child: Column(
            children: [
              const SizedBox(height: 16),

              // Back button
              Align(
                alignment: Alignment.centerLeft,
                child: IconButton(
                  onPressed: () => Navigator.pop(context),
                  icon: const Icon(
                    Icons.chevron_left,
                    color: AppColors.primary,
                    size: 28,
                  ),
                ),
              ),

              const SizedBox(height: 24),

              // Icon
              Container(
                width: 64,
                height: 64,
                decoration: BoxDecoration(
                  color: AppColors.primary.withValues(alpha: 0.2),
                  shape: BoxShape.circle,
                ),
                child: Center(
                  child: Icon(
                    _isLoginMode ? Icons.lock_outline : Icons.shield_outlined,
                    color: AppColors.primary,
                    size: 32,
                  ),
                ),
              ),

              const SizedBox(height: 24),

              Text(
                _isLoginMode ? 'Welcome back' : 'Create account',
                style: const TextStyle(
                  fontSize: 28,
                  fontWeight: FontWeight.bold,
                  color: AppColors.textPrimary,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                _isLoginMode
                    ? 'Enter your password to log in'
                    : 'Set a password to secure your account',
                style: const TextStyle(
                  fontSize: 14,
                  color: AppColors.textSecondary,
                ),
              ),

              const SizedBox(height: 40),

              // Password field
              const Align(
                alignment: Alignment.centerLeft,
                child: Text(
                  'Password',
                  style: TextStyle(fontSize: 13, color: AppColors.textSecondary),
                ),
              ),
              const SizedBox(height: 8),
              TextField(
                controller: _passwordController,
                obscureText: _obscurePassword,
                style: const TextStyle(color: AppColors.textPrimary),
                decoration: InputDecoration(
                  hintText: _isLoginMode ? 'Enter password' : 'Min. 8 characters',
                  suffixIcon: IconButton(
                    icon: Icon(
                      _obscurePassword
                          ? Icons.visibility_off
                          : Icons.visibility,
                      color: AppColors.textMuted,
                    ),
                    onPressed: () =>
                        setState(() => _obscurePassword = !_obscurePassword),
                  ),
                ),
              ),

              // Confirm password (register mode only)
              if (!_isLoginMode) ...[
                const SizedBox(height: 20),
                const Align(
                  alignment: Alignment.centerLeft,
                  child: Text(
                    'Confirm password',
                    style:
                        TextStyle(fontSize: 13, color: AppColors.textSecondary),
                  ),
                ),
                const SizedBox(height: 8),
                TextField(
                  controller: _confirmController,
                  obscureText: _obscureConfirm,
                  style: const TextStyle(color: AppColors.textPrimary),
                  decoration: InputDecoration(
                    hintText: 'Re-enter password',
                    suffixIcon: IconButton(
                      icon: Icon(
                        _obscureConfirm
                            ? Icons.visibility_off
                            : Icons.visibility,
                        color: AppColors.textMuted,
                      ),
                      onPressed: () =>
                          setState(() => _obscureConfirm = !_obscureConfirm),
                    ),
                  ),
                ),
              ],

              const Spacer(),

              // Toggle mode link
              GestureDetector(
                onTap: () {
                  setState(() {
                    _isLoginMode = !_isLoginMode;
                    _passwordController.clear();
                    _confirmController.clear();
                  });
                },
                child: Text(
                  _isLoginMode
                      ? "Don't have an account? Create one"
                      : 'Already have an account? Log in',
                  style: const TextStyle(
                    fontSize: 14,
                    color: AppColors.primary,
                  ),
                ),
              ),
              const SizedBox(height: 16),

              // Submit button
              ElevatedButton(
                onPressed: _isLoading ? null : _onSubmit,
                child: _isLoading
                    ? const SizedBox(
                        width: 24,
                        height: 24,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          color: AppColors.textPrimary,
                        ),
                      )
                    : Text(_isLoginMode ? 'Log in' : 'Create account'),
              ),
              const SizedBox(height: 48),
            ],
          ),
        ),
      ),
    );
  }
}
