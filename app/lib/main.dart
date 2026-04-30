import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'theme/app_theme.dart';
import 'screens/login_screen.dart';
import 'screens/home_shell.dart';
import 'services/auth_service.dart';
import 'services/api_client.dart';

final authService = AuthService();
final apiClient = ApiClient(authService: authService);

void main() {
  SystemChrome.setSystemUIOverlayStyle(
    const SystemUiOverlayStyle(
      statusBarColor: Colors.transparent,
      statusBarIconBrightness: Brightness.light,
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
    final loggedIn = await authService.isLoggedIn;
    setState(() {
      _loggedIn = loggedIn;
      _checking = false;
    });
  }

  @override
  Widget build(BuildContext context) {
    final Widget home;
    if (_checking) {
      home = const Scaffold(body: Center(child: CircularProgressIndicator()));
    } else if (_loggedIn) {
      home = const HomeShell();
    } else {
      home = const LoginScreen();
    }

    return MaterialApp(
      title: 'Hysj',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.dark,
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
      backgroundColor: const Color(0xFF000000),
      body: Center(
        child: Container(
          width: 393,
          height: 852,
          decoration: BoxDecoration(
            color: AppColors.background,
            borderRadius: BorderRadius.circular(40),
            border: Border.all(color: Colors.white12, width: 2),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.5),
                blurRadius: 30,
                spreadRadius: 5,
              ),
            ],
          ),
          clipBehavior: Clip.antiAlias,
          child: MediaQuery(
            data: const MediaQueryData(
              size: Size(393, 852),
              padding: EdgeInsets.only(top: 54),
            ),
            child: child,
          ),
        ),
      ),
    );
  }
}
