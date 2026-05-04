import 'package:flutter/material.dart';
import '../widgets/bottom_nav.dart';
import 'chats/chat_list_screen.dart';
import 'calls/call_history_screen.dart';
import 'settings/vpn_screen.dart';
import 'settings/profile_screen.dart';

class HomeShell extends StatefulWidget {
  const HomeShell({super.key});

  @override
  State<HomeShell> createState() => _HomeShellState();
}

class _HomeShellState extends State<HomeShell> {
  int _currentIndex = 0;

  final _screens = const [
    ChatListScreen(),
    CallHistoryScreen(),
    VpnScreen(),
    ProfileScreen(),
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: IndexedStack(
        index: _currentIndex,
        children: _screens,
      ),
      bottomNavigationBar: HysjBottomNav(
        currentIndex: _currentIndex,
        isDark: _currentIndex == 2, // VPN screen is dark
        onTap: (i) => setState(() => _currentIndex = i),
      ),
    );
  }
}
