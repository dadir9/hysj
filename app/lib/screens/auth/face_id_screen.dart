import 'package:flutter/material.dart';
import '../../theme/hysj_theme.dart';
import 'login_screen.dart';

class FaceIdScreen extends StatefulWidget {
  const FaceIdScreen({super.key});

  @override
  State<FaceIdScreen> createState() => _FaceIdScreenState();
}

class _FaceIdScreenState extends State<FaceIdScreen>
    with SingleTickerProviderStateMixin {
  late final AnimationController _pulseController;

  @override
  void initState() {
    super.initState();
    _pulseController = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 2),
    )..repeat(reverse: true);
  }

  @override
  void dispose() {
    _pulseController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Theme(
      data: HysjTheme.dark,
      child: Scaffold(
        backgroundColor: HysjColors.dBg,
        body: Stack(
          children: [
            // ── Radial cobalt glow ──
            Positioned.fill(
              child: Center(
                child: Container(
                  width: 400,
                  height: 400,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    gradient: RadialGradient(
                      colors: [
                        HysjColors.cobalt.withValues(alpha: 0.12),
                        HysjColors.cobalt.withValues(alpha: 0.04),
                        Colors.transparent,
                      ],
                      stops: const [0.0, 0.5, 1.0],
                    ),
                  ),
                ),
              ),
            ),

            // ── Content ──
            SafeArea(
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 28),
                child: Column(
                  children: [
                    const SizedBox(height: 48),

                    // ── Logo mark ──
                    Container(
                      width: 56,
                      height: 56,
                      decoration: BoxDecoration(
                        color: HysjColors.dText,
                        borderRadius: BorderRadius.circular(16),
                      ),
                      alignment: Alignment.center,
                      child: Text(
                        'h',
                        style: TextStyle(
                          color: HysjColors.ink,
                          fontSize: 28,
                          fontWeight: FontWeight.w700,
                          height: 1,
                        ),
                      ),
                    ),
                    const SizedBox(height: 32),

                    // ── Eyebrow ──
                    Text(
                      'WELCOME BACK, @SILENT_FOX',
                      style: HysjTypo.mono(
                        size: 11,
                        color: HysjColors.cobalt2,
                      ),
                    ),
                    const SizedBox(height: 16),

                    // ── Display heading ──
                    RichText(
                      textAlign: TextAlign.center,
                      text: TextSpan(
                        style: HysjTypo.displaySerif(
                          size: 38,
                          color: HysjColors.dText,
                        ),
                        children: [
                          const TextSpan(text: "Look, and you're "),
                          TextSpan(
                            text: 'in.',
                            style: HysjTypo.displaySerif(
                              size: 38,
                              color: HysjColors.cobalt2,
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 14),

                    // ── Subtitle ──
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 12),
                      child: Text(
                        'Hysj never leaves your device. Your face unlocks the keys, locally.',
                        textAlign: TextAlign.center,
                        style: HysjTypo.body(
                          size: 15,
                          color: HysjColors.dText2,
                          height: 1.5,
                        ),
                      ),
                    ),

                    const Spacer(),

                    // ── Face ID glyph area ──
                    AnimatedBuilder(
                      animation: _pulseController,
                      builder: (context, child) {
                        final opacity =
                            0.6 + (_pulseController.value * 0.4);
                        return Opacity(
                          opacity: opacity,
                          child: child,
                        );
                      },
                      child: SizedBox(
                        width: 148,
                        height: 148,
                        child: CustomPaint(
                          painter: _CornerBracketPainter(
                            color: HysjColors.cobalt2,
                          ),
                          child: Center(
                            child: Icon(
                              Icons.face_outlined,
                              size: 64,
                              color: HysjColors.cobalt2.withValues(alpha: 0.3),
                            ),
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(height: 20),

                    // ── Caption ──
                    Text(
                      'LOOK AT YOUR PHONE',
                      style: HysjTypo.mono(
                        size: 11,
                        color: HysjColors.dText3,
                      ),
                    ),

                    const Spacer(),

                    // ── Ghost button: Use passcode ──
                    SizedBox(
                      width: double.infinity,
                      height: 48,
                      child: Material(
                        color: Colors.transparent,
                        borderRadius: BorderRadius.circular(
                          HysjSpacing.buttonRadius,
                        ),
                        child: InkWell(
                          onTap: () {
                            // Demo: navigate to login
                            Navigator.of(context).pushReplacement(
                              MaterialPageRoute(
                                builder: (_) => const LoginScreen(),
                              ),
                            );
                          },
                          borderRadius: BorderRadius.circular(
                            HysjSpacing.buttonRadius,
                          ),
                          child: Container(
                            decoration: BoxDecoration(
                              borderRadius: BorderRadius.circular(
                                HysjSpacing.buttonRadius,
                              ),
                              border: Border.all(
                                color: HysjColors.dLine,
                                width: 1,
                              ),
                            ),
                            alignment: Alignment.center,
                            child: Text(
                              'Use passcode',
                              style: HysjTypo.body(
                                size: 15,
                                color: HysjColors.dText,
                                weight: FontWeight.w500,
                              ),
                            ),
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(height: 16),

                    // ── Switch account ──
                    GestureDetector(
                      onTap: () {
                        Navigator.of(context).pushReplacement(
                          MaterialPageRoute(
                            builder: (_) => const LoginScreen(),
                          ),
                        );
                      },
                      child: RichText(
                        text: TextSpan(
                          style: HysjTypo.body(
                            size: 13,
                            color: HysjColors.dText3,
                          ),
                          children: [
                            const TextSpan(text: 'Not @silent_fox? '),
                            TextSpan(
                              text: 'Switch account',
                              style: HysjTypo.body(
                                size: 13,
                                color: HysjColors.dText2,
                                weight: FontWeight.w500,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(height: 32),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Corner bracket painter for the Face ID glyph area
// ---------------------------------------------------------------------------

class _CornerBracketPainter extends CustomPainter {
  final Color color;
  _CornerBracketPainter({required this.color});

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = color
      ..strokeWidth = 2.5
      ..style = PaintingStyle.stroke
      ..strokeCap = StrokeCap.round;

    const bracketLen = 32.0;
    const r = 10.0;

    // Top-left
    canvas.drawPath(
      Path()
        ..moveTo(0, bracketLen)
        ..lineTo(0, r)
        ..quadraticBezierTo(0, 0, r, 0)
        ..lineTo(bracketLen, 0),
      paint,
    );

    // Top-right
    canvas.drawPath(
      Path()
        ..moveTo(size.width - bracketLen, 0)
        ..lineTo(size.width - r, 0)
        ..quadraticBezierTo(size.width, 0, size.width, r)
        ..lineTo(size.width, bracketLen),
      paint,
    );

    // Bottom-left
    canvas.drawPath(
      Path()
        ..moveTo(0, size.height - bracketLen)
        ..lineTo(0, size.height - r)
        ..quadraticBezierTo(0, size.height, r, size.height)
        ..lineTo(bracketLen, size.height),
      paint,
    );

    // Bottom-right
    canvas.drawPath(
      Path()
        ..moveTo(size.width - bracketLen, size.height)
        ..lineTo(size.width - r, size.height)
        ..quadraticBezierTo(
            size.width, size.height, size.width, size.height - r)
        ..lineTo(size.width, size.height - bracketLen),
      paint,
    );
  }

  @override
  bool shouldRepaint(covariant _CornerBracketPainter oldDelegate) =>
      oldDelegate.color != color;
}
