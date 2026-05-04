import 'package:flutter/material.dart';
import '../theme/hysj_theme.dart';

enum HysjButtonVariant { primary, cobalt, ghost, danger }

class HysjButton extends StatelessWidget {
  final String label;
  final VoidCallback? onPressed;
  final HysjButtonVariant variant;
  final bool expanded;
  final IconData? icon;

  const HysjButton({
    super.key,
    required this.label,
    this.onPressed,
    this.variant = HysjButtonVariant.primary,
    this.expanded = true,
    this.icon,
  });

  @override
  Widget build(BuildContext context) {
    final enabled = onPressed != null;
    final (bg, fg, border) = switch (variant) {
      HysjButtonVariant.primary => (HysjColors.ink, Colors.white, Colors.transparent),
      HysjButtonVariant.cobalt => (HysjColors.cobalt, Colors.white, Colors.transparent),
      HysjButtonVariant.ghost => (Colors.transparent, HysjColors.ink, HysjColors.gray1),
      HysjButtonVariant.danger => (HysjColors.bad, Colors.white, Colors.transparent),
    };

    return SizedBox(
      width: expanded ? double.infinity : null,
      height: 54,
      child: Opacity(
        opacity: enabled ? 1.0 : 0.5,
        child: GestureDetector(
          onTap: onPressed,
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 24),
            decoration: BoxDecoration(
              color: bg,
              borderRadius: BorderRadius.circular(16),
              border: border != Colors.transparent
                  ? Border.all(color: border)
                  : null,
            ),
            alignment: Alignment.center,
            child: Row(
              mainAxisSize: expanded ? MainAxisSize.max : MainAxisSize.min,
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Text(
                  label,
                  style: TextStyle(
                    color: fg,
                    fontSize: 16,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                if (icon != null) ...[
                  const SizedBox(width: 8),
                  Icon(icon, color: fg, size: 18),
                ],
              ],
            ),
          ),
        ),
      ),
    );
  }
}
