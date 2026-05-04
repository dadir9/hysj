import 'dart:ui';
import 'package:flutter/material.dart';
import '../theme/hysj_theme.dart';

class HysjBottomNav extends StatelessWidget {
  final int currentIndex;
  final ValueChanged<int> onTap;
  final bool isDark;

  const HysjBottomNav({
    super.key,
    required this.currentIndex,
    required this.onTap,
    this.isDark = false,
  });

  static const _items = [
    (icon: Icons.chat_bubble_outline_rounded, activeIcon: Icons.chat_bubble_rounded, label: 'Chats'),
    (icon: Icons.phone_outlined, activeIcon: Icons.phone_rounded, label: 'Calls'),
    (icon: Icons.shield_outlined, activeIcon: Icons.shield_rounded, label: 'VPN'),
    (icon: Icons.person_outline_rounded, activeIcon: Icons.person_rounded, label: 'You'),
  ];

  @override
  Widget build(BuildContext context) {
    final bgColor = isDark
        ? HysjColors.dBg.withValues(alpha: 0.96)
        : HysjColors.paper.withValues(alpha: 0.96);
    final inactiveColor = isDark ? HysjColors.dText3 : HysjColors.gray3;
    final borderColor = isDark ? HysjColors.dLine : HysjColors.gray1;

    return ClipRect(
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 14, sigmaY: 14),
        child: Container(
          decoration: BoxDecoration(
            color: bgColor,
            border: Border(top: BorderSide(color: borderColor, width: 0.5)),
          ),
          padding: EdgeInsets.only(
            bottom: MediaQuery.of(context).padding.bottom.clamp(
                  HysjSpacing.navBottomInset,
                  double.infinity,
                ),
          ),
          child: SizedBox(
            height: 60,
            child: Row(
              children: List.generate(_items.length, (i) {
                final item = _items[i];
                final selected = i == currentIndex;
                return Expanded(
                  child: GestureDetector(
                    behavior: HitTestBehavior.opaque,
                    onTap: () => onTap(i),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        AnimatedContainer(
                          duration: const Duration(milliseconds: 280),
                          curve: Curves.easeOut,
                          width: 24,
                          height: 2,
                          margin: const EdgeInsets.only(bottom: 6),
                          decoration: BoxDecoration(
                            color: selected ? HysjColors.cobalt : Colors.transparent,
                            borderRadius: BorderRadius.circular(1),
                          ),
                        ),
                        Icon(
                          selected ? item.activeIcon : item.icon,
                          size: 22,
                          color: selected ? HysjColors.cobalt : inactiveColor,
                        ),
                        const SizedBox(height: 3),
                        Text(
                          item.label,
                          style: HysjTypo.body(
                            size: 11,
                            weight: selected ? FontWeight.w600 : FontWeight.w500,
                            color: selected ? HysjColors.cobalt : inactiveColor,
                          ),
                        ),
                      ],
                    ),
                  ),
                );
              }),
            ),
          ),
        ),
      ),
    );
  }
}
