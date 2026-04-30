import 'package:flutter/material.dart';
import '../theme/app_theme.dart';
import '../widgets/avatar_circle.dart';
import 'conversation_screen.dart';

class ChatListScreen extends StatelessWidget {
  const ChatListScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header
          Padding(
            padding: const EdgeInsets.fromLTRB(24, 16, 24, 0),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Hysj',
                      style: TextStyle(
                        fontSize: 28,
                        fontWeight: FontWeight.bold,
                        color: AppColors.textPrimary,
                      ),
                    ),
                    SizedBox(height: 2),
                    Text(
                      'Welcome back 🔥',
                      style: TextStyle(
                        fontSize: 13,
                        color: AppColors.textSecondary,
                      ),
                    ),
                  ],
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
                    Icons.menu,
                    color: AppColors.textPrimary,
                    size: 18,
                  ),
                ),
              ],
            ),
          ),

          const SizedBox(height: 16),

          // Stories row
          SizedBox(
            height: 72,
            child: ListView(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 24),
              children: const [
                _StoryAvatar(initials: 'D', color: AppColors.avatarBlue),
                _StoryAvatar(initials: 'J', color: AppColors.avatarOrange),
                _StoryAvatar(initials: 'R', color: AppColors.avatarRed),
                _StoryAvatar(initials: 'K', color: AppColors.avatarGreen),
                _StoryAvatar(initials: 'P', color: AppColors.avatarPurple),
                _StoryAvatar(initials: 'S', color: AppColors.avatarYellow),
              ],
            ),
          ),

          const SizedBox(height: 16),

          // "All chat" label
          const Padding(
            padding: EdgeInsets.symmetric(horizontal: 24),
            child: Text(
              'All chat',
              style: TextStyle(
                fontSize: 14,
                color: AppColors.textSecondary,
              ),
            ),
          ),

          const SizedBox(height: 8),

          // Chat list
          Expanded(
            child: ListView(
              padding: const EdgeInsets.symmetric(horizontal: 24),
              children: const [
                _ChatTile(
                  initials: 'DP',
                  name: 'Darrell Pratama',
                  message: 'I have a new story for you',
                  time: '11:42 PM',
                  unread: 4,
                  color: AppColors.avatarGreen,
                ),
                _ChatTile(
                  initials: 'JM',
                  name: 'Jamal Mirdid',
                  message: 'Do you have a Persian cat?',
                  time: '11:31 PM',
                  color: AppColors.avatarOrange,
                ),
                _ChatTile(
                  initials: 'RJ',
                  name: 'Roy Jaya',
                  message: 'Did you bring an English book?',
                  time: '10:58 PM',
                  unread: 7,
                  color: AppColors.avatarRed,
                ),
                _ChatTile(
                  initials: 'KN',
                  name: 'Karlina Nata',
                  message: "I'm already in front of your house",
                  time: '07:49 PM',
                  unread: 2,
                  color: AppColors.avatarGreen,
                ),
                _ChatTile(
                  initials: 'PK',
                  name: 'Pakde',
                  message: '',
                  time: '06:12 PM',
                  color: AppColors.avatarPurple,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _StoryAvatar extends StatelessWidget {
  final String initials;
  final Color color;

  const _StoryAvatar({required this.initials, required this.color});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(right: 16),
      child: Container(
        width: 56,
        height: 56,
        decoration: BoxDecoration(
          color: color,
          shape: BoxShape.circle,
          border: Border.all(
            color: AppColors.primary.withValues(alpha: 0.5),
            width: 2,
          ),
        ),
        child: Center(
          child: Text(
            initials,
            style: const TextStyle(
              color: Colors.white,
              fontSize: 20,
              fontWeight: FontWeight.w600,
            ),
          ),
        ),
      ),
    );
  }
}

class _ChatTile extends StatelessWidget {
  final String initials;
  final String name;
  final String message;
  final String time;
  final int unread;
  final Color color;

  const _ChatTile({
    required this.initials,
    required this.name,
    required this.message,
    required this.time,
    this.unread = 0,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: () {
        Navigator.push(
          context,
          MaterialPageRoute(
            builder: (_) => ConversationScreen(
              name: name,
              initials: initials,
              avatarColor: color,
            ),
          ),
        );
      },
      child: Padding(
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
                  if (message.isNotEmpty) ...[
                    const SizedBox(height: 2),
                    Text(
                      message,
                      style: const TextStyle(
                        fontSize: 13,
                        color: AppColors.textSecondary,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ],
                ],
              ),
            ),
            Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Text(
                  time,
                  style: const TextStyle(
                    fontSize: 12,
                    color: AppColors.textMuted,
                  ),
                ),
                if (unread > 0) ...[
                  const SizedBox(height: 4),
                  Container(
                    width: 22,
                    height: 22,
                    decoration: const BoxDecoration(
                      color: AppColors.primary,
                      shape: BoxShape.circle,
                    ),
                    child: Center(
                      child: Text(
                        '$unread',
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 11,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                  ),
                ],
              ],
            ),
          ],
        ),
      ),
    );
  }
}
