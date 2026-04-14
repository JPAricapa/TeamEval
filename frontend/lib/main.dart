/// ============================================================
/// PUNTO DE ENTRADA - TeamEval Platform Frontend
/// Plataforma de Evaluación y Analítica de Trabajo en Equipo
/// Flutter Web + Mobile
/// ============================================================

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';

import 'utils/router.dart';
import 'utils/theme.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(
    const ProviderScope(
      child: TeamEvalApp(),
    ),
  );
}

class TeamEvalApp extends ConsumerWidget {
  const TeamEvalApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final router = ref.watch(routerProvider);

    return MaterialApp.router(
      title: 'TeamEval - Evaluación de Trabajo en Equipo',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.lightTheme,
      darkTheme: AppTheme.darkTheme,
      themeMode: ThemeMode.system,
      routerConfig: router,
    );
  }
}
