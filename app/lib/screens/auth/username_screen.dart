import 'dart:convert';
import 'dart:math';
import 'package:flutter/material.dart';
import '../../theme/hysj_theme.dart';
import '../../widgets/hysj_button.dart';
import '../../main.dart' show apiClient, authService, chatService;
import '../home_shell.dart';

class UsernameScreen extends StatefulWidget {
  final String phoneNumber;
  final String verificationToken;
  const UsernameScreen({super.key, required this.phoneNumber, required this.verificationToken});

  @override
  State<UsernameScreen> createState() => _UsernameScreenState();
}

class _UsernameScreenState extends State<UsernameScreen> {
  final _usernameController = TextEditingController();
  final _passwordController = TextEditingController();
  bool _obscure = true;
  bool _loading = false;
  String? _error;

  @override
  void dispose() {
    _usernameController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  bool get _hasMinLength => _passwordController.text.length >= 8;
  bool get _hasNumber => _passwordController.text.contains(RegExp(r'[0-9]'));

  /// Generate a dummy base64-encoded 32-byte key for dev registration.
  String _dummyKey() {
    final rng = Random.secure();
    final bytes = List<int>.generate(32, (_) => rng.nextInt(256));
    return base64Encode(bytes);
  }

  Future<void> _createAccount() async {
    final username = _usernameController.text.trim();
    final password = _passwordController.text;

    if (username.length < 3) {
      setState(() => _error = 'Username must be at least 3 characters');
      return;
    }
    if (password.length < 8) {
      setState(() => _error = 'Password must be at least 8 characters');
      return;
    }

    setState(() { _loading = true; _error = null; });

    try {
      // Generate dummy crypto keys for dev (in production, use flutter_rust_bridge)
      final identityKey = _dummyKey();
      final signedPreKey = _dummyKey();
      final signedPreKeySig = _dummyKey();
      final kyberKey = _dummyKey();
      final oneTimePreKeys = List.generate(10, (_) => _dummyKey());

      final res = await apiClient.register({
        'phone_number': widget.phoneNumber,
        'password': password,
        'username': username,
        'device_name': 'Flutter Dev',
        'identity_public_key': identityKey,
        'signed_pre_key': signedPreKey,
        'signed_pre_key_signature': signedPreKeySig,
        'kyber_public_key': kyberKey,
        'one_time_pre_keys': oneTimePreKeys,
      });

      if (!mounted) return;

      // Save tokens
      await authService.saveTokens(
        accessToken: res['access_token'] as String,
        refreshToken: res['refresh_token'] as String,
      );
      await authService.saveUserInfo(
        userId: res['user_id'] as String,
        deviceId: res['device_id'] as String,
      );

      // Init chat service + navigate to home
      try { await chatService.init(); } catch (_) {}
      if (!mounted) return;
      Navigator.of(context).pushAndRemoveUntil(
        MaterialPageRoute(builder: (_) => const HomeShell()),
        (route) => false,
      );
    } catch (e) {
      setState(() => _error = 'Registration failed: ${e.toString().length > 80 ? e.toString().substring(0, 80) : e}');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Theme(
      data: HysjTheme.light,
      child: Scaffold(
        backgroundColor: HysjColors.paper,
        body: SafeArea(
          child: SingleChildScrollView(
            padding: const EdgeInsets.symmetric(horizontal: 28),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const SizedBox(height: 12),

                Row(
                  children: [
                    GestureDetector(
                      onTap: () => Navigator.of(context).pop(),
                      child: const Icon(Icons.arrow_back_rounded, color: HysjColors.ink),
                    ),
                    const Spacer(),
                    Text('STEP 03 OF 03', style: HysjTypo.label(size: 11, color: HysjColors.gray3)),
                  ],
                ),
                const SizedBox(height: 36),

                RichText(
                  text: TextSpan(
                    style: HysjTypo.displaySerif(size: 34),
                    children: [
                      const TextSpan(text: 'Pick a '),
                      TextSpan(text: 'handle.', style: HysjTypo.displaySerif(size: 34, color: HysjColors.cobalt)),
                    ],
                  ),
                ),
                const SizedBox(height: 12),

                Text(
                  'This is what other people see. Your number stays private.',
                  style: HysjTypo.body(size: 15, color: HysjColors.gray3, height: 1.5),
                ),
                const SizedBox(height: 36),

                Text('USERNAME', style: HysjTypo.label()),
                const SizedBox(height: 8),

                SizedBox(
                  height: HysjSpacing.buttonHeight,
                  child: TextField(
                    controller: _usernameController,
                    style: HysjTypo.body(size: 16, color: HysjColors.ink, weight: FontWeight.w500),
                    decoration: InputDecoration(
                      hintText: 'username',
                      prefixIcon: Padding(
                        padding: const EdgeInsets.only(left: 16, right: 4),
                        child: Text('@', style: HysjTypo.mono(size: 18, color: HysjColors.gray3, weight: FontWeight.w500)),
                      ),
                      prefixIconConstraints: const BoxConstraints(minWidth: 0, minHeight: 0),
                    ),
                  ),
                ),
                const SizedBox(height: 10),

                Text(
                  '3\u201320 characters \u00B7 letters, numbers, underscore',
                  style: HysjTypo.body(size: 12, color: HysjColors.gray3),
                ),
                const SizedBox(height: 28),

                Text('PASSWORD', style: HysjTypo.label()),
                const SizedBox(height: 8),

                SizedBox(
                  height: HysjSpacing.buttonHeight,
                  child: TextField(
                    controller: _passwordController,
                    obscureText: _obscure,
                    onChanged: (_) => setState(() {}),
                    style: HysjTypo.body(size: 16, color: HysjColors.ink, weight: FontWeight.w500),
                    decoration: InputDecoration(
                      hintText: 'Create a password',
                      suffixIcon: GestureDetector(
                        onTap: () => setState(() => _obscure = !_obscure),
                        child: Padding(
                          padding: const EdgeInsets.only(right: 12),
                          child: Icon(
                            _obscure ? Icons.visibility_off_outlined : Icons.visibility_outlined,
                            color: HysjColors.gray3, size: 20,
                          ),
                        ),
                      ),
                      suffixIconConstraints: const BoxConstraints(minWidth: 0, minHeight: 0),
                    ),
                  ),
                ),
                const SizedBox(height: 14),

                Row(
                  children: [
                    _StrengthChip(label: '8+ chars', met: _hasMinLength),
                    const SizedBox(width: 10),
                    _StrengthChip(label: 'has number', met: _hasNumber),
                  ],
                ),

                if (_error != null) ...[
                  const SizedBox(height: 16),
                  Text(_error!, style: HysjTypo.body(size: 13, color: HysjColors.bad)),
                ],
                const SizedBox(height: 40),

                HysjButton(
                  label: _loading ? 'Creating...' : 'Create account',
                  onPressed: _loading ? null : _createAccount,
                ),
                const SizedBox(height: 32),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _StrengthChip extends StatelessWidget {
  final String label;
  final bool met;
  const _StrengthChip({required this.label, required this.met});

  @override
  Widget build(BuildContext context) {
    final color = met ? HysjColors.good : HysjColors.gray2;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(HysjSpacing.pillRadius),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(width: 6, height: 6, decoration: BoxDecoration(color: color, shape: BoxShape.circle)),
          const SizedBox(width: 6),
          Text(label, style: HysjTypo.label(size: 10, color: color, weight: FontWeight.w600)),
        ],
      ),
    );
  }
}
