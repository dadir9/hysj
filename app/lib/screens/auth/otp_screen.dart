import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../theme/hysj_theme.dart';
import '../../widgets/hysj_button.dart';
import '../../main.dart' show apiClient;
import 'username_screen.dart';

class OtpScreen extends StatefulWidget {
  final String phoneNumber;
  final String? devCode;
  const OtpScreen({super.key, required this.phoneNumber, this.devCode});

  @override
  State<OtpScreen> createState() => _OtpScreenState();
}

class _OtpScreenState extends State<OtpScreen> {
  final List<TextEditingController> _controllers =
      List.generate(6, (_) => TextEditingController());
  final List<FocusNode> _focusNodes = List.generate(6, (_) => FocusNode());
  int _resendSeconds = 30;
  Timer? _timer;
  bool _loading = false;
  String? _error;

  String get _maskedNumber {
    final n = widget.phoneNumber;
    if (n.length > 5) {
      return '${n.substring(0, 3)} \u00B7\u00B7\u00B7 \u00B7\u00B7\u00B7 ${n.substring(n.length - 3)}';
    }
    return n;
  }

  @override
  void initState() {
    super.initState();
    _startTimer();
    // Auto-fill OTP in dev mode
    if (widget.devCode != null && widget.devCode!.length == 6) {
      for (int i = 0; i < 6; i++) {
        _controllers[i].text = widget.devCode![i];
      }
    } else {
      _focusNodes[0].requestFocus();
    }
  }

  void _startTimer() {
    _timer?.cancel();
    _resendSeconds = 30;
    _timer = Timer.periodic(const Duration(seconds: 1), (_) {
      if (_resendSeconds > 0) {
        setState(() => _resendSeconds--);
      } else {
        _timer?.cancel();
      }
    });
  }

  @override
  void dispose() {
    _timer?.cancel();
    for (final c in _controllers) { c.dispose(); }
    for (final f in _focusNodes) { f.dispose(); }
    super.dispose();
  }

  String get _code => _controllers.map((c) => c.text).join();

  Future<void> _verify() async {
    final code = _code;
    if (code.length != 6) {
      setState(() => _error = 'Enter all 6 digits');
      return;
    }

    setState(() { _loading = true; _error = null; });

    try {
      final res = await apiClient.verifyOtp(widget.phoneNumber, code);
      if (!mounted) return;

      if (res['verified'] == true && res['verification_token'] != null) {
        Navigator.of(context).push(
          MaterialPageRoute(
            builder: (_) => UsernameScreen(
              phoneNumber: widget.phoneNumber,
              verificationToken: res['verification_token'] as String,
            ),
          ),
        );
      } else {
        setState(() => _error = 'Invalid code. Try again.');
      }
    } catch (e) {
      setState(() => _error = 'Verification failed. Try again.');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _resend() async {
    if (_resendSeconds > 0) return;
    try {
      await apiClient.sendOtp(widget.phoneNumber);
      _startTimer();
    } catch (_) {}
  }

  void _onDigitChanged(int index, String value) {
    if (value.length == 1 && index < 5) {
      _focusNodes[index + 1].requestFocus();
    }
    if (value.isEmpty && index > 0) {
      _focusNodes[index - 1].requestFocus();
    }
    setState(() {});
  }

  @override
  Widget build(BuildContext context) {
    return Theme(
      data: HysjTheme.dark,
      child: Scaffold(
        backgroundColor: HysjColors.dBg,
        body: SafeArea(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 28),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const SizedBox(height: 12),

                Row(
                  children: [
                    GestureDetector(
                      onTap: () => Navigator.of(context).pop(),
                      child: const Icon(Icons.arrow_back_rounded, color: HysjColors.dText),
                    ),
                    const Spacer(),
                    Text('STEP 02 OF 03', style: HysjTypo.label(size: 11, color: HysjColors.dText2)),
                  ],
                ),
                const SizedBox(height: 36),

                RichText(
                  text: TextSpan(
                    style: HysjTypo.displaySerif(size: 34, color: HysjColors.dText),
                    children: [
                      const TextSpan(text: 'Check your '),
                      TextSpan(text: 'SMS.', style: HysjTypo.displaySerif(size: 34, color: HysjColors.cobalt2)),
                    ],
                  ),
                ),
                const SizedBox(height: 12),

                Text(_maskedNumber, style: HysjTypo.body(size: 15, color: HysjColors.dText2, height: 1.5)),
                const SizedBox(height: 40),

                // OTP input boxes
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: List.generate(6, (i) {
                    return SizedBox(
                      width: 50,
                      height: 60,
                      child: TextField(
                        controller: _controllers[i],
                        focusNode: _focusNodes[i],
                        keyboardType: TextInputType.number,
                        textAlign: TextAlign.center,
                        maxLength: 1,
                        onChanged: (v) => _onDigitChanged(i, v),
                        inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                        style: GoogleFonts.instrumentSerif(
                          fontSize: 26,
                          fontWeight: FontWeight.w400,
                          color: HysjColors.dText,
                        ),
                        decoration: InputDecoration(
                          counterText: '',
                          filled: false,
                          contentPadding: EdgeInsets.zero,
                          enabledBorder: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(14),
                            borderSide: BorderSide(
                              color: _controllers[i].text.isNotEmpty ? HysjColors.dText : HysjColors.dLine,
                              width: 1.5,
                            ),
                          ),
                          focusedBorder: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(14),
                            borderSide: const BorderSide(color: HysjColors.cobalt2, width: 2),
                          ),
                        ),
                      ),
                    );
                  }),
                ),

                if (_error != null) ...[
                  const SizedBox(height: 16),
                  Center(child: Text(_error!, style: HysjTypo.body(size: 13, color: HysjColors.bad))),
                ],
                const SizedBox(height: 28),

                // Resend row
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Text("Didn't get it?", style: HysjTypo.body(size: 13, color: HysjColors.dText3)),
                    const SizedBox(width: 8),
                    GestureDetector(
                      onTap: _resendSeconds == 0 ? _resend : null,
                      child: Text(
                        _resendSeconds > 0
                            ? 'RESEND IN 0:${_resendSeconds.toString().padLeft(2, '0')}'
                            : 'RESEND NOW',
                        style: HysjTypo.mono(size: 11, color: HysjColors.cobalt2),
                      ),
                    ),
                  ],
                ),

                const Spacer(),

                HysjButton(
                  label: _loading ? 'Verifying...' : 'Verify',
                  variant: HysjButtonVariant.cobalt,
                  onPressed: _loading ? null : _verify,
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
