import 'dart:math';
import 'package:flutter/material.dart';
import '../../theme/hysj_theme.dart';
import '../../widgets/hysj_avatar.dart';

class VoiceRecordingScreen extends StatelessWidget {
  const VoiceRecordingScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Theme(
      data: HysjTheme.dark,
      child: const _VoiceBody(),
    );
  }
}

class _VoiceBody extends StatelessWidget {
  const _VoiceBody();

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: HysjColors.dBg,
      body: SafeArea(
        child: Column(
          children: [
            // ── Header ──
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
              child: Row(
                children: [
                  GestureDetector(
                    onTap: () => Navigator.of(context).pop(),
                    child: const Icon(
                      Icons.arrow_back_rounded,
                      color: HysjColors.dText,
                    ),
                  ),
                  const SizedBox(width: 12),
                  const HysjAvatar(
                    initials: 'J',
                    size: AvatarSize.sm,
                    color: AvatarColor.a2,
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          '@jamal_m',
                          style: TextStyle(
                            fontSize: 15,
                            fontWeight: FontWeight.w600,
                            color: HysjColors.dText,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Row(
                          children: [
                            Container(
                              width: 6,
                              height: 6,
                              decoration: const BoxDecoration(
                                color: HysjColors.coral,
                                shape: BoxShape.circle,
                              ),
                            ),
                            const SizedBox(width: 5),
                            const Text(
                              'Recording...',
                              style: TextStyle(
                                fontSize: 12,
                                color: HysjColors.coral,
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),

            // ── Dimmed messages area ──
            Expanded(
              child: Opacity(
                opacity: 0.25,
                child: ListView(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
                  children: [
                    _DimBubble(text: 'Hey, are you free tonight?', isMe: false),
                    const SizedBox(height: 8),
                    _DimBubble(text: 'Yeah, what do you have in mind?', isMe: true),
                    const SizedBox(height: 8),
                    _DimBubble(text: 'Let\'s grab dinner!', isMe: false),
                  ],
                ),
              ),
            ),

            // ── Voice effect picker ──
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
              child: SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                child: Row(
                  children: [
                    _EffectPill(label: 'Natural', active: true),
                    const SizedBox(width: 8),
                    _EffectPill(label: 'Robot', active: false),
                    const SizedBox(width: 8),
                    _EffectPill(label: 'Deep', active: false),
                    const SizedBox(width: 8),
                    _EffectPill(label: 'High', active: false),
                    const SizedBox(width: 8),
                    _EffectPill(label: 'Echo', active: false),
                  ],
                ),
              ),
            ),

            // ── Recording overlay ──
            Container(
              padding: const EdgeInsets.fromLTRB(24, 20, 24, 16),
              decoration: const BoxDecoration(
                color: HysjColors.dSurface,
                borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
              ),
              child: Column(
                children: [
                  // Pulsing dot + timer
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Container(
                        width: 10,
                        height: 10,
                        decoration: BoxDecoration(
                          color: HysjColors.bad,
                          shape: BoxShape.circle,
                          boxShadow: [
                            BoxShadow(
                              color: HysjColors.bad.withValues(alpha: 0.4),
                              blurRadius: 8,
                              spreadRadius: 2,
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(width: 10),
                      const Text(
                        '0:12',
                        style: TextStyle(
                          fontSize: 28,
                          fontWeight: FontWeight.w300,
                          color: HysjColors.dText,
                          letterSpacing: 2,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 20),

                  // Waveform bars
                  SizedBox(
                    height: 48,
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: List.generate(32, (i) {
                        final h = 8 + (sin(i * 0.5) * 20 + Random(i).nextInt(16)).abs().toDouble();
                        return Container(
                          width: 3,
                          height: h.clamp(6, 48),
                          margin: const EdgeInsets.symmetric(horizontal: 1.5),
                          decoration: BoxDecoration(
                            color: HysjColors.coral.withValues(alpha: 0.7),
                            borderRadius: BorderRadius.circular(2),
                          ),
                        );
                      }),
                    ),
                  ),
                  const SizedBox(height: 24),

                  // Controls
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                    children: [
                      // Cancel
                      GestureDetector(
                        onTap: () => Navigator.of(context).pop(),
                        child: Container(
                          width: 54,
                          height: 54,
                          decoration: BoxDecoration(
                            color: HysjColors.dSurface2,
                            borderRadius: BorderRadius.circular(16),
                            border: Border.all(color: HysjColors.dLine),
                          ),
                          child: const Icon(
                            Icons.close_rounded,
                            color: HysjColors.dText2,
                          ),
                        ),
                      ),
                      // Send
                      GestureDetector(
                        onTap: () => Navigator.of(context).pop(),
                        child: Container(
                          width: 64,
                          height: 64,
                          decoration: BoxDecoration(
                            color: HysjColors.coral,
                            borderRadius: BorderRadius.circular(20),
                          ),
                          child: const Icon(
                            Icons.send_rounded,
                            color: Colors.white,
                            size: 26,
                          ),
                        ),
                      ),
                      // Pause
                      Container(
                        width: 54,
                        height: 54,
                        decoration: BoxDecoration(
                          color: HysjColors.dSurface2,
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(color: HysjColors.dLine),
                        ),
                        child: const Icon(
                          Icons.pause_rounded,
                          color: HysjColors.dText2,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _DimBubble extends StatelessWidget {
  final String text;
  final bool isMe;
  const _DimBubble({required this.text, required this.isMe});

  @override
  Widget build(BuildContext context) {
    return Align(
      alignment: isMe ? Alignment.centerRight : Alignment.centerLeft,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
        decoration: BoxDecoration(
          color: isMe ? HysjColors.dText.withValues(alpha: 0.1) : HysjColors.dSurface2,
          borderRadius: BorderRadius.circular(18),
        ),
        child: Text(
          text,
          style: TextStyle(
            fontSize: 15,
            color: HysjColors.dText.withValues(alpha: 0.5),
          ),
        ),
      ),
    );
  }
}

class _EffectPill extends StatelessWidget {
  final String label;
  final bool active;
  const _EffectPill({required this.label, required this.active});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
      decoration: BoxDecoration(
        color: active ? HysjColors.cobalt : HysjColors.dSurface2,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(
          color: active ? HysjColors.cobalt : HysjColors.dLine,
        ),
      ),
      child: Text(
        label,
        style: TextStyle(
          fontSize: 13,
          fontWeight: FontWeight.w600,
          color: active ? Colors.white : HysjColors.dText2,
        ),
      ),
    );
  }
}
