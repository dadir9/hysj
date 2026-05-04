import 'package:flutter/material.dart';
import '../theme/hysj_theme.dart';

enum PillVariant { outline, cobalt, cobaltSoft, good, bad, coral }

class PillChip extends StatelessWidget {
  final String text;
  final PillVariant variant;
  final Widget? leading;

  const PillChip({
    super.key,
    required this.text,
    this.variant = PillVariant.outline,
    this.leading,
  });

  @override
  Widget build(BuildContext context) {
    final (bg, fg, border) = switch (variant) {
      PillVariant.outline => (Colors.transparent, HysjColors.gray3, HysjColors.gray1),
      PillVariant.cobalt => (HysjColors.cobalt, Colors.white, Colors.transparent),
      PillVariant.cobaltSoft => (HysjColors.cobaltSoft, HysjColors.cobalt, Colors.transparent),
      PillVariant.good => (HysjColors.good, Colors.white, Colors.transparent),
      PillVariant.bad => (HysjColors.bad, Colors.white, Colors.transparent),
      PillVariant.coral => (HysjColors.coral, Colors.white, Colors.transparent),
    };

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 4),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(HysjSpacing.pillRadius),
        border: border != Colors.transparent
            ? Border.all(color: border)
            : null,
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (leading != null) ...[
            leading!,
            const SizedBox(width: 4),
          ],
          Text(
            text.toUpperCase(),
            style: HysjTypo.label(
              size: 9,
              color: fg,
              weight: FontWeight.w500,
            ),
          ),
        ],
      ),
    );
  }
}
