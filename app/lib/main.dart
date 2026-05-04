import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'theme/hysj_theme.dart';
import 'screens/auth/login_screen.dart';
import 'screens/home_shell.dart';
import 'services/auth_service.dart';
import 'services/api_client.dart';
import 'services/ws_client.dart';
import 'services/chat_service.dart';

final authService = AuthService();
final apiClient = ApiClient(authService: authService);
final wsClient = WsClient(authService: authService);
final chatService = ChatService(api: apiClient, auth: authService, ws: wsClient);

void main() {
  SystemChrome.setSystemUIOverlayStyle(
    const SystemUiOverlayStyle(
      statusBarColor: Colors.transparent,
      statusBarIconBrightness: Brightness.dark,
    ),
  );
  runApp(const HysjApp());
}

class HysjApp extends StatefulWidget {
  const HysjApp({super.key});

  @override
  State<HysjApp> createState() => _HysjAppState();
}

class _HysjAppState extends State<HysjApp> {
  bool _checking = true;
  bool _loggedIn = false;

  @override
  void initState() {
    super.initState();
    _checkAuth();
  }

  Future<void> _checkAuth() async {
    var loggedIn = await authService.isLoggedIn;

    // Initialize chat service (contacts + WebSocket)
    if (loggedIn) {
      try { await chatService.init(); } catch (_) {}
    }

    setState(() {
      _loggedIn = loggedIn;
      _checking = false;
    });
  }

  @override
  Widget build(BuildContext context) {
    final Widget home;
    if (_checking) {
      home = Scaffold(
        backgroundColor: HysjColors.paper,
        body: const Center(child: CircularProgressIndicator(color: HysjColors.cobalt)),
      );
    } else if (_loggedIn) {
      home = const HomeShell();
    } else {
      home = const LoginScreen();
    }

    return MaterialApp(
      title: 'Hysj',
      debugShowCheckedModeBanner: false,
      theme: HysjTheme.light,
      darkTheme: HysjTheme.dark,
      home: kIsWeb ? _MobileFrame(child: home) : home,
    );
  }
}

/// Wraps the app in a phone-sized frame when running on web.
class _MobileFrame extends StatelessWidget {
  final Widget child;
  const _MobileFrame({required this.child});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF1A1A1A),
      body: Center(
        child: Container(
          width: 393,
          height: 852,
          decoration: BoxDecoration(
            color: HysjColors.paper,
            borderRadius: BorderRadius.circular(44),
            border: Border.all(color: HysjColors.gray1, width: 2),
            boxShadow: [
              BoxShadow(
                color: const Color(0xFF0F0F14).withOpacity(0.30),
                blurRadius: 60,
                offset: const Offset(0, 30),
                spreadRadius: -20,
              ),
              BoxShadow(
                color: const Color(0xFF0F0F14).withOpacity(0.18),
                blurRadius: 24,
                offset: const Offset(0, 12),
                spreadRadius: -8,
              ),
            ],
          ),
          clipBehavior: Clip.antiAlias,
          child: MediaQuery(
            data: const MediaQueryData(
              size: Size(393, 852),
              padding: EdgeInsets.only(top: 50),
            ),
            child: child,
          ),
        ),
      ),
    );
  }
}
