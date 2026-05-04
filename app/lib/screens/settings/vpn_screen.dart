import 'package:flutter/material.dart';
import '../../theme/hysj_theme.dart';
import '../../widgets/hysj_button.dart';

class VpnScreen extends StatelessWidget {
  const VpnScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Theme(
      data: HysjTheme.dark,
      child: const _VpnBody(),
    );
  }
}

class _VpnBody extends StatelessWidget {
  const _VpnBody();

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: HysjColors.dBg,
      body: SafeArea(
        bottom: false,
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const SizedBox(height: 16),

              // ── Topbar ──
              Row(
                crossAxisAlignment: CrossAxisAlignment.center,
                children: [
                  Text(
                    'VPN',
                    style: HysjTypo.displaySerif(
                      size: 30,
                      color: HysjColors.dText,
                    ),
                  ),
                  const SizedBox(width: 10),
                  Container(
                    width: 8,
                    height: 8,
                    decoration: const BoxDecoration(
                      color: HysjColors.good,
                      shape: BoxShape.circle,
                    ),
                  ),
                  const SizedBox(width: 8),
                  Text(
                    'CONNECTED \u00B7 14m',
                    style: HysjTypo.mono(
                      size: 11,
                      color: HysjColors.dText2,
                      weight: FontWeight.w500,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 36),

              // ── Globe visualization ──
              Center(
                child: SizedBox(
                  width: 220,
                  height: 220,
                  child: Stack(
                    children: [
                      // Globe rings + core
                      CustomPaint(
                        size: const Size(220, 220),
                        painter: _GlobePainter(),
                        child: Center(
                          child: Container(
                            width: 100,
                            height: 100,
                            decoration: BoxDecoration(
                              color: HysjColors.cobalt,
                              shape: BoxShape.circle,
                              boxShadow: [
                                BoxShadow(
                                  color: HysjColors.cobalt.withOpacity(0.35),
                                  blurRadius: 32,
                                  spreadRadius: 6,
                                ),
                              ],
                            ),
                            child: Column(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Text(
                                  'on',
                                  style: HysjTypo.displaySerif(
                                    size: 28,
                                    color: Colors.white,
                                    height: 1.1,
                                  ),
                                ),
                                const SizedBox(height: 2),
                                Text(
                                  'SHIELDED',
                                  style: HysjTypo.mono(
                                    size: 9,
                                    color: Colors.white.withOpacity(0.75),
                                    weight: FontWeight.w500,
                                    letterSpacing: 0.15,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ),
                      // Ping dots
                      Positioned(
                        top: 38,
                        left: 52,
                        child: _PingDot(),
                      ),
                      Positioned(
                        top: 70,
                        right: 30,
                        child: _PingDot(),
                      ),
                      Positioned(
                        bottom: 50,
                        left: 36,
                        child: _PingDot(),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 32),

              // ── Status block ──
              Center(
                child: Text(
                  'TUNNELED THROUGH',
                  style: HysjTypo.mono(
                    size: 10,
                    color: HysjColors.dText3,
                    weight: FontWeight.w500,
                  ),
                ),
              ),
              const SizedBox(height: 8),
              Center(
                child: Text(
                  'Norway \u00B7 Oslo 03',
                  style: HysjTypo.displaySerif(
                    size: 28,
                    color: HysjColors.dText,
                    height: 1.2,
                  ),
                ),
              ),
              const SizedBox(height: 28),

              // ── Stat tiles (3-column grid) ──
              Row(
                children: [
                  _StatTile(label: 'LATENCY', value: '12', unit: 'ms'),
                  const SizedBox(width: 8),
                  _StatTile(label: 'DOWN', value: '142', unit: 'm/s'),
                  const SizedBox(width: 8),
                  _StatTile(label: 'SAVED', value: '2.4', unit: 'gb'),
                ],
              ),
              const SizedBox(height: 20),

              // ── Server selector row ──
              Container(
                width: double.infinity,
                padding: const EdgeInsets.symmetric(
                  horizontal: 16,
                  vertical: 14,
                ),
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: HysjColors.dLine),
                ),
                child: Row(
                  children: [
                    // Flag in cobalt-soft tile
                    Container(
                      width: 32,
                      height: 32,
                      decoration: BoxDecoration(
                        color: HysjColors.cobaltSoft,
                        borderRadius: BorderRadius.circular(8),
                      ),
                      alignment: Alignment.center,
                      child: const Text(
                        '\u{1F1F3}\u{1F1F4}',
                        style: TextStyle(fontSize: 16),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Norway, Oslo',
                            style: HysjTypo.body(
                              size: 15,
                              color: HysjColors.dText,
                              weight: FontWeight.w500,
                            ),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            'WIREGUARD \u00B7 36 SERVERS',
                            style: HysjTypo.mono(
                              size: 10,
                              color: HysjColors.dText3,
                            ),
                          ),
                        ],
                      ),
                    ),
                    GestureDetector(
                      onTap: () {},
                      child: Text(
                        'CHANGE \u203A',
                        style: HysjTypo.mono(
                          size: 11,
                          color: HysjColors.cobalt2,
                          weight: FontWeight.w500,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 28),

              // ── Disconnect button ──
              HysjButton(
                label: 'Disconnect',
                variant: HysjButtonVariant.danger,
                onPressed: () {},
              ),
              const SizedBox(height: 32),
            ],
          ),
        ),
      ),
    );
  }
}

class _PingDot extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Container(
      width: 6,
      height: 6,
      decoration: BoxDecoration(
        color: HysjColors.cobalt,
        shape: BoxShape.circle,
        boxShadow: [
          BoxShadow(
            color: HysjColors.cobalt.withOpacity(0.5),
            blurRadius: 6,
            spreadRadius: 1,
          ),
        ],
      ),
    );
  }
}

class _StatTile extends StatelessWidget {
  final String label;
  final String value;
  final String unit;

  const _StatTile({
    required this.label,
    required this.value,
    required this.unit,
  });

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 16),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: HysjColors.dLine),
        ),
        child: Column(
          children: [
            Text(
              label,
              style: HysjTypo.mono(
                size: 9,
                color: HysjColors.dText3,
                weight: FontWeight.w500,
              ),
            ),
            const SizedBox(height: 6),
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              crossAxisAlignment: CrossAxisAlignment.baseline,
              textBaseline: TextBaseline.alphabetic,
              children: [
                Text(
                  value,
                  style: HysjTypo.displaySerif(
                    size: 24,
                    color: HysjColors.dText,
                    height: 1.0,
                  ),
                ),
                const SizedBox(width: 2),
                Text(
                  unit,
                  style: HysjTypo.mono(
                    size: 11,
                    color: HysjColors.dText2,
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _GlobePainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width / 2, size.height / 2);
    final radius = size.width / 2;
    final paint = Paint()
      ..color = HysjColors.gray3.withOpacity(0.3)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1;

    // Outer ring
    canvas.drawCircle(center, radius, paint);

    // Two foreshortened ellipse rings (tilted meridians)
    // Ellipse 1 — vertical tilt
    canvas.drawOval(
      Rect.fromCenter(
        center: center,
        width: radius * 1.2,
        height: radius * 2,
      ),
      paint,
    );

    // Ellipse 2 — opposite tilt
    canvas.drawOval(
      Rect.fromCenter(
        center: center,
        width: radius * 0.7,
        height: radius * 2,
      ),
      paint,
    );
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
