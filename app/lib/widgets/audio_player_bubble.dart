import 'dart:async';
import 'package:flutter/material.dart';
import '../theme/app_theme.dart';

/// Audio message bubble with play button, waveform, and 3-min countdown.
class AudioPlayerBubble extends StatefulWidget {
  final Duration duration;
  final bool isOwn;
  final String time;
  final bool isRead;
  final String voiceType;

  const AudioPlayerBubble({
    super.key,
    required this.duration,
    required this.isOwn,
    required this.time,
    this.isRead = false,
    this.voiceType = 'Robot',
  });

  @override
  State<AudioPlayerBubble> createState() => _AudioPlayerBubbleState();
}

class _AudioPlayerBubbleState extends State<AudioPlayerBubble> {
  bool _isPlaying = false;
  double _progress = 0;
  Timer? _playTimer;

  // 3-minute countdown after first play
  bool _hasPlayed = false;
  int _expirySeconds = 180;
  Timer? _expiryTimer;

  @override
  void dispose() {
    _playTimer?.cancel();
    _expiryTimer?.cancel();
    super.dispose();
  }

  void _togglePlay() {
    if (_isPlaying) {
      _playTimer?.cancel();
      setState(() => _isPlaying = false);
    } else {
      if (!_hasPlayed) {
        _hasPlayed = true;
        _startExpiryTimer();
      }
      setState(() => _isPlaying = true);
      final totalMs = widget.duration.inMilliseconds;
      const tickMs = 100;
      _playTimer = Timer.periodic(const Duration(milliseconds: tickMs), (timer) {
        setState(() {
          _progress += tickMs / totalMs;
          if (_progress >= 1.0) {
            _progress = 0;
            _isPlaying = false;
            timer.cancel();
          }
        });
      });
    }
  }

  void _startExpiryTimer() {
    _expiryTimer = Timer.periodic(const Duration(seconds: 1), (timer) {
      setState(() {
        _expirySeconds--;
        if (_expirySeconds <= 0) {
          timer.cancel();
        }
      });
    });
  }

  String _formatDuration(Duration d) {
    final m = d.inMinutes.remainder(60).toString().padLeft(2, '0');
    final s = d.inSeconds.remainder(60).toString().padLeft(2, '0');
    return '$m:$s';
  }

  @override
  Widget build(BuildContext context) {
    return Align(
      alignment: widget.isOwn ? Alignment.centerRight : Alignment.centerLeft,
      child: Container(
        margin: const EdgeInsets.only(bottom: 8),
        constraints: BoxConstraints(
          maxWidth: MediaQuery.of(context).size.width * 0.72,
        ),
        padding: const EdgeInsets.all(10),
        decoration: BoxDecoration(
          color: widget.isOwn ? AppColors.bubbleOwn : AppColors.bubbleOther,
          borderRadius: BorderRadius.only(
            topLeft: const Radius.circular(16),
            topRight: const Radius.circular(16),
            bottomLeft: Radius.circular(widget.isOwn ? 16 : 4),
            bottomRight: Radius.circular(widget.isOwn ? 4 : 16),
          ),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Voice type badge
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
              decoration: BoxDecoration(
                color: Colors.white.withValues(alpha: 0.15),
                borderRadius: BorderRadius.circular(4),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Icon(Icons.smart_toy, size: 12, color: Colors.white70),
                  const SizedBox(width: 4),
                  Text(
                    widget.voiceType,
                    style: const TextStyle(
                      fontSize: 10,
                      color: Colors.white70,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 8),

            // Play button + waveform + duration
            Row(
              children: [
                GestureDetector(
                  onTap: _togglePlay,
                  child: Container(
                    width: 36,
                    height: 36,
                    decoration: const BoxDecoration(
                      color: Colors.white24,
                      shape: BoxShape.circle,
                    ),
                    child: Icon(
                      _isPlaying ? Icons.pause : Icons.play_arrow,
                      color: Colors.white,
                      size: 20,
                    ),
                  ),
                ),
                const SizedBox(width: 8),

                // Waveform bars
                Expanded(
                  child: SizedBox(
                    height: 24,
                    child: CustomPaint(
                      painter: _WaveformPainter(progress: _progress),
                    ),
                  ),
                ),

                const SizedBox(width: 8),
                Text(
                  _formatDuration(widget.duration),
                  style: const TextStyle(
                    fontSize: 12,
                    color: Colors.white70,
                    fontFeatures: [FontFeature.tabularFigures()],
                  ),
                ),
              ],
            ),

            const SizedBox(height: 6),

            // Bottom row: expiry timer + timestamp + read receipt
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                if (_hasPlayed && _expirySeconds > 0)
                  Text(
                    'Expires in ${_expirySeconds ~/ 60}:${(_expirySeconds % 60).toString().padLeft(2, '0')}',
                    style: TextStyle(
                      fontSize: 10,
                      color: _expirySeconds < 60
                          ? AppColors.red
                          : Colors.white54,
                      fontFeatures: const [FontFeature.tabularFigures()],
                    ),
                  )
                else
                  const SizedBox(),
                Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    if (widget.isOwn && widget.isRead)
                      const Padding(
                        padding: EdgeInsets.only(right: 4),
                        child: Icon(
                          Icons.done_all,
                          size: 14,
                          color: AppColors.primaryLight,
                        ),
                      ),
                    Text(
                      widget.time,
                      style: TextStyle(
                        fontSize: 11,
                        color: AppColors.textPrimary.withValues(alpha: 0.5),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _WaveformPainter extends CustomPainter {
  final double progress;

  _WaveformPainter({required this.progress});

  @override
  void paint(Canvas canvas, Size size) {
    const barCount = 30;
    final barWidth = size.width / (barCount * 2);

    for (int i = 0; i < barCount; i++) {
      // Pseudo-random bar heights using a simple pattern
      final seed = (i * 7 + 3) % 11;
      final heightRatio = 0.3 + (seed / 11.0) * 0.7;
      final barHeight = size.height * heightRatio;

      final x = i * barWidth * 2 + barWidth / 2;
      final isPlayed = (i / barCount) <= progress;

      final paint = Paint()
        ..color = isPlayed ? Colors.white : Colors.white38
        ..strokeWidth = barWidth
        ..strokeCap = StrokeCap.round;

      canvas.drawLine(
        Offset(x, size.height / 2 - barHeight / 2),
        Offset(x, size.height / 2 + barHeight / 2),
        paint,
      );
    }
  }

  @override
  bool shouldRepaint(covariant _WaveformPainter oldDelegate) {
    return oldDelegate.progress != progress;
  }
}
