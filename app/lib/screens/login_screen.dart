import 'dart:math';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../main.dart' show apiClient;
import 'otp_screen.dart';

// Exact Figma colors for this screen
const _bg = Color(0xFF121217);
const _inputBg = Color(0xFF1C1C24);
const _inputBorder = Color(0xFF2E303B);
const _textWhite = Color(0xFFFFFFFF);
const _textInput = Color(0xFFCCD1DB);
const _textSubtitle = Color(0xFF737885);
const _textLabel = Color(0xFF808594);
const _textHint = Color(0xFF595E6B);
const _textTerms = Color(0xFF4D5261);
const _blue = Color(0xFF4073F2);
const _blueAccent = Color(0xFF4D80FF);

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _phoneController = TextEditingController();
  final String _countryCode = '+47';
  bool _isLoading = false;

  @override
  void dispose() {
    _phoneController.dispose();
    super.dispose();
  }

  Future<void> _onContinue() async {
    final phone = _phoneController.text.trim();
    if (phone.isEmpty || phone.length < 8) return;
    if (_isLoading) return;

    setState(() => _isLoading = true);

    try {
      final fullNumber = '$_countryCode$phone';
      await apiClient.sendOtp(fullNumber);

      if (!mounted) return;
      Navigator.push(
        context,
        MaterialPageRoute(
          builder: (_) => OtpScreen(phoneNumber: fullNumber),
        ),
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Could not send code: $e')),
      );
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: _bg,
      body: SafeArea(
        child: SingleChildScrollView(
          child: ConstrainedBox(
            constraints: BoxConstraints(
              minHeight: MediaQuery.of(context).size.height -
                  MediaQuery.of(context).padding.top -
                  MediaQuery.of(context).padding.bottom,
            ),
            child: IntrinsicHeight(
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 32),
                child: Column(
                  children: [
                    const SizedBox(height: 6),

                    // Logo — 48x48 blue circle with "H"
                    Container(
                      width: 48,
                      height: 48,
                      decoration: const BoxDecoration(
                        color: _blue,
                        shape: BoxShape.circle,
                      ),
                      child: const Center(
                        child: Text(
                          'H',
                          style: TextStyle(
                            color: _textWhite,
                            fontSize: 22,
                            fontWeight: FontWeight.bold,
                            fontFamily: 'Inter',
                          ),
                        ),
                      ),
                    ),

                    const SizedBox(height: 16),

                    // Particle heart — 280x220
                    const SizedBox(
                      height: 220,
                      width: 280,
                      child: _ParticleHeart(),
                    ),

                    const SizedBox(height: 12),

                    // Welcome — 34px bold
                    const Text(
                      'Welcome',
                      style: TextStyle(
                        fontSize: 34,
                        fontWeight: FontWeight.bold,
                        color: _textWhite,
                        fontFamily: 'Inter',
                      ),
                    ),
                    const SizedBox(height: 10),

                    // Subtitle — 15px #737885
                    const Text(
                      'Enter your phone number to get started',
                      style: TextStyle(
                        fontSize: 15,
                        color: _textSubtitle,
                        fontFamily: 'Inter',
                      ),
                    ),

                    const SizedBox(height: 32),

                    // "Phone number" label — 13px #808594 left-aligned
                    const Align(
                      alignment: Alignment.centerLeft,
                      child: Text(
                        'Phone number',
                        style: TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.w500,
                          color: _textLabel,
                          fontFamily: 'Inter',
                        ),
                      ),
                    ),
                    const SizedBox(height: 8),

                    // Phone input row
                    Row(
                      children: [
                        // Country code — 80x56, bg #1C1C24, border #2E303B, radius 14
                        Container(
                          width: 80,
                          height: 56,
                          decoration: BoxDecoration(
                            color: _inputBg,
                            borderRadius: BorderRadius.circular(14),
                            border: Border.all(color: _inputBorder),
                          ),
                          child: const Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Text('🇳🇴', style: TextStyle(fontSize: 20)),
                              SizedBox(width: 4),
                              Text(
                                '+47',
                                style: TextStyle(
                                  color: _textInput,
                                  fontSize: 16,
                                  fontWeight: FontWeight.w600,
                                  fontFamily: 'Inter',
                                ),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(width: 12),

                        // Phone number field — 56px height, same style
                        Expanded(
                          child: Container(
                            height: 56,
                            decoration: BoxDecoration(
                              color: _inputBg,
                              borderRadius: BorderRadius.circular(14),
                              border: Border.all(color: _inputBorder),
                            ),
                            child: TextField(
                              controller: _phoneController,
                              keyboardType: TextInputType.phone,
                              inputFormatters: [
                                FilteringTextInputFormatter.digitsOnly,
                                LengthLimitingTextInputFormatter(8),
                              ],
                              style: const TextStyle(
                                color: _textInput,
                                fontSize: 18,
                                fontWeight: FontWeight.w500,
                                fontFamily: 'Inter',
                              ),
                              cursorColor: _blueAccent,
                              cursorWidth: 2,
                              decoration: const InputDecoration(
                                hintText: '912 34 567',
                                hintStyle: TextStyle(
                                  color: _textInput,
                                  fontSize: 18,
                                  fontWeight: FontWeight.w500,
                                ),
                                border: InputBorder.none,
                                contentPadding: EdgeInsets.symmetric(
                                  horizontal: 19,
                                  vertical: 16,
                                ),
                              ),
                            ),
                          ),
                        ),
                      ],
                    ),

                    const SizedBox(height: 34),

                    // Continue button — bg #4073F2, 56px, radius 14
                    SizedBox(
                      width: double.infinity,
                      height: 56,
                      child: ElevatedButton(
                        onPressed: _isLoading ? null : _onContinue,
                        style: ElevatedButton.styleFrom(
                          backgroundColor: _blue,
                          disabledBackgroundColor: _blue.withValues(alpha: 0.6),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(14),
                          ),
                          elevation: 0,
                        ),
                        child: _isLoading
                            ? const SizedBox(
                                width: 24,
                                height: 24,
                                child: CircularProgressIndicator(
                                  strokeWidth: 2,
                                  color: _textWhite,
                                ),
                              )
                            : const Text(
                                'Continue',
                                style: TextStyle(
                                  color: _textWhite,
                                  fontSize: 17,
                                  fontWeight: FontWeight.w600,
                                  fontFamily: 'Inter',
                                ),
                              ),
                      ),
                    ),

                    const SizedBox(height: 14),

                    // "We'll send..." — 13px #595E6B
                    const Text(
                      "We'll send you a verification code",
                      style: TextStyle(
                        fontSize: 13,
                        color: _textHint,
                        fontFamily: 'Inter',
                      ),
                    ),

                    const Spacer(),

                    // Terms — 12px #4D5261
                    const Text(
                      'By pressing "Continue" you agree',
                      style: TextStyle(
                        fontSize: 12,
                        color: _textTerms,
                        fontFamily: 'Inter',
                      ),
                    ),
                    const SizedBox(height: 2),
                    const Text(
                      'to our Terms of Service and Privacy Policy',
                      style: TextStyle(
                        fontSize: 12,
                        color: _textTerms,
                        fontFamily: 'Inter',
                      ),
                    ),
                    const SizedBox(height: 22),

                    // Home indicator bar
                    Container(
                      width: 134,
                      height: 5,
                      decoration: BoxDecoration(
                        color: const Color(0xFF40424D).withValues(alpha: 0.15),
                        borderRadius: BorderRadius.circular(3),
                      ),
                    ),
                    const SizedBox(height: 8),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

/// Animated particle heart matching the Figma design.
class _ParticleHeart extends StatefulWidget {
  const _ParticleHeart();

  @override
  State<_ParticleHeart> createState() => _ParticleHeartState();
}

class _ParticleHeartState extends State<_ParticleHeart>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller;
  late final List<_Particle> _particles;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 6),
    )..repeat();

    final rng = Random(42);
    _particles = List.generate(300, (i) {
      final t = (i / 300) * 2 * pi;
      final hx = 16 * pow(sin(t), 3).toDouble();
      final hy =
          -(13 * cos(t) - 5 * cos(2 * t) - 2 * cos(3 * t) - cos(4 * t));

      return _Particle(
        hx: hx,
        hy: hy,
        scatter: 0.7 + rng.nextDouble() * 1.6,
        offsetX: (rng.nextDouble() - 0.5) * 14,
        offsetY: (rng.nextDouble() - 0.5) * 14,
        radius: 1.0 + rng.nextDouble() * 2.2,
        baseAlpha: 0.25 + rng.nextDouble() * 0.75,
        phase: rng.nextDouble() * 2 * pi,
        driftSpeed: 0.3 + rng.nextDouble() * 0.7,
        pulseSpeed: 0.5 + rng.nextDouble() * 1.0,
      );
    });
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _controller,
      builder: (_, _) => CustomPaint(
        painter: _HeartPainter(_particles, _controller.value),
        size: const Size(280, 220),
      ),
    );
  }
}

class _Particle {
  final double hx, hy, scatter, offsetX, offsetY;
  final double radius, baseAlpha, phase, driftSpeed, pulseSpeed;

  const _Particle({
    required this.hx,
    required this.hy,
    required this.scatter,
    required this.offsetX,
    required this.offsetY,
    required this.radius,
    required this.baseAlpha,
    required this.phase,
    required this.driftSpeed,
    required this.pulseSpeed,
  });
}

class _HeartPainter extends CustomPainter {
  final List<_Particle> particles;
  final double t;

  _HeartPainter(this.particles, this.t);

  @override
  void paint(Canvas canvas, Size size) {
    final cx = size.width / 2;
    final cy = size.height / 2 + 8;
    final scaleX = size.width / 36;
    final scaleY = size.height / 30;
    final animT = t * 2 * pi;

    for (final p in particles) {
      final driftX = sin(animT * p.driftSpeed + p.phase) * 3.0;
      final driftY = cos(animT * p.driftSpeed + p.phase * 1.3) * 2.5;

      final x = cx + p.hx * scaleX * p.scatter / 16 * 8 + p.offsetX + driftX;
      final y = cy + p.hy * scaleY * p.scatter / 16 * 8 + p.offsetY + driftY;

      final pulse = sin(animT * p.pulseSpeed + p.phase);
      final r = p.radius + pulse * 0.5;
      final alpha = (p.baseAlpha + pulse * 0.12).clamp(0.1, 1.0);

      canvas.drawCircle(
        Offset(x, y),
        r,
        Paint()
          ..color = _blue.withValues(alpha: alpha)
          ..style = PaintingStyle.fill,
      );
    }
  }

  @override
  bool shouldRepaint(covariant _HeartPainter old) => old.t != t;
}
