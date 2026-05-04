import 'package:flutter/material.dart';
import '../../theme/hysj_theme.dart';
import '../../widgets/hysj_avatar.dart';
import 'incoming_call_screen.dart';

class CallHistoryScreen extends StatefulWidget {
  const CallHistoryScreen({super.key});

  @override
  State<CallHistoryScreen> createState() => _CallHistoryScreenState();
}

class _CallHistoryScreenState extends State<CallHistoryScreen> {
  int _filter = 0; // 0=All, 1=Missed, 2=Out

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: HysjColors.paper,
      body: SafeArea(
        bottom: false,
        child: CustomScrollView(
          slivers: [
            // ── Header ──
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
                          Text('Calls', style: HysjTypo.displaySerif(size: 30)),
                          const SizedBox(height: 4),
                          Text(
                            '7 this week \u00B7 3 missed',
                            style: HysjTypo.mono(size: 11, color: HysjColors.gray3),
                          ),
                        ],
                      ),
                    ),
                    GestureDetector(
                      onTap: () {},
                      child: Container(
                        width: 40,
                        height: 40,
                        decoration: BoxDecoration(
                          color: HysjColors.ink,
                          shape: BoxShape.circle,
                        ),
                        child: const Icon(Icons.phone_rounded, color: Colors.white, size: 18),
                      ),
                    ),
                  ],
                ),
              ),
            ),

            // ── Filter tabs ──
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(24, 20, 24, 16),
                child: Row(
                  children: [
                    _FilterChip(
                      label: 'All',
                      active: _filter == 0,
                      onTap: () => setState(() => _filter = 0),
                    ),
                    const SizedBox(width: 8),
                    _FilterChip(
                      label: 'Missed',
                      badge: '3',
                      active: _filter == 1,
                      onTap: () => setState(() => _filter = 1),
                    ),
                    const SizedBox(width: 8),
                    _FilterChip(
                      label: 'Out',
                      active: _filter == 2,
                      onTap: () => setState(() => _filter = 2),
                    ),
                  ],
                ),
              ),
            ),

            // ── Today ──
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(24, 8, 24, 8),
                child: Text('TODAY', style: HysjTypo.label(size: 11)),
              ),
            ),
            SliverList(
              delegate: SliverChildListDelegate([
                _CallTile(
                  initials: 'J',
                  name: 'Jamal',
                  handle: '@jamal_m',
                  time: '2:34 PM',
                  status: CallStatus.missed,
                  color: AvatarColor.a2,
                  onTap: () {
                    Navigator.of(context).push(
                      MaterialPageRoute(
                        builder: (_) => const IncomingCallScreen(),
                      ),
                    );
                  },
                ),
                _CallTile(
                  initials: 'S',
                  name: 'Sara',
                  handle: '@sara_k',
                  time: '11:20 AM',
                  duration: '4:23',
                  status: CallStatus.completed,
                  color: AvatarColor.a3,
                ),
              ]),
            ),

            // ── Yesterday ──
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(24, 20, 24, 8),
                child: Text('YESTERDAY', style: HysjTypo.label(size: 11)),
              ),
            ),
            SliverList(
              delegate: SliverChildListDelegate([
                _CallTile(
                  initials: 'O',
                  name: 'Omar',
                  handle: '@omar_dev',
                  time: '8:15 PM',
                  duration: '12:05',
                  status: CallStatus.completed,
                  color: AvatarColor.a5,
                  isOutgoing: true,
                ),
                _CallTile(
                  initials: 'L',
                  name: 'Lina',
                  handle: '@lina.h',
                  time: '3:45 PM',
                  status: CallStatus.missed,
                  color: AvatarColor.a6,
                ),
              ]),
            ),
            const SliverToBoxAdapter(child: SizedBox(height: 16)),
          ],
        ),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Filter chip
// ---------------------------------------------------------------------------

class _FilterChip extends StatelessWidget {
  final String label;
  final String? badge;
  final bool active;
  final VoidCallback onTap;

  const _FilterChip({
    required this.label,
    this.badge,
    required this.active,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
        decoration: BoxDecoration(
          color: active ? HysjColors.ink : Colors.transparent,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: active ? HysjColors.ink : HysjColors.gray1,
          ),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              label,
              style: TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w600,
                color: active ? Colors.white : HysjColors.ink,
              ),
            ),
            if (badge != null) ...[
              const SizedBox(width: 6),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
                decoration: BoxDecoration(
                  color: active ? HysjColors.bad : HysjColors.bad.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(6),
                ),
                child: Text(
                  badge!,
                  style: TextStyle(
                    fontSize: 10,
                    fontWeight: FontWeight.w700,
                    color: active ? Colors.white : HysjColors.bad,
                  ),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Call tile
// ---------------------------------------------------------------------------

enum CallStatus { missed, completed }

class _CallTile extends StatelessWidget {
  final String initials;
  final String name;
  final String handle;
  final String time;
  final String? duration;
  final CallStatus status;
  final AvatarColor color;
  final bool isOutgoing;
  final VoidCallback? onTap;

  const _CallTile({
    required this.initials,
    required this.name,
    required this.handle,
    required this.time,
    this.duration,
    required this.status,
    required this.color,
    this.isOutgoing = false,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final isMissed = status == CallStatus.missed;

    return GestureDetector(
      behavior: HitTestBehavior.opaque,
      onTap: onTap,
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
        child: Row(
          children: [
            HysjAvatar(initials: initials, color: color),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    name,
                    style: TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.w600,
                      color: isMissed ? HysjColors.bad : HysjColors.ink,
                    ),
                  ),
                  const SizedBox(height: 3),
                  Row(
                    children: [
                      Icon(
                        isOutgoing
                            ? Icons.call_made_rounded
                            : Icons.call_received_rounded,
                        size: 14,
                        color: isMissed ? HysjColors.bad : HysjColors.good,
                      ),
                      const SizedBox(width: 4),
                      Text(
                        isMissed
                            ? 'Missed'
                            : duration != null
                                ? duration!
                                : 'Completed',
                        style: TextStyle(
                          fontSize: 13,
                          color: isMissed ? HysjColors.bad : HysjColors.gray3,
                        ),
                      ),
                    ],
                  ),
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
                    color: HysjColors.gray3,
                  ),
                ),
                const SizedBox(height: 4),
                Icon(
                  Icons.phone_outlined,
                  size: 18,
                  color: HysjColors.cobalt,
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
