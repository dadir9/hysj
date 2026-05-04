import 'package:flutter/material.dart';
import '../../theme/hysj_theme.dart';
import '../../widgets/hysj_icon_button.dart';
import '../../widgets/menu_row.dart';
import '../../widgets/pill_chip.dart';

class ProfileScreen extends StatelessWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: HysjColors.paper,
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const SizedBox(height: 16),

              // ── Topbar ──
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'You',
                          style: HysjTypo.displaySerif(size: 30),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          'Account \u00B7 privacy \u00B7 vpn',
                          style: HysjTypo.mono(
                            size: 11,
                            color: HysjColors.gray3,
                          ),
                        ),
                      ],
                    ),
                  ),
                  const HysjIconButton(
                    icon: Icons.settings_outlined,
                    variant: IconButtonVariant.outline,
                  ),
                ],
              ),
              const SizedBox(height: 24),

              // ── Identity card ──
              Container(
                width: double.infinity,
                padding: const EdgeInsets.symmetric(
                  horizontal: 22,
                  vertical: 18,
                ),
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: HysjColors.gray1),
                ),
                child: Column(
                  children: [
                    // 96px cobalt avatar with italic Instrument Serif "s"
                    Container(
                      width: 96,
                      height: 96,
                      decoration: const BoxDecoration(
                        color: HysjColors.cobalt,
                        shape: BoxShape.circle,
                      ),
                      alignment: Alignment.center,
                      child: Text(
                        's',
                        style: HysjTypo.displaySerif(
                          size: 40,
                          color: Colors.white,
                        ),
                      ),
                    ),
                    const SizedBox(height: 14),
                    Text(
                      '@silent_fox',
                      style: HysjTypo.mono(
                        size: 18,
                        weight: FontWeight.w500,
                        color: HysjColors.ink,
                      ),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      'the quiet one',
                      style: HysjTypo.displaySerif(
                        size: 16,
                        color: HysjColors.gray3,
                        height: 1.3,
                      ),
                    ),
                    const SizedBox(height: 14),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        PillChip(
                          text: 'online',
                          variant: PillVariant.good,
                          leading: Container(
                            width: 6,
                            height: 6,
                            decoration: const BoxDecoration(
                              color: Colors.white,
                              shape: BoxShape.circle,
                            ),
                          ),
                        ),
                        const SizedBox(width: 8),
                        const PillChip(
                          text: 'PRO',
                          variant: PillVariant.cobaltSoft,
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 28),

              // ── Account section ──
              Text('ACCOUNT', style: HysjTypo.label(size: 11)),
              const SizedBox(height: 12),
              Container(
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: HysjColors.gray1),
                ),
                clipBehavior: Clip.antiAlias,
                child: Column(
                  children: [
                    MenuRow(
                      icon: Icons.edit_outlined,
                      label: 'Edit profile',
                      onTap: () {},
                    ),
                    const Divider(height: 1, indent: 18, endIndent: 18, color: HysjColors.gray1),
                    MenuRow(
                      icon: Icons.phone_outlined,
                      label: 'Phone',
                      caption: 'only visible to you',
                      value: '+47 \u00B7\u00B7\u00B7 567',
                      onTap: () {},
                    ),
                    const Divider(height: 1, indent: 18, endIndent: 18, color: HysjColors.gray1),
                    MenuRow(
                      icon: Icons.lock_outline_rounded,
                      label: 'Privacy & blocks',
                      value: 'strict',
                      onTap: () {},
                    ),
                    const Divider(height: 1, indent: 18, endIndent: 18, color: HysjColors.gray1),
                    MenuRow(
                      icon: Icons.notifications_none_rounded,
                      label: 'Notifications',
                      value: 'all',
                      onTap: () {},
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 28),

              // ── Hysj Pro section ──
              Container(
                decoration: BoxDecoration(
                  color: HysjColors.cobaltSoft,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: HysjColors.cobalt),
                ),
                clipBehavior: Clip.antiAlias,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Header
                    Padding(
                      padding: const EdgeInsets.fromLTRB(18, 16, 18, 12),
                      child: Row(
                        children: [
                          Text(
                            'Hysj Pro',
                            style: HysjTypo.mono(
                              size: 13,
                              weight: FontWeight.w600,
                              color: HysjColors.cobalt,
                            ),
                          ),
                          const SizedBox(width: 8),
                          Text(
                            'unlocked',
                            style: HysjTypo.displaySerif(
                              size: 14,
                              color: HysjColors.coral,
                              height: 1.3,
                            ),
                          ),
                        ],
                      ),
                    ),
                    // VPN row
                    _ProMenuRow(
                      icon: Icons.shield_outlined,
                      iconColor: HysjColors.cobalt,
                      iconBg: HysjColors.cobaltSoft,
                      label: 'VPN',
                      trailing: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Text(
                            'on',
                            style: HysjTypo.displaySerif(
                              size: 13,
                              color: HysjColors.good,
                              height: 1.0,
                            ),
                          ),
                          Text(
                            ' \u00B7 Oslo',
                            style: HysjTypo.mono(
                              size: 11,
                              color: HysjColors.good,
                            ),
                          ),
                        ],
                      ),
                      onTap: () {},
                    ),
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 18),
                      child: Container(
                        height: 1,
                        color: HysjColors.cobalt.withValues(alpha: 0.15),
                      ),
                    ),
                    // Vanish messages row
                    MenuRow(
                      icon: Icons.auto_delete_outlined,
                      label: 'Vanish messages',
                      value: '24h',
                      onTap: () {},
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 36),

              // ── Log out ──
              Center(
                child: GestureDetector(
                  onTap: () {},
                  child: Text(
                    'LOG OUT',
                    style: HysjTypo.mono(
                      size: 13,
                      color: HysjColors.bad,
                      weight: FontWeight.w500,
                      letterSpacing: 0.08,
                    ),
                  ),
                ),
              ),
              const SizedBox(height: 40),
            ],
          ),
        ),
      ),
    );
  }
}

/// Custom row for Pro section with a custom trailing widget.
class _ProMenuRow extends StatelessWidget {
  final IconData icon;
  final Color iconColor;
  final Color iconBg;
  final String label;
  final Widget trailing;
  final VoidCallback? onTap;

  const _ProMenuRow({
    required this.icon,
    required this.iconColor,
    required this.iconBg,
    required this.label,
    required this.trailing,
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
                color: iconBg,
                borderRadius: BorderRadius.circular(12),
              ),
              child: Icon(icon, size: 18, color: iconColor),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Text(
                label,
                style: HysjTypo.body(size: 15, weight: FontWeight.w500),
              ),
            ),
            trailing,
            const SizedBox(width: 4),
            const Icon(Icons.chevron_right_rounded,
                size: 18, color: HysjColors.gray2),
          ],
        ),
      ),
    );
  }
}
