import 'package:flutter/material.dart';
import '../../theme/hysj_theme.dart';
import '../../widgets/hysj_avatar.dart';
import '../../widgets/hysj_icon_button.dart';

class NewChatSheet extends StatefulWidget {
  const NewChatSheet({super.key});

  /// Show this sheet as a modal bottom sheet.
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

  // Demo data
  static const _matches = [
    (handle: '@jamal_m', name: 'Jamal', subtitle: 'wandering shutter', color: AvatarColor.a2),
    (handle: '@lina_q', name: 'Lina', subtitle: 'late-night thinker', color: AvatarColor.a4),
    (handle: '@omar_dev', name: 'Omar', subtitle: 'building in silence', color: AvatarColor.a5),
  ];

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final bottom = MediaQuery.of(context).viewInsets.bottom;

    return Container(
      constraints: BoxConstraints(
        maxHeight: MediaQuery.of(context).size.height * 0.85,
      ),
      decoration: const BoxDecoration(
        color: HysjColors.paper,
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
        border: Border(
          top: BorderSide(color: HysjColors.gray1, width: 1),
        ),
      ),
      child: Padding(
        padding: EdgeInsets.only(bottom: bottom),
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const SizedBox(height: 12),

              // ── Grab handle ──
              Center(
                child: Container(
                  width: 40,
                  height: 4,
                  decoration: BoxDecoration(
                    color: HysjColors.gray2,
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),
              const SizedBox(height: 20),

              // ── Title ──
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 24),
                child: Text(
                  'Start a new chat',
                  style: HysjTypo.displaySerif(size: 26),
                ),
              ),
              const SizedBox(height: 6),

              // ── Caption ──
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 24),
                child: Text(
                  'NO PHONE NUMBERS \u2014 HANDLES ONLY',
                  style: HysjTypo.mono(
                    size: 10,
                    color: HysjColors.gray3,
                    weight: FontWeight.w500,
                  ),
                ),
              ),
              const SizedBox(height: 18),

              // ── Search input ──
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 24),
                child: Container(
                  height: 50,
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(
                      color: HysjColors.cobalt,
                      width: 1.5,
                    ),
                  ),
                  padding: const EdgeInsets.symmetric(horizontal: 14),
                  child: Row(
                    children: [
                      Text(
                        '@',
                        style: HysjTypo.mono(
                          size: 16,
                          color: HysjColors.cobalt,
                          weight: FontWeight.w600,
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: TextField(
                          controller: _controller,
                          style: HysjTypo.mono(
                            size: 15,
                            color: HysjColors.ink,
                          ),
                          decoration: InputDecoration(
                            hintText: 'Search by handle...',
                            hintStyle: HysjTypo.mono(
                              size: 15,
                              color: HysjColors.gray2,
                            ),
                            border: InputBorder.none,
                            enabledBorder: InputBorder.none,
                            focusedBorder: InputBorder.none,
                            isDense: true,
                            contentPadding: EdgeInsets.zero,
                          ),
                          onChanged: (_) => setState(() {}),
                        ),
                      ),
                      if (_controller.text.isNotEmpty)
                        GestureDetector(
                          onTap: () {
                            _controller.clear();
                            setState(() {});
                          },
                          child: const Icon(
                            Icons.close_rounded,
                            size: 18,
                            color: HysjColors.gray3,
                          ),
                        ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 22),

              // ── Matches label ──
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 24),
                child: Text(
                  'MATCHES',
                  style: HysjTypo.label(size: 11),
                ),
              ),
              const SizedBox(height: 10),

              // ── Match tiles ──
              for (var i = 0; i < _matches.length; i++) ...[
                _MatchTile(
                  handle: _matches[i].handle,
                  name: _matches[i].name,
                  subtitle: _matches[i].subtitle,
                  color: _matches[i].color,
                  showAddButton: i == 0,
                ),
              ],
              const SizedBox(height: 22),

              // ── Quick actions label ──
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 24),
                child: Text(
                  'QUICK ACTIONS',
                  style: HysjTypo.label(size: 11),
                ),
              ),
              const SizedBox(height: 12),

              // ── Quick actions grid ──
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 24),
                child: Row(
                  children: [
                    _QuickAction(
                      icon: Icons.group_add_outlined,
                      label: 'New group',
                    ),
                    const SizedBox(width: 8),
                    _QuickAction(
                      icon: Icons.qr_code_scanner_rounded,
                      label: 'Scan QR',
                    ),
                    const SizedBox(width: 8),
                    _QuickAction(
                      icon: Icons.share_outlined,
                      label: 'Share me',
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 32),
            ],
          ),
        ),
      ),
    );
  }
}

class _MatchTile extends StatelessWidget {
  final String handle;
  final String name;
  final String subtitle;
  final AvatarColor color;
  final bool showAddButton;

  const _MatchTile({
    required this.handle,
    required this.name,
    required this.subtitle,
    required this.color,
    this.showAddButton = false,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 8),
      child: Row(
        children: [
          HysjAvatar(
            initials: name[0].toLowerCase(),
            size: AvatarSize.lg,
            color: color,
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  handle,
                  style: HysjTypo.mono(
                    size: 14,
                    color: HysjColors.ink,
                    weight: FontWeight.w500,
                  ),
                ),
                const SizedBox(height: 2),
                Text.rich(
                  TextSpan(
                    children: [
                      TextSpan(
                        text: '$name \u00B7 ',
                        style: HysjTypo.displaySerif(
                          size: 13,
                          color: HysjColors.gray3,
                          height: 1.3,
                        ),
                      ),
                      TextSpan(
                        text: subtitle,
                        style: HysjTypo.displaySerif(
                          size: 13,
                          color: HysjColors.gray3,
                          height: 1.3,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          if (showAddButton)
            const HysjIconButton(
              icon: Icons.add_rounded,
              variant: IconButtonVariant.cobalt,
              size: 36,
            ),
        ],
      ),
    );
  }
}

class _QuickAction extends StatelessWidget {
  final IconData icon;
  final String label;

  const _QuickAction({required this.icon, required this.label});

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 16),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: HysjColors.gray1),
        ),
        child: Column(
          children: [
            Icon(icon, size: 22, color: HysjColors.ink2),
            const SizedBox(height: 6),
            Text(
              label,
              style: HysjTypo.mono(
                size: 11,
                color: HysjColors.ink2,
                weight: FontWeight.w500,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
