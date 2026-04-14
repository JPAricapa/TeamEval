/// Dashboard del Administrador Institucional

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../providers/auth_provider.dart';

class AdminDashboard extends ConsumerWidget {
  const AdminDashboard({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                colors: [Color(0xFF6A1B9A), Color(0xFF4A148C)],
              ),
              borderRadius: BorderRadius.circular(16),
            ),
            child: const Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Icon(Icons.admin_panel_settings, color: Colors.white, size: 40),
                SizedBox(height: 8),
                Text('Panel Administrativo',
                    style: TextStyle(color: Colors.white, fontSize: 22,
                        fontWeight: FontWeight.bold)),
                Text('Gestión institucional del sistema TeamEval',
                    style: TextStyle(color: Colors.white70)),
              ],
            ),
          ),
          const SizedBox(height: 24),
          GridView.count(
            shrinkWrap: true,
            crossAxisCount: MediaQuery.of(context).size.width > 600 ? 3 : 2,
            childAspectRatio: 1.2,
            crossAxisSpacing: 12,
            mainAxisSpacing: 12,
            children: [
              _AdminCard('Usuarios', Icons.people, '124', Colors.blue,
                  () => context.go('/admin/users')),
              _AdminCard('Instituciones', Icons.business, '1', Colors.green,
                  () => context.go('/admin/institutions')),
              _AdminCard('Programas', Icons.school, '5', Colors.orange,
                  () {}),
              _AdminCard('Cursos Activos', Icons.book, '12', Colors.purple,
                  () {}),
              _AdminCard('Procesos', Icons.assignment, '8', Colors.teal,
                  () {}),
              _AdminCard('Reportes', Icons.analytics, 'Ver', Colors.red,
                  () {}),
            ],
          ),
        ],
      ),
    );
  }
}

class _AdminCard extends StatelessWidget {
  final String label;
  final IconData icon;
  final String value;
  final Color color;
  final VoidCallback onTap;

  const _AdminCard(this.label, this.icon, this.value, this.color, this.onTap);

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: Card(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(icon, color: color, size: 36),
              const SizedBox(height: 8),
              Text(value,
                  style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold,
                      color: color)),
              Text(label, textAlign: TextAlign.center,
                  style: const TextStyle(color: Colors.grey, fontSize: 12)),
            ],
          ),
        ),
      ),
    );
  }
}
