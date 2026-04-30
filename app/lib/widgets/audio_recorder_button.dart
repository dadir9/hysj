import 'dart:async';
import 'package:flutter/material.dart';
import '../theme/app_theme.dart';

/// Hold-to-record audio button with visual feedback.
class AudioRecorderButton extends StatefulWidget {
  final ValueChanged<Duration> onRecordingComplete;
  final VoidCallback? onRecordingStart;
  final Duration maxDuration;

  const AudioRecorderButton({
    super.key,
    required this.onRecordingComplete,
    this.onRecordingStart,
    this.maxDuration = const Duration(minutes: 5),
  });

  @override
  State<AudioRecorderButton> createState() => _AudioRecorderButtonState();
}

class _AudioRecorderButtonState extends State<AudioRecorderButton>
    with SingleTickerProviderStateMixin {
  bool _isRecording = false;
  Duration _elapsed = Duration.zero;
  Timer? _timer;
  late AnimationController _pulseController;

  @override
  void initState() {
    super.initState();
    _pulseController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1000),
    );
  }

  @override
  void dispose() {
    _timer?.cancel();
    _pulseController.dispose();
    super.dispose();
  }

  void _startRecording() {
    setState(() {
      _isRecording = true;
      _elapsed = Duration.zero;
    });
    _pulseController.repeat(reverse: true);
    widget.onRecordingStart?.call();

    _timer = Timer.periodic(const Duration(seconds: 1), (timer) {
      setState(() {
        _elapsed += const Duration(seconds: 1);
      });
      if (_elapsed >= widget.maxDuration) {
        _stopRecording();
      }
    });
  }

  void _stopRecording() {
    _timer?.cancel();
    _pulseController.stop();
    _pulseController.reset();
    setState(() => _isRecording = false);

    if (_elapsed.inSeconds > 0) {
      widget.onRecordingComplete(_elapsed);
    }
  }

  String _formatDuration(Duration d) {
    final minutes = d.inMinutes.remainder(60).toString().padLeft(2, '0');
    final seconds = d.inSeconds.remainder(60).toString().padLeft(2, '0');
    return '$minutes:$seconds';
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        if (_isRecording) ...[
          // Timer display
          Text(
            _formatDuration(_elapsed),
            style: const TextStyle(
              color: AppColors.red,
              fontSize: 16,
              fontWeight: FontWeight.w600,
              fontFeatures: [FontFeature.tabularFigures()],
            ),
          ),
          const SizedBox(height: 4),
          const Text(
            'Release to send',
            style: TextStyle(
              color: AppColors.textMuted,
              fontSize: 12,
            ),
          ),
          const SizedBox(height: 12),
        ],

        // Record button
        GestureDetector(
          onLongPressStart: (_) => _startRecording(),
          onLongPressEnd: (_) => _stopRecording(),
          child: AnimatedBuilder(
            animation: _pulseController,
            builder: (context, child) {
              final scale = _isRecording ? 1.0 + _pulseController.value * 0.15 : 1.0;
              return Transform.scale(
                scale: scale,
                child: Container(
                  width: 56,
                  height: 56,
                  decoration: BoxDecoration(
                    color: _isRecording ? AppColors.red : AppColors.primary,
                    shape: BoxShape.circle,
                    boxShadow: _isRecording
                        ? [
                            BoxShadow(
                              color: AppColors.red.withValues(alpha: 0.4),
                              blurRadius: 16,
                              spreadRadius: 4,
                            ),
                          ]
                        : null,
                  ),
                  child: Icon(
                    _isRecording ? Icons.stop : Icons.mic,
                    color: Colors.white,
                    size: 24,
                  ),
                ),
              );
            },
          ),
        ),

        if (!_isRecording) ...[
          const SizedBox(height: 4),
          const Text(
            'Hold to record',
            style: TextStyle(
              color: AppColors.textMuted,
              fontSize: 12,
            ),
          ),
        ],
      ],
    );
  }
}
