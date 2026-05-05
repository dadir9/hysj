import 'dart:async';
import 'package:flutter/material.dart';
import '../../theme/hysj_theme.dart';
import '../../widgets/hysj_avatar.dart';
import '../../widgets/hysj_icon_button.dart';
import '../../main.dart' show apiClient, chatService;
import '../chats/conversation_screen.dart';

class NewChatSheet extends StatefulWidget {
  const NewChatSheet({super.key});

  static Future<void> show(BuildContext context) {
    return showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => const NewChatSheet(),
    );
  }

  @override
  State<NewChatSheet> createState() => _NewChatSheetState();
}

class _NewChatSheetState extends State<NewChatSheet> {
  final _controller = TextEditingController();
  Timer? _debounce;
  List<_SearchResult> _results = [];
  bool _searching = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    // Show existing contacts initially
    _showContacts();
  }

  @override
  void dispose() {
    _controller.dispose();
    _debounce?.cancel();
    super.dispose();
  }

  void _showContacts() {
    _results = chatService.contacts.map((c) => _SearchResult(
      userId: c.userId,
      username: c.username,
      displayName: c.displayName,
      isContact: true,
    )).toList();
  }

  void _onSearchChanged(String query) {
    _debounce?.cancel();
    if (query.isEmpty) {
      setState(() {
        _showContacts();
        _error = null;
      });
      return;
    }
    _debounce = Timer(const Duration(milliseconds: 300), () => _search(query));
  }

  Future<void> _search(String query) async {
    setState(() => _searching = true);
    try {
      // Check if username exists
      final available = await apiClient.checkUsername(query);
      if (!mounted) return;

      if (!available) {
        // Username exists — it's a real user
        // Find in contacts or show as new
        final isContact = chatService.contacts.any((c) => c.username == query);
        setState(() {
          _results = [
            _SearchResult(
              userId: _findUserId(query),
              username: query,
              isContact: isContact,
            ),
          ];
          _error = null;
        });
      } else {
        // Username doesn't exist
        setState(() {
          _results = [];
          _error = 'No user found with @$query';
        });
      }
    } catch (e) {
      setState(() => _error = 'Search failed');
    } finally {
      if (mounted) setState(() => _searching = false);
    }
  }

  String _findUserId(String username) {
    final contact = chatService.contacts.where((c) => c.username == username);
    if (contact.isNotEmpty) return contact.first.userId;
    return ''; // Will be resolved when adding contact
  }

  Future<void> _openChat(_SearchResult result) async {
    // If not a contact, add them first
    if (!result.isContact && result.userId.isNotEmpty) {
      try {
        await apiClient.addContact(result.userId);
        await chatService.refreshContacts();
      } catch (_) {}
    }

    // Find contact object
    final contact = chatService.contacts
        .where((c) => c.username == result.username)
        .firstOrNull;

    if (contact == null) {
      setState(() => _error = 'Could not find user');
      return;
    }

    if (!mounted) return;
    Navigator.of(context).pop(); // Close sheet
    Navigator.of(context).push(
      MaterialPageRoute(builder: (_) => ConversationScreen(contact: contact)),
    );
  }

  @override
  Widget build(BuildContext context) {
    final bottom = MediaQuery.of(context).viewInsets.bottom;

    return Container(
      constraints: BoxConstraints(maxHeight: MediaQuery.of(context).size.height * 0.85),
      decoration: const BoxDecoration(
        color: HysjColors.paper,
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
        border: Border(top: BorderSide(color: HysjColors.gray1, width: 1)),
      ),
      child: Padding(
        padding: EdgeInsets.only(bottom: bottom),
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const SizedBox(height: 12),

              // Grab handle
              Center(
                child: Container(
                  width: 40, height: 4,
                  decoration: BoxDecoration(color: HysjColors.gray2, borderRadius: BorderRadius.circular(2)),
                ),
              ),
              const SizedBox(height: 20),

              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 24),
                child: Text('Start a new chat', style: HysjTypo.displaySerif(size: 26)),
              ),
              const SizedBox(height: 6),

              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 24),
                child: Text(
                  'NO PHONE NUMBERS \u2014 HANDLES ONLY',
                  style: HysjTypo.mono(size: 10, color: HysjColors.gray3, weight: FontWeight.w500),
                ),
              ),
              const SizedBox(height: 18),

              // Search input
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 24),
                child: Container(
                  height: 50,
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(color: HysjColors.cobalt, width: 1.5),
                  ),
                  padding: const EdgeInsets.symmetric(horizontal: 14),
                  child: Row(
                    children: [
                      Text('@', style: HysjTypo.mono(size: 16, color: HysjColors.cobalt, weight: FontWeight.w600)),
                      const SizedBox(width: 8),
                      Expanded(
                        child: TextField(
                          controller: _controller,
                          autofocus: true,
                          style: HysjTypo.mono(size: 15, color: HysjColors.ink),
                          decoration: InputDecoration(
                            hintText: 'Search by handle...',
                            hintStyle: HysjTypo.mono(size: 15, color: HysjColors.gray2),
                            border: InputBorder.none,
                            enabledBorder: InputBorder.none,
                            focusedBorder: InputBorder.none,
                            isDense: true,
                            contentPadding: EdgeInsets.zero,
                          ),
                          onChanged: _onSearchChanged,
                        ),
                      ),
                      if (_searching)
                        const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: HysjColors.cobalt))
                      else if (_controller.text.isNotEmpty)
                        GestureDetector(
                          onTap: () { _controller.clear(); _onSearchChanged(''); },
                          child: const Icon(Icons.close_rounded, size: 18, color: HysjColors.gray3),
                        ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 22),

              if (_error != null) ...[
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 24),
                  child: Text(_error!, style: HysjTypo.body(size: 13, color: HysjColors.gray3)),
                ),
                const SizedBox(height: 12),
              ],

              // Results label
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 24),
                child: Text(
                  _controller.text.isEmpty ? 'YOUR CONTACTS' : 'MATCHES',
                  style: HysjTypo.label(size: 11),
                ),
              ),
              const SizedBox(height: 10),

              // Results
              if (_results.isEmpty && _error == null)
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
                  child: Text('No contacts yet', style: HysjTypo.body(size: 14, color: HysjColors.gray3)),
                )
              else
                for (final result in _results)
                  _MatchTile(
                    result: result,
                    onTap: () => _openChat(result),
                  ),

              const SizedBox(height: 32),
            ],
          ),
        ),
      ),
    );
  }
}

class _SearchResult {
  final String userId;
  final String username;
  final String? displayName;
  final bool isContact;

  _SearchResult({required this.userId, required this.username, this.displayName, this.isContact = false});
}

class _MatchTile extends StatelessWidget {
  final _SearchResult result;
  final VoidCallback onTap;

  const _MatchTile({required this.result, required this.onTap});

  @override
  Widget build(BuildContext context) {
    final colorIndex = result.username.hashCode.abs() % 6;
    final initial = result.username.isNotEmpty ? result.username[0].toUpperCase() : '?';

    return GestureDetector(
      behavior: HitTestBehavior.opaque,
      onTap: onTap,
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 10),
        child: Row(
          children: [
            HysjAvatar(initials: initial, size: AvatarSize.lg, color: AvatarColor.values[colorIndex]),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('@${result.username}', style: HysjTypo.mono(size: 14, color: HysjColors.ink, weight: FontWeight.w500)),
                  if (result.displayName != null) ...[
                    const SizedBox(height: 2),
                    Text(result.displayName!, style: HysjTypo.body(size: 13, color: HysjColors.gray3)),
                  ],
                ],
              ),
            ),
            if (result.isContact)
              Text('CONTACT', style: HysjTypo.label(size: 9, color: HysjColors.good))
            else
              const HysjIconButton(icon: Icons.add_rounded, variant: IconButtonVariant.cobalt, size: 36),
          ],
        ),
      ),
    );
  }
}
