import 'package:flutter/material.dart';
import '../theme/app_theme.dart';
import '../widgets/avatar_circle.dart';

class MenuOverlay {
  /// Show the menu as a modal bottom sheet.
  static Future<void> show(BuildContext context) {
    return showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: AppColors.surface,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (_) => const _MenuOverlayContent(),
    );
  }
}

class _MenuOverlayContent extends StatelessWidget {
  const _MenuOverlayContent();

  static const _menuItems = [
    _MenuItem(icon: Icons.group, label: 'Group', color: AppColors.avatarPurple),
    _MenuItem(icon: Icons.history, label: 'History', color: AppColors.green),
    _MenuItem(icon: Icons.videocam, label: 'Video', color: AppColors.primary),
    _MenuItem(icon: Icons.phone, label: 'Call', color: AppColors.avatarPurple),
  ];

  static const _friends = [
    _Friend(initials: 'JM', name: 'Jamal', color: AppColors.avatarOrange),
    _Friend(initials: 'DP', name: 'Darrell', color: AppColors.avatarGreen),
    _Friend(initials: 'SN', name: 'Siti', color: AppColors.avatarBlue),
    _Friend(initials: 'RJ', name: 'Roy', color: AppColors.avatarRed),
    _Friend(initials: 'KN', name: 'Karlina', color: AppColors.avatarGreen),
    _Friend(initials: 'NP', name: 'Niko', color: AppColors.avatarYellow),
    _Friend(initials: 'AL', name: 'Alia', color: AppColors.avatarTeal),
    _Friend(initials: 'BW', name: 'Budi', color: AppColors.avatarPurple),
  ];

  @override
  Widget build(BuildContext context) {
    return DraggableScrollableSheet(
      initialChildSize: 0.75,
      minChildSize: 0.5,
      maxChildSize: 0.9,
      expand: false,
      builder: (context, scrollController) {
        return SingleChildScrollView(
          controller: scrollController,
          child: Padding(
            padding: const EdgeInsets.fromLTRB(24, 12, 24, 24),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Drag handle
                Center(
                  child: Container(
                    width: 40,
                    height: 4,
                    decoration: BoxDecoration(
                      color: AppColors.textMuted,
                      borderRadius: BorderRadius.circular(2),
                    ),
                  ),
                ),
                const SizedBox(height: 20),

                // Search bar
                Container(
                  height: 48,
                  decoration: BoxDecoration(
                    color: AppColors.surfaceLight,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: const Row(
                    children: [
                      SizedBox(width: 14),
                      Icon(
                        Icons.search,
                        color: AppColors.textMuted,
                        size: 20,
                      ),
                      SizedBox(width: 10),
                      Expanded(
                        child: Text(
                          'Search chat, people and more...',
                          style: TextStyle(
                            fontSize: 14,
                            color: AppColors.textMuted,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 28),

                // MENU section
                const Text(
                  'MENU',
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    color: AppColors.textMuted,
                    letterSpacing: 1.2,
                  ),
                ),
                const SizedBox(height: 16),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: _menuItems
                      .map((item) => _MenuButton(item: item))
                      .toList(),
                ),
                const SizedBox(height: 28),

                // FRIENDS section
                const Text(
                  'FRIENDS',
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    color: AppColors.textMuted,
                    letterSpacing: 1.2,
                  ),
                ),
                const SizedBox(height: 16),

                // 2 rows x 4 columns
                GridView.builder(
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                    crossAxisCount: 4,
                    mainAxisSpacing: 16,
                    crossAxisSpacing: 16,
                    childAspectRatio: 0.8,
                  ),
                  itemCount: _friends.length,
                  itemBuilder: (context, index) {
                    final friend = _friends[index];
                    return Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        AvatarCircle(
                          initials: friend.initials,
                          size: 48,
                          color: friend.color,
                        ),
                        const SizedBox(height: 6),
                        Text(
                          friend.name,
                          style: const TextStyle(
                            fontSize: 12,
                            color: AppColors.textSecondary,
                          ),
                          overflow: TextOverflow.ellipsis,
                        ),
                      ],
                    );
                  },
                ),
                const SizedBox(height: 24),

                // Close button
                Center(
                  child: GestureDetector(
                    onTap: () => Navigator.pop(context),
                    child: Container(
                      width: 48,
                      height: 48,
                      decoration: BoxDecoration(
                        color: AppColors.surfaceLight,
                        shape: BoxShape.circle,
                      ),
                      child: const Icon(
                        Icons.arrow_back,
                        color: AppColors.textSecondary,
                        size: 22,
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }
}

class _MenuItem {
  final IconData icon;
  final String label;
  final Color color;

  const _MenuItem({
    required this.icon,
    required this.label,
    required this.color,
  });
}

class _MenuButton extends StatelessWidget {
  final _MenuItem item;

  const _MenuButton({required this.item});

  @override
  Widget build(BuildContext context) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: 56,
          height: 56,
          decoration: BoxDecoration(
            color: item.color.withValues(alpha: 0.15),
            borderRadius: BorderRadius.circular(16),
          ),
          child: Icon(
            item.icon,
            color: item.color,
            size: 24,
          ),
        ),
        const SizedBox(height: 8),
        Text(
          item.label,
          style: const TextStyle(
            fontSize: 12,
            color: AppColors.textSecondary,
          ),
        ),
      ],
    );
  }
}

class _Friend {
  final String initials;
  final String name;
  final Color color;

  const _Friend({
    required this.initials,
    required this.name,
    required this.color,
  });
}
