/// Dashboard del Docente
/// Vista principal con resumen de cursos, procesos activos y métricas

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:fl_chart/fl_chart.dart';
import '../../providers/auth_provider.dart';
import '../../services/api_service.dart';

class TeacherDashboard extends ConsumerWidget {
  const TeacherDashboard({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user = ref.watch(authProvider).user;

    return SingleChildScrollView(
      padding: const EdgeInsets.all(24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Saludo
          _WelcomeBanner(name: user?.firstName ?? 'Docente'),
          const SizedBox(height: 24),

          // Tarjetas de resumen
          const _SummaryCards(),
          const SizedBox(height: 24),

          // Sección: Procesos activos + Gráfica rápida
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                flex: 2,
                child: const _ActiveProcessesList(),
              ),
              const SizedBox(width: 16),
              Expanded(
                flex: 1,
                child: const _QuickAnalyticsCard(),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _WelcomeBanner extends StatelessWidget {
  final String name;
  const _WelcomeBanner({required this.name});

  @override
  Widget build(BuildContext context) {
    final hour = DateTime.now().hour;
    final greeting = hour < 12 ? 'Buenos días' :
                     hour < 18 ? 'Buenas tardes' : 'Buenas noches';

    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [Color(0xFF1565C0), Color(0xFF5E92F3)],
        ),
        borderRadius: BorderRadius.circular(16),
      ),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('$greeting, $name',
                    style: const TextStyle(color: Colors.white, fontSize: 22,
                        fontWeight: FontWeight.bold)),
                const SizedBox(height: 4),
                const Text('Panel de gestión de evaluaciones de trabajo en equipo',
                    style: TextStyle(color: Colors.white70)),
              ],
            ),
          ),
          const Icon(Icons.school, size: 60, color: Colors.white30),
        ],
      ),
    );
  }
}

class _SummaryCards extends StatelessWidget {
  const _SummaryCards();

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final isWide = constraints.maxWidth > 600;
        return isWide
            ? const Row(children: [
                Expanded(child: _StatCard(title: 'Cursos Activos', value: '3', icon: Icons.book, color: Color(0xFF1565C0))),
                SizedBox(width: 12),
                Expanded(child: _StatCard(title: 'Procesos Activos', value: '2', icon: Icons.assignment, color: Color(0xFF00897B))),
                SizedBox(width: 12),
                Expanded(child: _StatCard(title: 'Evaluaciones Pendientes', value: '45', icon: Icons.pending_actions, color: Color(0xFFE65100))),
                SizedBox(width: 12),
                Expanded(child: _StatCard(title: 'Estudiantes', value: '78', icon: Icons.people, color: Color(0xFF6A1B9A))),
              ])
            : const Column(children: [
                _StatCard(title: 'Cursos Activos', value: '3', icon: Icons.book, color: Color(0xFF1565C0)),
                SizedBox(height: 8),
                _StatCard(title: 'Procesos Activos', value: '2', icon: Icons.assignment, color: Color(0xFF00897B)),
              ]);
      },
    );
  }
}

class _StatCard extends StatelessWidget {
  final String title;
  final String value;
  final IconData icon;
  final Color color;

  const _StatCard({
    required this.title,
    required this.value,
    required this.icon,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: color.withOpacity(0.1),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Icon(icon, color: color, size: 28),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(value,
                      style: TextStyle(fontSize: 28, fontWeight: FontWeight.bold,
                          color: color)),
                  Text(title, style: const TextStyle(color: Colors.grey)),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _ActiveProcessesList extends StatelessWidget {
  const _ActiveProcessesList();

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Procesos de Evaluación Activos',
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
            const SizedBox(height: 16),
            // Ejemplo estático (en producción se cargaría de la API)
            _ProcessTile(
              name: 'Evaluación Proyecto Final - ISC-401',
              daysLeft: 5,
              completionRate: 0.68,
              onTap: () => context.go('/teacher/analytics/mock-id'),
            ),
            const Divider(),
            _ProcessTile(
              name: 'Laboratorio de Software - ISC-301',
              daysLeft: 2,
              completionRate: 0.45,
              onTap: () => context.go('/teacher/analytics/mock-id-2'),
            ),
          ],
        ),
      ),
    );
  }
}

class _ProcessTile extends StatelessWidget {
  final String name;
  final int daysLeft;
  final double completionRate;
  final VoidCallback onTap;

  const _ProcessTile({
    required this.name,
    required this.daysLeft,
    required this.completionRate,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final color = daysLeft <= 2 ? Colors.red : Colors.orange;

    return ListTile(
      contentPadding: EdgeInsets.zero,
      title: Text(name, style: const TextStyle(fontWeight: FontWeight.w500)),
      subtitle: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const SizedBox(height: 4),
          Row(
            children: [
              Icon(Icons.timer, size: 14, color: color),
              const SizedBox(width: 4),
              Text('$daysLeft días restantes',
                  style: TextStyle(color: color, fontSize: 12)),
              const SizedBox(width: 12),
              Text('${(completionRate * 100).toInt()}% completado',
                  style: const TextStyle(color: Colors.grey, fontSize: 12)),
            ],
          ),
          const SizedBox(height: 4),
          LinearProgressIndicator(
            value: completionRate,
            backgroundColor: Colors.grey[200],
            valueColor: AlwaysStoppedAnimation<Color>(
              completionRate > 0.7 ? Colors.green : Colors.orange,
            ),
          ),
        ],
      ),
      trailing: IconButton(
        icon: const Icon(Icons.analytics),
        onPressed: onTap,
        tooltip: 'Ver analítica',
      ),
    );
  }
}

class _QuickAnalyticsCard extends StatelessWidget {
  const _QuickAnalyticsCard();

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Distribución de Notas',
                style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold)),
            const SizedBox(height: 16),
            SizedBox(
              height: 180,
              child: BarChart(
                BarChartData(
                  alignment: BarChartAlignment.spaceAround,
                  maxY: 15,
                  barTouchData: BarTouchData(enabled: false),
                  titlesData: FlTitlesData(
                    leftTitles: const AxisTitles(
                      sideTitles: SideTitles(showTitles: false),
                    ),
                    topTitles: const AxisTitles(
                      sideTitles: SideTitles(showTitles: false),
                    ),
                    bottomTitles: AxisTitles(
                      sideTitles: SideTitles(
                        showTitles: true,
                        getTitlesWidget: (value, meta) {
                          const labels = ['1-2', '2-3', '3-4', '4-5'];
                          return Text(labels[value.toInt()],
                              style: const TextStyle(fontSize: 10));
                        },
                        reservedSize: 20,
                      ),
                    ),
                    rightTitles: const AxisTitles(
                      sideTitles: SideTitles(showTitles: false),
                    ),
                  ),
                  gridData: const FlGridData(show: false),
                  borderData: FlBorderData(show: false),
                  barGroups: [
                    BarChartGroupData(x: 0, barRods: [
                      BarChartRodData(toY: 3, color: Colors.red[300])
                    ]),
                    BarChartGroupData(x: 1, barRods: [
                      BarChartRodData(toY: 8, color: Colors.orange[300])
                    ]),
                    BarChartGroupData(x: 2, barRods: [
                      BarChartRodData(toY: 12, color: Colors.blue[300])
                    ]),
                    BarChartGroupData(x: 3, barRods: [
                      BarChartRodData(toY: 10, color: Colors.green[300])
                    ]),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
