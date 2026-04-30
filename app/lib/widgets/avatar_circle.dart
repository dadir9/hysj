import 'package:flutter/material.dart';
import '../theme/app_theme.dart';

class AvatarCircle extends StatelessWidget {
  final String initials;
  final double size;
  final Color? color;

  const AvatarCircle({
    super.key,
    required this.initials,
    this.size = 48,
    this.color,
  });

  /// Pick a consistent color from the palette based on the initials.
  Color get _color {
    if (color != null) return color!;
    final index = initials.codeUnits.fold(0, (sum, c) => sum + c);
    return AppColors.avatarPalette[index % AppColors.avatarPalette.length];
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        color: _color,
        shape: BoxShape.circle,
      ),
      child: Center(
        child: Text(
          initials,
          style: TextStyle(
            color: Colors.white,
            fontSize: size * 0.36,
            fontWeight: FontWeight.w600,
          ),
        ),
      ),
    );
  }
}
