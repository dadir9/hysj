import 'package:flutter/material.dart';
import '../theme/app_theme.dart';
import '../widgets/avatar_circle.dart';

class CallsScreen extends StatefulWidget {
  const CallsScreen({super.key});

  @override
  State<CallsScreen> createState() => _CallsScreenState();
}

class _CallsScreenState extends State<CallsScreen> {
  int _selectedTab = 0; // 0 = All, 1 = Missed

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header
          Padding(
            padding: const EdgeInsets.fromLTRB(24, 16, 24, 16),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text(
                  'Calls',
                  style: TextStyle(
                    fontSize: 28,
                    fontWeight: FontWeight.bold,
                    color: AppColors.textPrimary,
                  ),
                ),
                Container(
                  width: 36,
                  height: 36,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    border: Border.all(
                      color: AppColors.textMuted,
                      width: 1.5,
                    ),
                  ),
                  child: const Icon(
                    Icons.videocam_outlined,
                    color: AppColors.textSecondary,
                    size: 18,
                  ),
                ),
              ],
            ),
          ),

          // Tab bar (All / Missed)
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 24),
            child: Container(
              height: 40,
              decoration: BoxDecoration(
                color: AppColors.surface,
                borderRadius: BorderRadius.circular(20),
              ),
              child: Row(
                children: [
                  _TabButton(
                    label: 'All',
                    isSelected: _selectedTab == 0,
                    onTap: () => setState(() => _selectedTab = 0),
                  ),
                  _TabButton(
                    label: 'Missed',
                    isSelected: _selectedTab == 1,
                    onTap: () => setState(() => _selectedTab = 1),
                  ),
                ],
              ),
            ),
          ),

          const SizedBox(height: 8),

          // Call history
          Expanded(
            child: ListView(
              padding: const EdgeInsets.symmetric(horizontal: 24),
              children: const [
                _CallTile(
                  initials: 'JM',
                  name: 'Jamal Mirdid',
                  time: 'Today, 3:45 PM',
                  isIncoming: true,
                  isMissed: true,
                  color: AppColors.avatarOrange,
                ),
                _CallTile(
                  initials: 'DP',
                  name: 'Darrell Pratama',
                  time: 'Today, 1:20 PM',
                  isIncoming: false,
                  color: AppColors.avatarGreen,
                ),
                _CallTile(
                  initials: 'SN',
                  name: 'Siti Nuraini',
                  time: 'Yesterday, 8:15 PM',
                  isIncoming: true,
                  isMissed: true,
                  color: AppColors.avatarBlue,
                ),
                _CallTile(
                  initials: 'RJ',
                  name: 'Roy Jaya',
                  time: 'Yesterday, 5:30 PM',
                  isIncoming: true,
                  isMissed: true,
                  color: AppColors.avatarRed,
                ),
                _CallTile(
                  initials: 'KN',
                  name: 'Karlina Nata',
                  time: 'Mar 25, 10:00 AM',
                  isIncoming: false,
                  color: AppColors.avatarGreen,
                ),
                _CallTile(
                  initials: 'NP',
                  name: 'Niko Pratama',
                  time: 'Mar 25, 9:12 AM',
                  isIncoming: true,
                  isMissed: true,
                  color: AppColors.avatarYellow,
                ),
                _CallTile(
                  initials: 'JM',
                  name: 'Jamal Mirdid',
                  time: 'Mar 24, 7:45 PM',
                  isIncoming: false,
                  color: AppColors.avatarOrange,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _TabButton extends StatelessWidget {
  final String label;
  final bool isSelected;
  final VoidCallback onTap;

  const _TabButton({
    required this.label,
    required this.isSelected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: GestureDetector(
        onTap: onTap,
        child: Container(
          alignment: Alignment.center,
          decoration: BoxDecoration(
            color: isSelected ? AppColors.primary : Colors.transparent,
            borderRadius: BorderRadius.circular(20),
          ),
          child: Text(
            label,
            style: TextStyle(
              color: isSelected ? Colors.white : AppColors.textSecondary,
              fontSize: 14,
              fontWeight: FontWeight.w500,
            ),
          ),
        ),
      ),
    );
  }
}

class _CallTile extends StatelessWidget {
  final String initials;
  final String name;
  final String time;
  final bool isIncoming;
  final bool isMissed;
  final Color color;

  const _CallTile({
    required this.initials,
    required this.name,
    required this.time,
    required this.isIncoming,
    this.isMissed = false,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 12),
      child: Row(
        children: [
          AvatarCircle(initials: initials, size: 48, color: color),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  name,
                  style: const TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w600,
                    color: AppColors.textPrimary,
                  ),
                ),
                const SizedBox(height: 2),
                Row(
                  children: [
                    Icon(
                      isIncoming
                          ? Icons.call_received
                          : Icons.call_made,
                      size: 14,
                      color: isMissed ? AppColors.red : AppColors.green,
                    ),
                    const SizedBox(width: 4),
                    Text(
                      time,
                      style: const TextStyle(
                        fontSize: 12,
                        color: AppColors.textSecondary,
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
          IconButton(
            onPressed: () {},
            icon: const Icon(
              Icons.phone,
              color: AppColors.primary,
              size: 20,
            ),
          ),
        ],
      ),
    );
  }
}
