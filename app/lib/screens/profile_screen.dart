import 'package:flutter/material.dart';
import '../theme/app_theme.dart';
import '../widgets/avatar_circle.dart';

class ProfileScreen extends StatelessWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 24),
        child: Column(
          children: [
            const SizedBox(height: 32),
            const AvatarCircle(
              initials: 'H',
              size: 80,
              color: AppColors.primary,
            ),
            const SizedBox(height: 16),
            const Text(
              'Hysj User',
              style: TextStyle(
                fontSize: 22,
                fontWeight: FontWeight.bold,
                color: AppColors.textPrimary,
              ),
            ),
            const SizedBox(height: 4),
            const Text(
              '@anonymous',
              style: TextStyle(
                fontSize: 14,
                color: AppColors.textSecondary,
              ),
            ),
            const SizedBox(height: 32),
            _ProfileTile(
              icon: Icons.person_outline,
              title: 'Account',
              onTap: () {},
            ),
            _ProfileTile(
              icon: Icons.lock_outline,
              title: 'Privacy',
              onTap: () {},
            ),
            _ProfileTile(
              icon: Icons.notifications_outlined,
              title: 'Notifications',
              onTap: () {},
            ),
            _ProfileTile(
              icon: Icons.palette_outlined,
              title: 'Appearance',
              onTap: () {},
            ),
            _ProfileTile(
              icon: Icons.vpn_key_outlined,
              title: 'VPN',
              onTap: () {},
              isPremium: true,
            ),
            _ProfileTile(
              icon: Icons.info_outline,
              title: 'About',
              onTap: () {},
            ),
            const Spacer(),
            TextButton(
              onPressed: () {},
              child: const Text(
                'Log out',
                style: TextStyle(color: AppColors.red, fontSize: 16),
              ),
            ),
            const SizedBox(height: 24),
          ],
        ),
      ),
    );
  }
}

class _ProfileTile extends StatelessWidget {
  final IconData icon;
  final String title;
  final VoidCallback onTap;
  final bool isPremium;

  const _ProfileTile({
    required this.icon,
    required this.title,
    required this.onTap,
    this.isPremium = false,
  });

  @override
  Widget build(BuildContext context) {
    return ListTile(
      contentPadding: EdgeInsets.zero,
      leading: Icon(icon, color: AppColors.textSecondary),
      title: Row(
        children: [
          Text(
            title,
            style: const TextStyle(
              color: AppColors.textPrimary,
              fontSize: 16,
            ),
          ),
          if (isPremium) ...[
            const SizedBox(width: 8),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
              decoration: BoxDecoration(
                color: AppColors.primary.withValues(alpha: 0.2),
                borderRadius: BorderRadius.circular(4),
              ),
              child: const Text(
                'PRO',
                style: TextStyle(
                  color: AppColors.primary,
                  fontSize: 10,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
          ],
        ],
      ),
      trailing: const Icon(
        Icons.chevron_right,
        color: AppColors.textMuted,
      ),
      onTap: onTap,
    );
  }
}
