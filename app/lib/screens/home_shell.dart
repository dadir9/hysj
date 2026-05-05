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

  Widget _buildScreen(int index) {
    switch (index) {
      case 0: return const ChatListScreen();
      case 1: return const CallHistoryScreen();
      case 2: return const VpnScreen();
      case 3: return const ProfileScreen();
      default: return const ChatListScreen();
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: _buildScreen(_currentIndex),
      bottomNavigationBar: HysjBottomNav(
        currentIndex: _currentIndex,
        isDark: _currentIndex == 2,
        onTap: (i) => setState(() => _currentIndex = i),
      ),
    );
  }
}
