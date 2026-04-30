import 'dart:async';

import 'package:flutter/material.dart';
import '../theme/app_theme.dart';
import '../widgets/avatar_circle.dart';

class VideoCallScreen extends StatefulWidget {
  final String name;
  final String initials;
  final Color avatarColor;

  const VideoCallScreen({
    super.key,
    required this.name,
    required this.initials,
    required this.avatarColor,
  });

  @override
  State<VideoCallScreen> createState() => _VideoCallScreenState();
}

class _VideoCallScreenState extends State<VideoCallScreen> {
  late final Timer _timer;
  int _seconds = 0;
  bool _isMuted = false;
  bool _isCameraOn = true;
  bool _isSpeakerOn = false;

  @override
  void initState() {
    super.initState();
    _timer = Timer.periodic(const Duration(seconds: 1), (_) {
      setState(() => _seconds++);
    });
  }

  @override
  void dispose() {
    _timer.cancel();
    super.dispose();
  }

  String get _formattedDuration {
    final minutes = (_seconds ~/ 60).toString().padLeft(2, '0');
    final secs = (_seconds % 60).toString().padLeft(2, '0');
    return '$minutes:$secs';
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      body: SafeArea(
        child: Stack(
          children: [
            // Main content
            Column(
              children: [
                const SizedBox(height: 24),

                // Contact name + timer
                Text(
                  widget.name,
                  style: const TextStyle(
                    fontSize: 22,
                    fontWeight: FontWeight.bold,
                    color: AppColors.textPrimary,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  _formattedDuration,
                  style: const TextStyle(
                    fontSize: 14,
                    color: AppColors.textSecondary,
                  ),
                ),

                // Center avatar
                const Spacer(),
                AvatarCircle(
                  initials: widget.initials,
                  size: 120,
                  color: widget.avatarColor,
                ),
                const Spacer(),

                // Bottom action bar
                Padding(
                  padding: const EdgeInsets.fromLTRB(24, 0, 24, 32),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                    children: [
                      _ActionButton(
                        icon: _isMuted ? Icons.mic_off : Icons.mic,
                        label: 'Mute',
                        isActive: _isMuted,
                        onTap: () => setState(() => _isMuted = !_isMuted),
                      ),
                      _ActionButton(
                        icon: _isCameraOn
                            ? Icons.videocam
                            : Icons.videocam_off,
                        label: 'Camera',
                        isActive: !_isCameraOn,
                        onTap: () =>
                            setState(() => _isCameraOn = !_isCameraOn),
                      ),
                      // End call button (larger, red)
                      GestureDetector(
                        onTap: () => Navigator.pop(context),
                        child: Container(
                          width: 64,
                          height: 64,
                          decoration: const BoxDecoration(
                            color: AppColors.red,
                            shape: BoxShape.circle,
                          ),
                          child: const Icon(
                            Icons.call_end,
                            color: Colors.white,
                            size: 28,
                          ),
                        ),
                      ),
                      _ActionButton(
                        icon: Icons.volume_up,
                        label: 'Speaker',
                        isActive: _isSpeakerOn,
                        onTap: () =>
                            setState(() => _isSpeakerOn = !_isSpeakerOn),
                      ),
                      _ActionButton(
                        icon: Icons.auto_awesome,
                        label: 'Effects',
                        onTap: () {},
                      ),
                    ],
                  ),
                ),
              ],
            ),

            // Self-view rectangle (top-right)
            Positioned(
              top: 16,
              right: 16,
              child: Container(
                width: 100,
                height: 140,
                decoration: BoxDecoration(
                  color: AppColors.surface,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: const Center(
                  child: AvatarCircle(
                    initials: 'Me',
                    size: 48,
                    color: AppColors.primary,
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _ActionButton extends StatelessWidget {
  final IconData icon;
  final String label;
  final bool isActive;
  final VoidCallback onTap;

  const _ActionButton({
    required this.icon,
    required this.label,
    this.isActive = false,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 48,
            height: 48,
            decoration: BoxDecoration(
              color: isActive ? AppColors.surfaceLight : AppColors.surface,
              shape: BoxShape.circle,
            ),
            child: Icon(
              icon,
              color: isActive
                  ? AppColors.textPrimary
                  : AppColors.textSecondary,
              size: 22,
            ),
          ),
          const SizedBox(height: 6),
          Text(
            label,
            style: const TextStyle(
              fontSize: 11,
              color: AppColors.textSecondary,
            ),
          ),
        ],
      ),
    );
  }
}
