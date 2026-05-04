import 'package:flutter/material.dart';
import '../../theme/hysj_theme.dart';
import '../../widgets/hysj_avatar.dart';
import 'video_call_screen.dart';

class IncomingCallScreen extends StatelessWidget {
  const IncomingCallScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Theme(
      data: HysjTheme.dark,
      child: const _IncomingBody(),
    );
  }
}

class _IncomingBody extends StatelessWidget {
  const _IncomingBody();

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        decoration: BoxDecoration(
          gradient: RadialGradient(
            center: Alignment.center,
            radius: 1.2,
            colors: [
              HysjColors.cobalt.withValues(alpha: 0.2),
              HysjColors.dBg,
            ],
          ),
        ),
        child: SafeArea(
          child: Column(
            children: [
              const SizedBox(height: 48),

              // ── Labels ──
              Text(
                'INCOMING \u00B7 HYSJ AUDIO',
                style: HysjTypo.label(
                  size: 11,
                  color: HysjColors.dText2,
                ),
              ),
              const SizedBox(height: 10),
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Container(
                    width: 6,
                    height: 6,
                    decoration: const BoxDecoration(
                      color: HysjColors.good,
                      shape: BoxShape.circle,
                    ),
                  ),
                  const SizedBox(width: 6),
                  Text(
                    'end-to-end encrypted',
                    style: TextStyle(
                      fontSize: 12,
                      color: HysjColors.good.withValues(alpha: 0.8),
                    ),
                  ),
                ],
              ),

              const Spacer(flex: 2),

              // ── Avatar with halo ──
              Stack(
                alignment: Alignment.center,
                children: [
                  // Outer halo
                  Container(
                    width: 180,
                    height: 180,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      border: Border.all(
                        color: HysjColors.cobalt.withValues(alpha: 0.08),
                        width: 1,
                      ),
                    ),
                  ),
                  // Middle halo
                  Container(
                    width: 156,
                    height: 156,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      border: Border.all(
                        color: HysjColors.cobalt.withValues(alpha: 0.15),
                        width: 1,
                      ),
                    ),
                  ),
                  // Avatar
                  const HysjAvatar(
                    initials: 'J',
                    size: AvatarSize.xl,
                    color: AvatarColor.a2,
                  ),
                ],
              ),
              const SizedBox(height: 28),

              // ── Name ──
              Text(
                'Jamal',
                style: HysjTypo.displaySerif(
                  size: 34,
                  color: HysjColors.dText,
                ),
              ),
              const SizedBox(height: 6),
              Text(
                '@jamal_m',
                style: HysjTypo.mono(
                  size: 11,
                  color: HysjColors.dText2,
                ),
              ),

              const Spacer(flex: 1),

              // ── Reply pill ──
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 10),
                decoration: BoxDecoration(
                  color: HysjColors.dSurface2,
                  borderRadius: BorderRadius.circular(24),
                  border: Border.all(color: HysjColors.dLine),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Text(
                      '\u{1F4AC}',
                      style: TextStyle(fontSize: 16),
                    ),
                    const SizedBox(width: 8),
                    Text(
                      'Reply with a message',
                      style: TextStyle(
                        fontSize: 14,
                        color: HysjColors.dText2,
                      ),
                    ),
                  ],
                ),
              ),

              const Spacer(flex: 1),

              // ── Action buttons ──
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 48),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                  children: [
                    // Decline
                    Column(
                      children: [
                        GestureDetector(
                          onTap: () => Navigator.of(context).pop(),
                          child: Container(
                            width: 68,
                            height: 68,
                            decoration: BoxDecoration(
                              color: HysjColors.bad,
                              shape: BoxShape.circle,
                            ),
                            child: const Icon(
                              Icons.call_end_rounded,
                              color: Colors.white,
                              size: 30,
                            ),
                          ),
                        ),
                        const SizedBox(height: 10),
                        Text(
                          'DECLINE',
                          style: HysjTypo.mono(
                            size: 9,
                            color: HysjColors.dText2,
                          ),
                        ),
                      ],
                    ),
                    // Accept
                    Column(
                      children: [
                        GestureDetector(
                          onTap: () {
                            Navigator.of(context).pushReplacement(
                              MaterialPageRoute(
                                builder: (_) => const VideoCallScreen(),
                              ),
                            );
                          },
                          child: Container(
                            width: 68,
                            height: 68,
                            decoration: BoxDecoration(
                              color: HysjColors.good,
                              shape: BoxShape.circle,
                            ),
                            child: const Icon(
                              Icons.call_rounded,
                              color: Colors.white,
                              size: 30,
                            ),
                          ),
                        ),
                        const SizedBox(height: 10),
                        Text(
                          'ACCEPT',
                          style: HysjTypo.mono(
                            size: 9,
                            color: HysjColors.dText2,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 48),
            ],
          ),
        ),
      ),
    );
  }
}
