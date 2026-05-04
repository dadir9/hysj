import 'package:flutter/material.dart';
import '../theme/hysj_theme.dart';

enum AvatarSize { sm, md, lg, xl, xxl }

enum AvatarColor { a1, a2, a3, a4, a5, a6, cobalt, coral, ink }

class HysjAvatar extends StatelessWidget {
  final String initials;
  final AvatarSize size;
  final AvatarColor color;

  const HysjAvatar({
    super.key,
    required this.initials,
    this.size = AvatarSize.md,
    this.color = AvatarColor.a1,
  });

  /// Create an avatar with a deterministic color from a string (e.g. username).
  factory HysjAvatar.fromName(String name, {AvatarSize size = AvatarSize.md}) {
    final colorIndex = name.hashCode.abs() % 6;
    final color = AvatarColor.values[colorIndex];
    final parts = name.split(' ');
    final initials = parts.length >= 2
        ? '${parts[0][0]}${parts[1][0]}'
        : name.substring(0, name.length >= 2 ? 2 : name.length);
    return HysjAvatar(initials: initials, size: size, color: color);
  }

  double get _diameter => switch (size) {
        AvatarSize.sm => 24,
        AvatarSize.md => 40,
        AvatarSize.lg => 52,
        AvatarSize.xl => 96,
        AvatarSize.xxl => 132,
      };

  double get _fontSize => switch (size) {
        AvatarSize.sm => 9,
        AvatarSize.md => 14,
        AvatarSize.lg => 18,
        AvatarSize.xl => 34,
        AvatarSize.xxl => 48,
      };

  (Color bg, Color text) get _colors => switch (color) {
        AvatarColor.a1 => HysjColors.avatarPairs[0],
        AvatarColor.a2 => HysjColors.avatarPairs[1],
        AvatarColor.a3 => HysjColors.avatarPairs[2],
        AvatarColor.a4 => HysjColors.avatarPairs[3],
        AvatarColor.a5 => HysjColors.avatarPairs[4],
        AvatarColor.a6 => HysjColors.avatarPairs[5],
        AvatarColor.cobalt => HysjColors.avatarCobalt,
        AvatarColor.coral => HysjColors.avatarCoral,
        AvatarColor.ink => HysjColors.avatarInk,
      };

  @override
  Widget build(BuildContext context) {
    final (bg, text) = _colors;
    return Container(
      width: _diameter,
      height: _diameter,
      decoration: BoxDecoration(
        color: bg,
        shape: BoxShape.circle,
      ),
      alignment: Alignment.center,
      child: Text(
        initials.toUpperCase(),
        style: HysjTypo.body(
          size: _fontSize,
          color: text,
          weight: FontWeight.w600,
        ),
      ),
    );
  }
}
