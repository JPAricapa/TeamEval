/// Pantalla de Rúbricas del Docente

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

class RubricsScreen extends ConsumerWidget {
  const RubricsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final rubrics = [
      {
        'name': 'Evaluación de Trabajo en Equipo - Por Pares',
        'version': 1,
        'criteria': 3,
        'isPublic': true,
        'description': 'Contribución, Roles, Comunicación Interna'
      },
      {
        'name': 'Evaluación de Trabajo en Equipo - Heteroevaluación Docente',
        'version': 1,
        'criteria': 3,
        'isPublic': true,
        'description': 'Metas, Decisiones, Registros de Control'
      },
      {
        'name': 'Evaluación de Trabajo en Equipo - Autoevaluación',
        'version': 1,
        'criteria': 3,
        'isPublic': true,
        'description': 'Mi Contribución, Mi Rol, Mi Comunicación'
      },
    ];

    return Scaffold(
      appBar: AppBar(title: const Text('Rúbricas')),
      body: ListView.builder(
        padding: const EdgeInsets.all(16),
        itemCount: rubrics.length,
        itemBuilder: (ctx, i) {
          final r = rubrics[i];
          return Card(
            margin: const EdgeInsets.only(bottom: 12),
            child: ExpansionTile(
              leading: const Icon(Icons.assignment, color: Color(0xFF1565C0)),
              title: Text(r['name'] as String,
                  style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
              subtitle: Text(r['description'] as String,
                  style: const TextStyle(fontSize: 12, color: Colors.grey)),
              trailing: Wrap(
                spacing: 4,
                children: [
                  Chip(
                    label: Text('v${r['version']}'),
                    backgroundColor: Colors.blue[50],
                    labelStyle: const TextStyle(fontSize: 11),
                  ),
                  if (r['isPublic'] as bool)
                    Chip(
                      label: const Text('Pública'),
                      backgroundColor: Colors.green[50],
                      labelStyle: const TextStyle(fontSize: 11, color: Colors.green),
                    ),
                ],
              ),
              children: [
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                  child: Row(
                    children: [
                      Icon(Icons.list_alt, size: 16, color: Colors.grey),
                      const SizedBox(width: 4),
                      Text('${r['criteria']} criterios · Niveles: 4 (Proficiente), 3 (Aceptable), 2 (Principiante), 1 (Necesita mejorar)',
                          style: const TextStyle(fontSize: 12, color: Colors.grey)),
                    ],
                  ),
                ),
                Padding(
                  padding: const EdgeInsets.all(8),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.end,
                    children: [
                      TextButton.icon(
                        icon: const Icon(Icons.visibility),
                        label: const Text('Ver detalle'),
                        onPressed: () {},
                      ),
                      TextButton.icon(
                        icon: const Icon(Icons.copy),
                        label: const Text('Duplicar'),
                        onPressed: () {},
                      ),
                      TextButton.icon(
                        icon: const Icon(Icons.history),
                        label: const Text('Versionar'),
                        onPressed: () {},
                      ),
                    ],
                  ),
                ),
              ],
            ),
          );
        },
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => context.go('/teacher/rubrics/create'),
        icon: const Icon(Icons.add),
        label: const Text('Nueva Rúbrica'),
      ),
    );
  }
}
