/// Pantalla de Cursos del Docente

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

class CoursesScreen extends ConsumerWidget {
  const CoursesScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Scaffold(
      appBar: AppBar(title: const Text('Mis Cursos')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          _CourseCard(
            name: 'Gestión de Proyectos de Software',
            code: 'ISC-401',
            period: '2024-2',
            studentCount: 18,
            activeProcesses: 2,
            onTap: () => context.go('/teacher/processes/mock-course-id'),
          ),
          _CourseCard(
            name: 'Ingeniería de Software',
            code: 'ISC-301',
            period: '2024-2',
            studentCount: 24,
            activeProcesses: 1,
            onTap: () {},
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () {},
        icon: const Icon(Icons.add),
        label: const Text('Nuevo Curso'),
      ),
    );
  }
}

class _CourseCard extends StatelessWidget {
  final String name;
  final String code;
  final String period;
  final int studentCount;
  final int activeProcesses;
  final VoidCallback onTap;

  const _CourseCard({
    required this.name, required this.code, required this.period,
    required this.studentCount, required this.activeProcesses, required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  const Icon(Icons.book, color: Color(0xFF1565C0)),
                  const SizedBox(width: 8),
                  Expanded(child: Text(name,
                      style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15))),
                  Chip(label: Text(code), backgroundColor: Colors.blue[50]),
                ],
              ),
              const SizedBox(height: 8),
              Row(
                children: [
                  const Icon(Icons.calendar_today, size: 14, color: Colors.grey),
                  const SizedBox(width: 4),
                  Text(period, style: const TextStyle(color: Colors.grey, fontSize: 12)),
                  const SizedBox(width: 16),
                  const Icon(Icons.people, size: 14, color: Colors.grey),
                  const SizedBox(width: 4),
                  Text('$studentCount estudiantes',
                      style: const TextStyle(color: Colors.grey, fontSize: 12)),
                  const SizedBox(width: 16),
                  const Icon(Icons.assignment, size: 14, color: Colors.green),
                  const SizedBox(width: 4),
                  Text('$activeProcesses proceso(s) activo(s)',
                      style: const TextStyle(color: Colors.green, fontSize: 12)),
                ],
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: onTap,
                      icon: const Icon(Icons.assignment_outlined),
                      label: const Text('Ver Procesos'),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: ElevatedButton.icon(
                      onPressed: () => context.go('/teacher/analytics/mock-id'),
                      icon: const Icon(Icons.analytics),
                      label: const Text('Analítica'),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}
