/// Dashboard del Estudiante

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../providers/auth_provider.dart';

class StudentDashboard extends ConsumerWidget {
  const StudentDashboard({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user = ref.watch(authProvider).user;

    return SingleChildScrollView(
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Bienvenida
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                colors: [Color(0xFF00897B), Color(0xFF004D40)],
              ),
              borderRadius: BorderRadius.circular(16),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Hola, ${user?.firstName ?? "Estudiante"}!',
                    style: const TextStyle(
                        color: Colors.white, fontSize: 22,
                        fontWeight: FontWeight.bold)),
                const SizedBox(height: 4),
                const Text('Revisa tus evaluaciones pendientes',
                    style: TextStyle(color: Colors.white70)),
              ],
            ),
          ),
          const SizedBox(height: 20),

          // Acciones rápidas
          Row(
            children: [
              Expanded(
                child: _ActionCard(
                  icon: Icons.rate_review,
                  label: 'Mis Evaluaciones',
                  count: '3 pendientes',
                  color: Colors.orange,
                  onTap: () => context.go('/student/evaluations'),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _ActionCard(
                  icon: Icons.bar_chart,
                  label: 'Mis Resultados',
                  count: 'Ver historial',
                  color: Colors.blue,
                  onTap: () => context.go('/student/results'),
                ),
              ),
            ],
          ),
          const SizedBox(height: 20),

          // Evaluaciones recientes
          const Text('Evaluaciones Recientes',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
          const SizedBox(height: 12),
          const _PendingEvaluationsList(),
        ],
      ),
    );
  }
}

class _ActionCard extends StatelessWidget {
  final IconData icon;
  final String label;
  final String count;
  final Color color;
  final VoidCallback onTap;

  const _ActionCard({
    required this.icon,
    required this.label,
    required this.count,
    required this.color,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: Card(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Icon(icon, color: color, size: 32),
              const SizedBox(height: 8),
              Text(label,
                  style: const TextStyle(fontWeight: FontWeight.bold)),
              Text(count,
                  style: TextStyle(color: color, fontSize: 12)),
            ],
          ),
        ),
      ),
    );
  }
}

class _PendingEvaluationsList extends StatelessWidget {
  const _PendingEvaluationsList();

  @override
  Widget build(BuildContext context) {
    // Datos de ejemplo
    final pending = [
      {'name': 'Autoevaluación - Proyecto Final', 'type': 'SELF', 'days': 5},
      {'name': 'Coevaluación - Carlos López', 'type': 'PEER', 'days': 5},
      {'name': 'Coevaluación - María Martínez', 'type': 'PEER', 'days': 5},
    ];

    return Column(
      children: pending.map((eval) => Card(
        margin: const EdgeInsets.only(bottom: 8),
        child: ListTile(
          leading: CircleAvatar(
            backgroundColor: eval['type'] == 'SELF'
                ? Colors.blue[100] : Colors.orange[100],
            child: Icon(
              eval['type'] == 'SELF' ? Icons.person : Icons.people,
              color: eval['type'] == 'SELF' ? Colors.blue : Colors.orange,
            ),
          ),
          title: Text(eval['name'] as String),
          subtitle: Text('Vence en ${eval['days']} días',
              style: const TextStyle(color: Colors.orange)),
          trailing: ElevatedButton(
            onPressed: () => context.go('/student/evaluations/mock-eval-id'),
            style: ElevatedButton.styleFrom(
              padding: const EdgeInsets.symmetric(horizontal: 12),
            ),
            child: const Text('Evaluar'),
          ),
        ),
      )).toList(),
    );
  }
}
