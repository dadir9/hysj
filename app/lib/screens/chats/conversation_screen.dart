import 'dart:async';
import 'package:flutter/material.dart';
import '../../theme/hysj_theme.dart';
import '../../widgets/hysj_avatar.dart';
import '../../widgets/hysj_icon_button.dart';
import '../../main.dart' show chatService, apiClient;
import '../../services/chat_service.dart';

class ConversationScreen extends StatefulWidget {
  final Contact contact;
  const ConversationScreen({super.key, required this.contact});

  @override
  State<ConversationScreen> createState() => _ConversationScreenState();
}

class _ConversationScreenState extends State<ConversationScreen> {
  final _msgController = TextEditingController();
  final _scrollController = ScrollController();
  StreamSubscription? _sub;
  String? _recipientDeviceId;

  List<ChatMessage> get _messages => chatService.getMessages(widget.contact.userId);

  @override
  void initState() {
    super.initState();
    _loadRecipientDevice();
    _sub = chatService.incomingMessages.listen((_) {
      if (mounted) {
        setState(() {});
        _scrollToBottom();
      }
    });
  }

  Future<void> _loadRecipientDevice() async {
    try {
      final devices = await apiClient.getUserDevices(widget.contact.userId);
      if (devices.isNotEmpty && mounted) {
        setState(() {
          _recipientDeviceId = devices.first['device_id'] as String?;
        });
      }
    } catch (_) {}
  }

  @override
  void dispose() {
    _sub?.cancel();
    _msgController.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  void _sendMessage() async {
    final text = _msgController.text.trim();
    if (text.isEmpty || _recipientDeviceId == null) return;

    _msgController.clear();
    await chatService.sendMessage(widget.contact.userId, _recipientDeviceId!, text);
    if (mounted) setState(() {});
    _scrollToBottom();
  }

  void _scrollToBottom() {
    Future.delayed(const Duration(milliseconds: 100), () {
      if (_scrollController.hasClients) {
        _scrollController.animateTo(
          _scrollController.position.maxScrollExtent,
          duration: const Duration(milliseconds: 200),
          curve: Curves.easeOut,
        );
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final initials = widget.contact.username.isNotEmpty
        ? widget.contact.username[0].toUpperCase()
        : '?';
    final colorIndex = widget.contact.username.hashCode.abs() % 6;

    return Theme(
      data: HysjTheme.light,
      child: Scaffold(
        backgroundColor: HysjColors.paper,
        body: SafeArea(
          child: Column(
            children: [
              // Header
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                decoration: const BoxDecoration(
                  color: HysjColors.paper,
                  border: Border(bottom: BorderSide(color: HysjColors.gray1, width: 0.5)),
                ),
                child: Row(
                  children: [
                    GestureDetector(
                      behavior: HitTestBehavior.opaque,
                      onTap: () => Navigator.of(context).pop(),
                      child: const SizedBox(
                        width: 40, height: 40,
                        child: Icon(Icons.arrow_back_rounded, color: HysjColors.ink),
                      ),
                    ),
                    const SizedBox(width: 8),
                    HysjAvatar(
                      initials: initials,
                      size: AvatarSize.md,
                      color: AvatarColor.values[colorIndex],
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            widget.contact.name,
                            style: HysjTypo.body(size: 15, weight: FontWeight.w600),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            '@${widget.contact.username}',
                            style: HysjTypo.mono(size: 10, color: HysjColors.gray3),
                          ),
                        ],
                      ),
                    ),
                    HysjIconButton(icon: Icons.phone_outlined, onTap: () {}),
                    const SizedBox(width: 8),
                    HysjIconButton(icon: Icons.videocam_outlined, onTap: () {}),
                  ],
                ),
              ),

              // Encryption badge
              Container(
                padding: const EdgeInsets.symmetric(vertical: 12),
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 5),
                  decoration: BoxDecoration(
                    color: HysjColors.paper2,
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Text(
                    '\u{1F512} END-TO-END ENCRYPTED',
                    style: HysjTypo.label(size: 9, color: HysjColors.gray3),
                  ),
                ),
              ),

              // Messages
              Expanded(
                child: _messages.isEmpty
                    ? Center(
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(Icons.lock_outline_rounded, size: 32, color: HysjColors.gray2),
                            const SizedBox(height: 12),
                            Text(
                              'Messages are end-to-end encrypted',
                              style: HysjTypo.body(size: 13, color: HysjColors.gray3),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              'Say hi to @${widget.contact.username}',
                              style: HysjTypo.mono(size: 11, color: HysjColors.cobalt),
                            ),
                          ],
                        ),
                      )
                    : ListView.builder(
                        controller: _scrollController,
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                        itemCount: _messages.length,
                        itemBuilder: (context, index) {
                          final msg = _messages[index];
                          return Padding(
                            padding: const EdgeInsets.only(bottom: 6),
                            child: _Bubble(
                              text: msg.text,
                              isMe: msg.isMe,
                              time: _formatTime(msg.timestamp),
                            ),
                          );
                        },
                      ),
              ),

              // Input bar
              Container(
                padding: const EdgeInsets.fromLTRB(12, 8, 12, 8),
                decoration: const BoxDecoration(
                  color: HysjColors.paper,
                  border: Border(top: BorderSide(color: HysjColors.gray1, width: 0.5)),
                ),
                child: SafeArea(
                  top: false,
                  child: Row(
                    children: [
                      Expanded(
                        child: Container(
                          height: 44,
                          decoration: BoxDecoration(
                            color: HysjColors.paper2,
                            borderRadius: BorderRadius.circular(22),
                          ),
                          child: TextField(
                            controller: _msgController,
                            onSubmitted: (_) => _sendMessage(),
                            onChanged: (_) => setState(() {}),
                            style: HysjTypo.body(size: 15, color: HysjColors.ink),
                            decoration: InputDecoration(
                              hintText: _recipientDeviceId != null
                                  ? 'Message @${widget.contact.username}...'
                                  : 'Connecting...',
                              hintStyle: HysjTypo.body(size: 15, color: HysjColors.gray2),
                              border: InputBorder.none,
                              contentPadding: const EdgeInsets.symmetric(horizontal: 16),
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),
                      GestureDetector(
                        behavior: HitTestBehavior.opaque,
                        onTap: _sendMessage,
                        child: Container(
                          width: 44,
                          height: 44,
                          decoration: BoxDecoration(
                            color: _msgController.text.trim().isNotEmpty
                                ? HysjColors.cobalt
                                : HysjColors.gray2,
                            shape: BoxShape.circle,
                          ),
                          child: Icon(
                            _msgController.text.trim().isNotEmpty
                                ? Icons.send_rounded
                                : Icons.mic_rounded,
                            color: Colors.white,
                            size: 20,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  String _formatTime(DateTime dt) {
    final h = dt.hour.toString().padLeft(2, '0');
    final m = dt.minute.toString().padLeft(2, '0');
    return '$h:$m';
  }
}

class _Bubble extends StatelessWidget {
  final String text;
  final bool isMe;
  final String time;

  const _Bubble({required this.text, required this.isMe, required this.time});

  @override
  Widget build(BuildContext context) {
    return Align(
      alignment: isMe ? Alignment.centerRight : Alignment.centerLeft,
      child: Container(
        constraints: BoxConstraints(
          maxWidth: MediaQuery.of(context).size.width * 0.76,
        ),
        padding: const EdgeInsets.fromLTRB(14, 10, 14, 10),
        decoration: BoxDecoration(
          color: isMe ? HysjColors.ink : HysjColors.paper2,
          borderRadius: BorderRadius.only(
            topLeft: const Radius.circular(22),
            topRight: const Radius.circular(22),
            bottomLeft: Radius.circular(isMe ? 22 : 8),
            bottomRight: Radius.circular(isMe ? 8 : 22),
          ),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.end,
          children: [
            Text(
              text,
              style: HysjTypo.body(
                size: 15,
                color: isMe ? Colors.white : HysjColors.ink,
                height: 1.4,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              time,
              style: HysjTypo.mono(
                size: 9,
                color: isMe ? Colors.white54 : HysjColors.gray3,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
