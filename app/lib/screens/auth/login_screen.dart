import 'package:flutter/material.dart';
import '../../theme/hysj_theme.dart';
import '../../widgets/hysj_button.dart';
import '../../widgets/hysj_input.dart';
import '../../main.dart' show apiClient, authService, chatService;
import '../home_shell.dart';
import 'otp_screen.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _phoneController = TextEditingController();
  final _passwordController = TextEditingController();
  bool _loading = false;
  String? _error;
  bool _showPasswordLogin = false;

  @override
  void dispose() {
    _phoneController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  String get _fullPhone => '+47${_phoneController.text.replaceAll(' ', '')}';

  Future<void> _onContinue() async {
    if (_phoneController.text.replaceAll(' ', '').length < 8) {
      setState(() => _error = 'Enter a valid phone number');
      return;
    }
    setState(() { _loading = true; _error = null; });
    try {
      final res = await apiClient.sendOtp(_fullPhone);
      if (!mounted) return;
      final devCode = res['dev_code'] as String?;
      Navigator.of(context).push(
        MaterialPageRoute(builder: (_) => OtpScreen(phoneNumber: _fullPhone, devCode: devCode)),
      );
    } catch (e) {
      setState(() => _error = 'Could not send SMS. Try again.');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _onPasswordLogin() async {
    if (_phoneController.text.replaceAll(' ', '').length < 8) {
      setState(() => _error = 'Enter a valid phone number');
      return;
    }
    if (_passwordController.text.isEmpty) {
      setState(() => _error = 'Enter your password');
      return;
    }
    setState(() { _loading = true; _error = null; });
    try {
      final res = await apiClient.login(_fullPhone, _passwordController.text);
      await authService.saveTokens(
        accessToken: res['access_token'] as String,
        refreshToken: res['refresh_token'] as String,
      );
      await authService.saveUserInfo(
        userId: res['user_id'] as String,
        deviceId: res['device_id'] as String,
      );
      try { await chatService.init(); } catch (_) {}
      if (!mounted) return;
      Navigator.of(context).pushAndRemoveUntil(
        MaterialPageRoute(builder: (_) => const HomeShell()),
        (route) => false,
      );
    } catch (e) {
      setState(() => _error = 'Wrong phone number or password');
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
                const SizedBox(height: 48),

                Center(
                  child: Container(
                    width: 56, height: 56,
                    decoration: BoxDecoration(color: HysjColors.ink, borderRadius: BorderRadius.circular(16)),
                    alignment: Alignment.center,
                    child: const Text('h', style: TextStyle(color: Colors.white, fontSize: 28, fontWeight: FontWeight.w700, height: 1)),
                  ),
                ),
                const SizedBox(height: 36),

                RichText(
                  text: TextSpan(
                    style: HysjTypo.displaySerif(size: 38),
                    children: [
                      const TextSpan(text: 'Welcome '),
                      TextSpan(text: 'back.', style: HysjTypo.displaySerif(size: 38, color: HysjColors.cobalt)),
                    ],
                  ),
                ),
                const SizedBox(height: 12),

                Text(
                  'Your number is private \u2014 only used to verify.',
                  style: HysjTypo.body(size: 15, color: HysjColors.gray3, height: 1.5),
                ),
                const SizedBox(height: 36),

                Text('PHONE', style: HysjTypo.label(size: 10, color: HysjColors.gray3)),
                const SizedBox(height: 10),

                Row(
                  children: [
                    Container(
                      width: 96, height: HysjSpacing.buttonHeight,
                      decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(HysjSpacing.inputRadius),
                        border: Border.all(color: HysjColors.gray1),
                      ),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          const Text('\u{1F1F3}\u{1F1F4}', style: TextStyle(fontSize: 20)),
                          const SizedBox(width: 6),
                          Text('+47', style: HysjTypo.body(size: 16, color: HysjColors.ink, weight: FontWeight.w600)),
                        ],
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: HysjInput(hint: '912 34 567', keyboardType: TextInputType.phone, controller: _phoneController),
                    ),
                  ],
                ),

                if (_showPasswordLogin) ...[
                  const SizedBox(height: 16),
                  Text('PASSWORD', style: HysjTypo.label(size: 10, color: HysjColors.gray3)),
                  const SizedBox(height: 10),
                  HysjInput(
                    hint: 'Your password',
                    obscureText: true,
                    controller: _passwordController,
                  ),
                ],

                if (_error != null) ...[
                  const SizedBox(height: 12),
                  Text(_error!, style: HysjTypo.body(size: 13, color: HysjColors.bad)),
                ],
                const SizedBox(height: 20),

                Row(
                  children: [
                    const Icon(Icons.lock_outline_rounded, size: 16, color: HysjColors.gray3),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        'Friends find you by @username \u2014 never by phone.',
                        style: HysjTypo.body(size: 13, color: HysjColors.gray3, height: 1.4),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 36),

                if (_showPasswordLogin)
                  HysjButton(
                    label: _loading ? 'Logging in...' : 'Log in',
                    onPressed: _loading ? null : _onPasswordLogin,
                  )
                else
                  HysjButton(
                    label: _loading ? 'Sending...' : 'New account \u2192',
                    onPressed: _loading ? null : _onContinue,
                  ),
                const SizedBox(height: 16),

                Center(
                  child: GestureDetector(
                    onTap: () => setState(() => _showPasswordLogin = !_showPasswordLogin),
                    child: Text(
                      _showPasswordLogin
                          ? 'New user? Create account'
                          : 'Already have an account? Log in',
                      style: HysjTypo.body(size: 14, color: HysjColors.cobalt, weight: FontWeight.w500),
                    ),
                  ),
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
