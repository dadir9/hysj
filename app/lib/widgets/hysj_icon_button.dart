import 'package:flutter/material.dart';
import '../theme/hysj_theme.dart';

enum IconButtonVariant { outline, ink, cobalt }

class HysjIconButton extends StatelessWidget {
  final IconData icon;
  final VoidCallback? onTap;
  final IconButtonVariant variant;
  final double size;

  const HysjIconButton({
    super.key,
    required this.icon,
    this.onTap,
    this.variant = IconButtonVariant.outline,
    this.size = 40,
  });

  @override
  Widget build(BuildContext context) {
    final (bg, fg, border) = switch (variant) {
      IconButtonVariant.outline => (Colors.transparent, HysjColors.ink, HysjColors.gray1),
      IconButtonVariant.ink => (HysjColors.ink, Colors.white, Colors.transparent),
      IconButtonVariant.cobalt => (HysjColors.cobalt, Colors.white, Colors.transparent),
    };

    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: size,
        height: size,
        decoration: BoxDecoration(
          color: bg,
          shape: BoxShape.circle,
          border: border != Colors.transparent
              ? Border.all(color: border)
              : null,
        ),
        child: Icon(icon, color: fg, size: size * 0.45),
      ),
    );
  }
}
