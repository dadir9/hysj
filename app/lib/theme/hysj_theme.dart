import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

// ---------------------------------------------------------------------------
// Hysj v2 colour tokens
// ---------------------------------------------------------------------------

class HysjColors {
  // ── Light (paper) ──
  static const paper = Color(0xFFF5F2EA);
  static const paper2 = Color(0xFFEAE6DA);
  static const paper3 = Color(0xFFDCD7C7);
  static const ink = Color(0xFF0F0F14);
  static const ink2 = Color(0xFF2A2A33);
  static const gray1 = Color(0xFFD6D2C5);
  static const gray2 = Color(0xFFB0AC9F);
  static const gray3 = Color(0xFF6E6B62);

  // ── Accent ──
  static const cobalt = Color(0xFF3B49B5);
  static const cobalt2 = Color(0xFF6E7BD9);
  static Color get cobaltSoft => cobalt.withOpacity(0.10);
  static const coral = Color(0xFFE89674);
  static const good = Color(0xFF5BA682);
  static const bad = Color(0xFFD45A3D);

  // ── Dark ──
  static const dBg = Color(0xFF0A0A10);
  static const dSurface = Color(0xFF14141C);
  static const dSurface2 = Color(0xFF1C1C26);
  static const dLine = Color(0xFF25252F);
  static const dText = Color(0xFFF2F0EA);
  static const dText2 = Color(0xFF9A9890);
  static const dText3 = Color(0xFF5E5C58);

  // ── Avatar colour pairs ──
  static const List<(Color bg, Color text)> avatarPairs = [
    (Color(0xFFEDE4D0), Color(0xFF5C3A1E)), // a1 warm amber
    (Color(0xFFC8E8D4), Color(0xFF1E4A3A)), // a2 mint
    (Color(0xFFD4DEF0), Color(0xFF1E3A6E)), // a3 light blue
    (Color(0xFFE8D4EC), Color(0xFF4A1E5C)), // a4 mauve
    (Color(0xFFE0DCC8), Color(0xFF4A3A1E)), // a5 golden
    (Color(0xFFD0E4E8), Color(0xFF1E3A4A)), // a6 teal
  ];

  static const (Color bg, Color text) avatarCobalt = (cobalt, Colors.white);
  static const (Color bg, Color text) avatarCoral = (coral, Colors.white);
  static const (Color bg, Color text) avatarInk = (ink, Colors.white);
}

// ---------------------------------------------------------------------------
// Typography helpers
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Spacing & radii constants
// ---------------------------------------------------------------------------

class HysjSpacing {
  static const double buttonRadius = 16;
  static const double buttonHeight = 54;
  static const double inputRadius = 14;
  static const double cardRadius = 20;
  static const double bubbleRadius = 22;
  static const double bubbleTailRadius = 8;
  static const double voiceBubbleRadius = 24;
  static const double pillRadius = 99;
  static const double iconButtonSize = 40;
  static const double navHeight = 82;
  static const double navBottomInset = 22;
  static const double hairline = 1;
}

// ---------------------------------------------------------------------------
// Typography helpers
// ---------------------------------------------------------------------------

class HysjTypo {
  /// Serif italic display heading (Instrument Serif).
  static TextStyle displaySerif({
    double size = 38,
    Color color = HysjColors.ink,
    double height = 1.15,
    double letterSpacing = -0.02,
  }) {
    return GoogleFonts.instrumentSerif(
      fontSize: size,
      fontStyle: FontStyle.italic,
      fontWeight: FontWeight.w400,
      color: color,
      height: height,
      letterSpacing: size * letterSpacing,
    );
  }

  /// Body / UI text (Geist).
  static TextStyle body({
    double size = 14,
    Color color = HysjColors.ink,
    FontWeight weight = FontWeight.w400,
    double? height,
  }) {
    return GoogleFonts.inter(
      // Geist not on Google Fonts; Inter is the closest match
      fontSize: size,
      fontWeight: weight,
      color: color,
      height: height,
    );
  }

  /// Mono label / handles / timestamps (Geist Mono).
  static TextStyle mono({
    double size = 11,
    Color color = HysjColors.gray3,
    FontWeight weight = FontWeight.w400,
    double letterSpacing = 0.12,
  }) {
    return GoogleFonts.jetBrainsMono(
      // Closest to Geist Mono on Google Fonts
      fontSize: size,
      fontWeight: weight,
      color: color,
      letterSpacing: size * letterSpacing,
    );
  }

  /// Uppercase label (mono style with heavy tracking).
  static TextStyle label({
    double size = 11,
    Color color = HysjColors.gray3,
    FontWeight weight = FontWeight.w500,
  }) {
    return GoogleFonts.jetBrainsMono(
      fontSize: size,
      fontWeight: weight,
      letterSpacing: size * 0.12,
      color: color,
    );
  }
}

// ---------------------------------------------------------------------------
// ThemeData factories
// ---------------------------------------------------------------------------

class HysjTheme {
  static ThemeData get light {
    return ThemeData(
      brightness: Brightness.light,
      scaffoldBackgroundColor: HysjColors.paper,
      colorScheme: const ColorScheme.light(
        primary: HysjColors.cobalt,
        secondary: HysjColors.coral,
        surface: HysjColors.paper,
        onPrimary: Colors.white,
        onSurface: HysjColors.ink,
        error: HysjColors.bad,
      ),
      appBarTheme: const AppBarTheme(
        backgroundColor: HysjColors.paper,
        elevation: 0,
        scrolledUnderElevation: 0,
        iconTheme: IconThemeData(color: HysjColors.ink),
        titleTextStyle: TextStyle(
          color: HysjColors.ink,
          fontSize: 18,
          fontWeight: FontWeight.w600,
        ),
      ),
      dividerColor: HysjColors.gray1,
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: HysjColors.ink,
          foregroundColor: Colors.white,
          minimumSize: const Size(double.infinity, 54),
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
        filled: false,
        hintStyle: const TextStyle(color: HysjColors.gray2),
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: const BorderSide(color: HysjColors.gray1),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: const BorderSide(color: HysjColors.gray1),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: const BorderSide(color: HysjColors.cobalt, width: 1.5),
        ),
      ),
    );
  }

  static ThemeData get dark {
    return ThemeData(
      brightness: Brightness.dark,
      scaffoldBackgroundColor: HysjColors.dBg,
      colorScheme: const ColorScheme.dark(
        primary: HysjColors.cobalt,
        secondary: HysjColors.coral,
        surface: HysjColors.dSurface,
        onPrimary: Colors.white,
        onSurface: HysjColors.dText,
        error: HysjColors.bad,
      ),
      appBarTheme: const AppBarTheme(
        backgroundColor: HysjColors.dBg,
        elevation: 0,
        scrolledUnderElevation: 0,
        iconTheme: IconThemeData(color: HysjColors.dText),
        titleTextStyle: TextStyle(
          color: HysjColors.dText,
          fontSize: 18,
          fontWeight: FontWeight.w600,
        ),
      ),
      dividerColor: HysjColors.dLine,
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: HysjColors.cobalt,
          foregroundColor: Colors.white,
          minimumSize: const Size(double.infinity, 54),
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
        fillColor: HysjColors.dSurface2,
        hintStyle: const TextStyle(color: HysjColors.dText3),
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: const BorderSide(color: HysjColors.dLine),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: const BorderSide(color: HysjColors.dLine),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: const BorderSide(color: HysjColors.cobalt, width: 1.5),
        ),
      ),
    );
  }
}
