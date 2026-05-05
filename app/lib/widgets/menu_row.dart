import 'package:flutter/material.dart';
import '../theme/hysj_theme.dart';

class MenuRow extends StatelessWidget {
  final IconData icon;
  final String label;
  final String? value;
  final VoidCallback? onTap;

  const MenuRow({
    super.key,
    required this.icon,
    required this.label,
    this.value,
    this.onTap,
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
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: HysjColors.gray1),
              ),
              child: Icon(icon, size: 18, color: HysjColors.ink),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Text(
                label,
                style: HysjTypo.body(size: 15, weight: FontWeight.w500),
              ),
            ),
            if (value != null)
              Text(value!, style: HysjTypo.mono(size: 11, color: HysjColors.gray3)),
            const SizedBox(width: 4),
            const Icon(Icons.chevron_right_rounded, size: 18, color: HysjColors.gray2),
          ],
        ),
      ),
    );
  }
}
