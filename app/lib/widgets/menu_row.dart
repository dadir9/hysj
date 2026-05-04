import 'package:flutter/material.dart';
import '../theme/hysj_theme.dart';

class MenuRow extends StatelessWidget {
  final IconData icon;
  final String label;
  final String? value;
  final String? caption;
  final VoidCallback? onTap;
  final Color? iconColor;
  final Color? iconBg;

  const MenuRow({
    super.key,
    required this.icon,
    required this.label,
    this.value,
    this.caption,
    this.onTap,
    this.iconColor,
    this.iconBg,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      behavior: HitTestBehavior.opaque,
      onTap: onTap,
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 16),
        child: Row(
          children: [
            Container(
              width: 38,
              height: 38,
              decoration: BoxDecoration(
                color: iconBg ?? Colors.transparent,
                borderRadius: BorderRadius.circular(12),
                border: iconBg == null
                    ? Border.all(color: HysjColors.gray1)
                    : null,
              ),
              child: Icon(icon, size: 18, color: iconColor ?? HysjColors.ink),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Text(
                        label,
                        style: HysjTypo.body(
                          size: 15,
                          weight: FontWeight.w500,
                        ),
                      ),
                      if (caption != null) ...[
                        const SizedBox(width: 6),
                        Text(
                          caption!,
                          style: HysjTypo.mono(
                            size: 10,
                            color: HysjColors.gray3,
                          ),
                        ),
                      ],
                    ],
                  ),
                ],
              ),
            ),
            if (value != null)
              Text(
                value!,
                style: HysjTypo.mono(size: 11, color: HysjColors.gray3),
              ),
            const SizedBox(width: 4),
            const Icon(Icons.chevron_right_rounded, size: 18, color: HysjColors.gray2),
          ],
        ),
      ),
    );
  }
}
