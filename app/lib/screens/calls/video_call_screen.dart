import 'package:flutter/material.dart';
import '../../theme/hysj_theme.dart';
import '../../widgets/hysj_avatar.dart';

class VideoCallScreen extends StatefulWidget {
  const VideoCallScreen({super.key});

  @override
  State<VideoCallScreen> createState() => _VideoCallScreenState();
}

class _VideoCallScreenState extends State<VideoCallScreen> {
  bool _muted = false;
  bool _cameraOn = true;
  bool _speakerOn = false;

  @override
  Widget build(BuildContext context) {
    return Theme(
      data: HysjTheme.dark,
      child: Scaffold(
        backgroundColor: HysjColors.dBg,
        body: SafeArea(
          child: Stack(
            children: [
              // ── Main content ──
              Column(
                children: [
                  // ── Top bar ──
                  Padding(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 20,
                      vertical: 12,
                    ),
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
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'Jamal',
                                style: HysjTypo.displaySerif(
                                  size: 20,
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
                                      color: HysjColors.good,
                                      shape: BoxShape.circle,
                                    ),
                                  ),
                                  const SizedBox(width: 5),
                                  Text(
                                    '04:23 \u00B7 ENCRYPTED',
                                    style: HysjTypo.mono(
                                      size: 10,
                                      color: HysjColors.cobalt2,
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

                  // ── Remote avatar ──
                  const Expanded(
                    child: Center(
                      child: HysjAvatar(
                        initials: 'J',
                        size: AvatarSize.xl,
                        color: AvatarColor.a2,
                      ),
                    ),
                  ),

                  // ── Control grid ──
                  Padding(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 32,
                      vertical: 8,
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                      children: [
                        _ControlButton(
                          icon: _muted
                              ? Icons.mic_off_rounded
                              : Icons.mic_rounded,
                          label: 'Mute',
                          active: _muted,
                          onTap: () => setState(() => _muted = !_muted),
                        ),
                        _ControlButton(
                          icon: _cameraOn
                              ? Icons.videocam_rounded
                              : Icons.videocam_off_rounded,
                          label: 'Camera',
                          active: _cameraOn,
                          onTap: () =>
                              setState(() => _cameraOn = !_cameraOn),
                        ),
                        _ControlButton(
                          icon: _speakerOn
                              ? Icons.volume_up_rounded
                              : Icons.volume_down_rounded,
                          label: 'Speaker',
                          active: _speakerOn,
                          onTap: () =>
                              setState(() => _speakerOn = !_speakerOn),
                        ),
                        _ControlButton(
                          icon: Icons.flip_camera_ios_rounded,
                          label: 'Flip',
                          active: false,
                          onTap: () {},
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 16),

                  // ── End call ──
                  GestureDetector(
                    onTap: () => Navigator.of(context).pop(),
                    child: Container(
                      width: 64,
                      height: 64,
                      decoration: const BoxDecoration(
                        color: HysjColors.bad,
                        shape: BoxShape.circle,
                      ),
                      child: const Icon(
                        Icons.call_end_rounded,
                        color: Colors.white,
                        size: 28,
                      ),
                    ),
                  ),
                  const SizedBox(height: 32),
                ],
              ),

              // ── Self-view PiP ──
              Positioned(
                top: 130,
                right: 16,
                child: Container(
                  width: 74,
                  height: 104,
                  decoration: BoxDecoration(
                    color: HysjColors.dSurface2,
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(color: HysjColors.dLine, width: 1),
                  ),
                  child: Center(
                    child: HysjAvatar(
                      initials: 'S',
                      size: AvatarSize.md,
                      color: AvatarColor.cobalt,
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _ControlButton extends StatelessWidget {
  final IconData icon;
  final String label;
  final bool active;
  final VoidCallback onTap;

  const _ControlButton({
    required this.icon,
    required this.label,
    required this.active,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Column(
        children: [
          Container(
            width: 56,
            height: 56,
            decoration: BoxDecoration(
              color: active ? Colors.white : HysjColors.dSurface2,
              shape: BoxShape.circle,
            ),
            child: Icon(
              icon,
              color: active ? HysjColors.ink : HysjColors.dText2,
              size: 24,
            ),
          ),
          const SizedBox(height: 6),
          Text(
            label.toUpperCase(),
            style: HysjTypo.mono(
              size: 9,
              color: HysjColors.dText3,
            ),
          ),
        ],
      ),
    );
  }
}
