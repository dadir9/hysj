import 'package:flutter/material.dart';

class AppColors {
  // Background
  static const background = Color(0xFF0D0D14);
  static const surface = Color(0xFF1A1A2E);
  static const surfaceLight = Color(0xFF252540);

  // Primary / Accent
  static const primary = Color(0xFF4B6EF5);
  static const primaryLight = Color(0xFF6B8AFF);

  // Text
  static const textPrimary = Color(0xFFFFFFFF);
  static const textSecondary = Color(0xFF8E8EA0);
  static const textMuted = Color(0xFF5A5A6E);

  // Status / Avatars
  static const green = Color(0xFF4CAF50);
  static const red = Color(0xFFEF5350);
  static const orange = Color(0xFFFF7043);

  // Avatar colors (from Figma)
  static const avatarBlue = Color(0xFF4B6EF5);
  static const avatarOrange = Color(0xFFFF7043);
  static const avatarRed = Color(0xFFEF5350);
  static const avatarGreen = Color(0xFF4CAF50);
  static const avatarPurple = Color(0xFF9C27B0);
  static const avatarYellow = Color(0xFFFFCA28);
  static const avatarTeal = Color(0xFF26A69A);

  static const List<Color> avatarPalette = [
    avatarBlue,
    avatarOrange,
    avatarRed,
    avatarGreen,
    avatarPurple,
    avatarYellow,
    avatarTeal,
  ];

  // Message bubbles
  static const bubbleOwn = Color(0xFF4B6EF5);
  static const bubbleOther = Color(0xFF1A1A2E);

  // Bottom nav
  static const navInactive = Color(0xFF5A5A6E);
  static const navActive = Color(0xFF4B6EF5);
}

class AppTheme {
  static ThemeData get dark {
    return ThemeData(
      brightness: Brightness.dark,
      scaffoldBackgroundColor: AppColors.background,
      colorScheme: const ColorScheme.dark(
        primary: AppColors.primary,
        surface: AppColors.surface,
        onPrimary: AppColors.textPrimary,
        onSurface: AppColors.textPrimary,
      ),
      appBarTheme: const AppBarTheme(
        backgroundColor: AppColors.background,
        elevation: 0,
        titleTextStyle: TextStyle(
          color: AppColors.textPrimary,
          fontSize: 28,
          fontWeight: FontWeight.bold,
        ),
      ),
      bottomNavigationBarTheme: const BottomNavigationBarThemeData(
        backgroundColor: AppColors.background,
        selectedItemColor: AppColors.navActive,
        unselectedItemColor: AppColors.navInactive,
        type: BottomNavigationBarType.fixed,
        showUnselectedLabels: true,
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: AppColors.primary,
          foregroundColor: AppColors.textPrimary,
          minimumSize: const Size(double.infinity, 56),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16),
          ),
          textStyle: const TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.w600,
          ),
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: AppColors.surfaceLight,
        hintStyle: const TextStyle(color: AppColors.textMuted),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide.none,
        ),
        contentPadding: const EdgeInsets.symmetric(
          horizontal: 16,
          vertical: 16,
        ),
      ),
    );
  }
}
