import 'package:flutter/material.dart';
import '../theme/app_theme.dart';
import '../widgets/avatar_circle.dart';

class ConversationScreen extends StatefulWidget {
  final String name;
  final String initials;
  final Color avatarColor;

  const ConversationScreen({
    super.key,
    required this.name,
    required this.initials,
    required this.avatarColor,
  });

  @override
  State<ConversationScreen> createState() => _ConversationScreenState();
}

class _ConversationScreenState extends State<ConversationScreen> {
  final _messageController = TextEditingController();

  // Demo messages
  final List<_Message> _messages = [
    _Message(
      text: "Yes! I'm interested in lovebirds.\nThey say they're beautiful and have good voices.",
      isOwn: false,
      time: '21:57',
    ),
    _Message(
      text: "That's right, you already know where to buy?",
      isOwn: true,
      time: '21:46',
      isRead: true,
    ),
    _Message(
      text: "Not yet anyway, still looking around. Do you have any recommendations?",
      isOwn: true,
      time: '21:57',
      isRead: true,
    ),
    _Message(
      text: "I usually buy at the bird market near my house",
      isOwn: false,
      time: '21:57',
    ),
    _Message(
      text: "That's right, you already know where to buy?",
      isOwn: true,
      time: '21:46',
      isRead: true,
    ),
  ];

  @override
  void dispose() {
    _messageController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Column(
          children: [
            // Header
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              child: Row(
                children: [
                  IconButton(
                    onPressed: () => Navigator.pop(context),
                    icon: const Icon(
                      Icons.chevron_left,
                      color: AppColors.textPrimary,
                      size: 28,
                    ),
                  ),
                  AvatarCircle(
                    initials: widget.initials,
                    size: 40,
                    color: widget.avatarColor,
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          widget.name,
                          style: const TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w600,
                            color: AppColors.textPrimary,
                          ),
                        ),
                        const Text(
                          'Active 2 minutes ago',
                          style: TextStyle(
                            fontSize: 12,
                            color: AppColors.green,
                          ),
                        ),
                      ],
                    ),
                  ),
                  IconButton(
                    onPressed: () {},
                    icon: const Icon(
                      Icons.videocam_outlined,
                      color: AppColors.textSecondary,
                    ),
                  ),
                  IconButton(
                    onPressed: () {},
                    icon: const Icon(
                      Icons.more_vert,
                      color: AppColors.textSecondary,
                    ),
                  ),
                ],
              ),
            ),

            // Date label
            const Padding(
              padding: EdgeInsets.symmetric(vertical: 8),
              child: Text(
                'Today',
                style: TextStyle(
                  fontSize: 12,
                  color: AppColors.textMuted,
                ),
              ),
            ),

            // Messages
            Expanded(
              child: ListView.builder(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                itemCount: _messages.length,
                itemBuilder: (context, index) {
                  final msg = _messages[index];
                  return _MessageBubble(message: msg);
                },
              ),
            ),

            // Input bar
            Container(
              padding: const EdgeInsets.fromLTRB(8, 8, 8, 8),
              child: Row(
                children: [
                  // Emoji button
                  IconButton(
                    onPressed: () {},
                    icon: const Icon(
                      Icons.emoji_emotions_outlined,
                      color: AppColors.textMuted,
                    ),
                  ),
                  // Text field
                  Expanded(
                    child: TextField(
                      controller: _messageController,
                      style: const TextStyle(
                        color: AppColors.textPrimary,
                        fontSize: 14,
                      ),
                      decoration: InputDecoration(
                        hintText: 'Okay, sounds go',
                        hintStyle: const TextStyle(
                          color: AppColors.textMuted,
                        ),
                        filled: true,
                        fillColor: AppColors.surfaceLight,
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(24),
                          borderSide: BorderSide.none,
                        ),
                        contentPadding: const EdgeInsets.symmetric(
                          horizontal: 16,
                          vertical: 10,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  // Send button
                  Container(
                    width: 40,
                    height: 40,
                    decoration: const BoxDecoration(
                      color: AppColors.primary,
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(
                      Icons.send,
                      color: Colors.white,
                      size: 18,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _Message {
  final String text;
  final bool isOwn;
  final String time;
  final bool isRead;

  _Message({
    required this.text,
    required this.isOwn,
    required this.time,
    this.isRead = false,
  });
}

class _MessageBubble extends StatelessWidget {
  final _Message message;

  const _MessageBubble({required this.message});

  @override
  Widget build(BuildContext context) {
    return Align(
      alignment:
          message.isOwn ? Alignment.centerRight : Alignment.centerLeft,
      child: Container(
        margin: const EdgeInsets.only(bottom: 8),
        constraints: BoxConstraints(
          maxWidth: MediaQuery.of(context).size.width * 0.72,
        ),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
        decoration: BoxDecoration(
          color: message.isOwn ? AppColors.bubbleOwn : AppColors.bubbleOther,
          borderRadius: BorderRadius.only(
            topLeft: const Radius.circular(16),
            topRight: const Radius.circular(16),
            bottomLeft: Radius.circular(message.isOwn ? 16 : 4),
            bottomRight: Radius.circular(message.isOwn ? 4 : 16),
          ),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.end,
          children: [
            Text(
              message.text,
              style: const TextStyle(
                color: AppColors.textPrimary,
                fontSize: 14,
                height: 1.4,
              ),
            ),
            const SizedBox(height: 4),
            Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                if (message.isOwn && message.isRead)
                  const Padding(
                    padding: EdgeInsets.only(right: 4),
                    child: Icon(
                      Icons.done_all,
                      size: 14,
                      color: AppColors.primaryLight,
                    ),
                  ),
                Text(
                  message.time,
                  style: TextStyle(
                    fontSize: 11,
                    color: AppColors.textPrimary.withValues(alpha: 0.5),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
