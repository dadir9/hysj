import 'package:flutter/material.dart';
import '../../theme/hysj_theme.dart';
import '../../widgets/hysj_avatar.dart';
import '../../widgets/hysj_icon_button.dart';
import '../../main.dart' show chatService;
import '../../services/chat_service.dart';
import 'conversation_screen.dart';
import '../settings/new_chat_sheet.dart';

class ChatListScreen extends StatefulWidget {
  const ChatListScreen({super.key});

  @override
  State<ChatListScreen> createState() => _ChatListScreenState();
}

class _ChatListScreenState extends State<ChatListScreen> {
  List<Contact> _contacts = [];

  @override
  void initState() {
    super.initState();
    _contacts = chatService.contacts;
    chatService.contactsStream.listen((contacts) {
      if (mounted) setState(() => _contacts = contacts);
    });
    // Also refresh on incoming messages to update previews
    chatService.incomingMessages.listen((_) {
      if (mounted) setState(() {});
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: HysjColors.paper,
      body: SafeArea(
        bottom: false,
        child: CustomScrollView(
          slivers: [
            // Header
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(24, 16, 24, 0),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('Chats', style: HysjTypo.displaySerif(size: 30)),
                          const SizedBox(height: 4),
                          Text(
                            '${_contacts.length} contacts \u00B7 all encrypted',
                            style: HysjTypo.mono(size: 11, color: HysjColors.gray3),
                          ),
                        ],
                      ),
                    ),
                    HysjIconButton(icon: Icons.search_rounded, onTap: () {}),
                    const SizedBox(width: 8),
                    HysjIconButton(
                      icon: Icons.add_rounded,
                      variant: IconButtonVariant.ink,
                      onTap: () {
                        showModalBottomSheet(
                          context: context,
                          isScrollControlled: true,
                          backgroundColor: Colors.transparent,
                          builder: (_) => const NewChatSheet(),
                        );
                      },
                    ),
                  ],
                ),
              ),
            ),

            // Section header
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(24, 24, 24, 8),
                child: Row(
                  children: [
                    Text('ALL CHATS', style: HysjTypo.label(size: 11)),
                    const Spacer(),
                    Text('${_contacts.length}', style: HysjTypo.displaySerif(size: 14, color: HysjColors.gray3)),
                  ],
                ),
              ),
            ),

            // Contact list
            if (_contacts.isEmpty)
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.all(48),
                  child: Column(
                    children: [
                      Icon(Icons.chat_bubble_outline_rounded, size: 48, color: HysjColors.gray2),
                      const SizedBox(height: 16),
                      Text('No contacts yet', style: HysjTypo.body(size: 15, color: HysjColors.gray3)),
                      const SizedBox(height: 8),
                      Text(
                        'Tap + to start a new chat',
                        style: HysjTypo.mono(size: 11, color: HysjColors.gray3),
                      ),
                    ],
                  ),
                ),
              )
            else
              SliverList(
                delegate: SliverChildBuilderDelegate(
                  (context, index) {
                    final contact = _contacts[index];
                    final lastMsg = chatService.lastMessages[contact.userId];
                    final initials = contact.username.isNotEmpty
                        ? contact.username[0].toUpperCase()
                        : '?';
                    final colorIndex = contact.username.hashCode.abs() % 6;

                    return _ChatTile(
                      initials: initials,
                      name: contact.name,
                      handle: '@${contact.username}',
                      message: lastMsg ?? 'Tap to start chatting',
                      hasMessage: lastMsg != null,
                      color: AvatarColor.values[colorIndex],
                      onTap: () async {
                        await Navigator.of(context).push(
                          MaterialPageRoute(
                            builder: (_) => ConversationScreen(
                              contact: contact,
                            ),
                          ),
                        );
                        if (mounted) setState(() {});
                      },
                    );
                  },
                  childCount: _contacts.length,
                ),
              ),

            const SliverToBoxAdapter(child: SizedBox(height: 100)),
          ],
        ),
      ),
    );
  }
}

class _ChatTile extends StatelessWidget {
  final String initials;
  final String name;
  final String handle;
  final String message;
  final bool hasMessage;
  final AvatarColor color;
  final VoidCallback? onTap;

  const _ChatTile({
    required this.initials,
    required this.name,
    required this.handle,
    required this.message,
    this.hasMessage = false,
    required this.color,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      behavior: HitTestBehavior.opaque,
      onTap: onTap,
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 13),
        child: Row(
          children: [
            HysjAvatar(initials: initials, size: AvatarSize.lg, color: color),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Text(name, style: HysjTypo.body(size: 15, weight: FontWeight.w600)),
                      const SizedBox(width: 6),
                      Expanded(
                        child: Text(
                          handle,
                          style: HysjTypo.mono(size: 11, color: HysjColors.gray3),
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Text(
                    message,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: HysjTypo.body(
                      size: 14,
                      color: hasMessage ? HysjColors.ink2 : HysjColors.gray3,
                    ),
                  ),
                ],
              ),
            ),
            const Icon(Icons.chevron_right_rounded, size: 18, color: HysjColors.gray2),
          ],
        ),
      ),
    );
  }
}
