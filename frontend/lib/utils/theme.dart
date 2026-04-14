/// Tema visual de la aplicación TeamEval
/// Paleta azul institucional + Material Design 3

import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class AppTheme {
  // Colores primarios
  static const Color primary = Color(0xFF1565C0);     // Azul institucional
  static const Color primaryLight = Color(0xFF5E92F3);
  static const Color primaryDark = Color(0xFF003C8F);
  static const Color secondary = Color(0xFF00897B);   // Verde teal
  static const Color accent = Color(0xFFFF6F00);      // Naranja énfasis
  static const Color error = Color(0xFFC62828);
  static const Color success = Color(0xFF2E7D32);
  static const Color warning = Color(0xFFE65100);

  /// Tema claro
  static ThemeData get lightTheme {
    return ThemeData(
      useMaterial3: true,
      colorScheme: ColorScheme.fromSeed(
        seedColor: primary,
        brightness: Brightness.light,
      ).copyWith(
        primary: primary,
        secondary: secondary,
        error: error,
      ),
      textTheme: GoogleFonts.interTextTheme(),
      appBarTheme: const AppBarTheme(
        backgroundColor: primary,
        foregroundColor: Colors.white,
        elevation: 0,
        centerTitle: false,
      ),
      cardTheme: CardTheme(
        elevation: 2,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(12),
        ),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: primary,
          foregroundColor: Colors.white,
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(8),
          ),
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(8),
        ),
        filled: true,
        fillColor: Colors.grey[50],
      ),
      navigationDrawerTheme: const NavigationDrawerThemeData(
        backgroundColor: Colors.white,
      ),
    );
  }

  /// Tema oscuro
  static ThemeData get darkTheme {
    return ThemeData(
      useMaterial3: true,
      colorScheme: ColorScheme.fromSeed(
        seedColor: primary,
        brightness: Brightness.dark,
      ).copyWith(
        primary: primaryLight,
        secondary: secondary,
      ),
      textTheme: GoogleFonts.interTextTheme(ThemeData.dark().textTheme),
    );
  }
}
