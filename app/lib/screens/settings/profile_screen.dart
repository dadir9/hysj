import 'package:flutter/material.dart';
import '../../theme/hysj_theme.dart';
import '../../widgets/hysj_icon_button.dart';
import '../../widgets/menu_row.dart';
import '../../widgets/pill_chip.dart';
import '../../main.dart' show authService, chatService;
import '../auth/login_screen.dart';

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key});

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  String _username = '';

  @override
  void initState() {
    super.initState();
    _loadProfile();
  }

  Future<void> _loadProfile() async {
    final uname = await authService.currentUsername ?? 'user';
    if (mounted) setState(() => _username = uname);
  }

  Future<void> _logout() async {
    await chatService.logout();
    await authService.logout();
    if (!mounted) return;
    Navigator.of(context).pushAndRemoveUntil(
      MaterialPageRoute(builder: (_) => const LoginScreen()),
      (route) => false,
    );
  }

  @override
  Widget build(BuildContext context) {
    final initial = _username.isNotEmpty ? _username[0].toLowerCase() : '?';
    final contactCount = chatService.contacts.length;

    return Scaffold(
      backgroundColor: HysjColors.paper,
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const SizedBox(height: 16),

              // Topbar
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('You', style: HysjTypo.displaySerif(size: 30)),
                        const SizedBox(height: 4),
                        Text('Account \u00B7 privacy', style: HysjTypo.mono(size: 11, color: HysjColors.gray3)),
                      ],
                    ),
                  ),
                  HysjIconButton(icon: Icons.settings_outlined, onTap: () {}),
                ],
              ),
              const SizedBox(height: 24),

              // Identity card
              Container(
                width: double.infinity,
                padding: const EdgeInsets.symmetric(horizontal: 22, vertical: 18),
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: HysjColors.gray1),
                ),
                child: Column(
                  children: [
                    Container(
                      width: 96, height: 96,
                      decoration: const BoxDecoration(color: HysjColors.cobalt, shape: BoxShape.circle),
                      alignment: Alignment.center,
                      child: Text(initial, style: HysjTypo.displaySerif(size: 40, color: Colors.white)),
                    ),
                    const SizedBox(height: 14),
                    Text('@$_username', style: HysjTypo.mono(size: 18, weight: FontWeight.w500, color: HysjColors.ink)),
                    const SizedBox(height: 14),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        PillChip(
                          text: 'online',
                          variant: PillVariant.good,
                          leading: Container(width: 6, height: 6, decoration: const BoxDecoration(color: Colors.white, shape: BoxShape.circle)),
                        ),
                        const SizedBox(width: 8),
                        Text('$contactCount contacts', style: HysjTypo.mono(size: 11, color: HysjColors.gray3)),
                      ],
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 28),

              // Account section
              Text('ACCOUNT', style: HysjTypo.label(size: 11)),
              const SizedBox(height: 12),
              Container(
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: HysjColors.gray1),
                ),
                clipBehavior: Clip.antiAlias,
                child: Column(
                  children: [
                    MenuRow(icon: Icons.edit_outlined, label: 'Edit profile', onTap: () {}),
                    const Divider(height: 1, indent: 18, endIndent: 18, color: HysjColors.gray1),
                    MenuRow(icon: Icons.phone_outlined, label: 'Phone', value: 'hidden', onTap: () {}),
                    const Divider(height: 1, indent: 18, endIndent: 18, color: HysjColors.gray1),
                    MenuRow(icon: Icons.lock_outline_rounded, label: 'Privacy & blocks', value: 'strict', onTap: () {}),
                    const Divider(height: 1, indent: 18, endIndent: 18, color: HysjColors.gray1),
                    MenuRow(icon: Icons.notifications_none_rounded, label: 'Notifications', value: 'all', onTap: () {}),
                  ],
                ),
              ),
              const SizedBox(height: 36),

              // Log out
              Center(
                child: GestureDetector(
                  behavior: HitTestBehavior.opaque,
                  onTap: _logout,
                  child: Padding(
                    padding: const EdgeInsets.all(12),
                    child: Text('LOG OUT', style: HysjTypo.mono(size: 13, color: HysjColors.bad, weight: FontWeight.w500, letterSpacing: 0.08)),
                  ),
                ),
              ),
              const SizedBox(height: 100),
            ],
          ),
        ),
      ),
    );
  }
}
