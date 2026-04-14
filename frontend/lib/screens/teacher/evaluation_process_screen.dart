/// Pantalla de Procesos de Evaluación de un Curso

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

class EvaluationProcessScreen extends ConsumerStatefulWidget {
  final String courseId;
  const EvaluationProcessScreen({super.key, required this.courseId});

  @override
  ConsumerState<EvaluationProcessScreen> createState() => _EvaluationProcessScreenState();
}

class _EvaluationProcessScreenState extends ConsumerState<EvaluationProcessScreen> {

  void _showCreateDialog() {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Crear Proceso de Evaluación'),
        content: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const TextField(
                decoration: InputDecoration(labelText: 'Nombre del proceso'),
              ),
              const SizedBox(height: 12),
              DropdownButtonFormField<String>(
                decoration: const InputDecoration(labelText: 'Rúbrica'),
                items: const [
                  DropdownMenuItem(value: 'r1', child: Text('Evaluación por Pares')),
                  DropdownMenuItem(value: 'r2', child: Text('Heteroevaluación Docente')),
                  DropdownMenuItem(value: 'r3', child: Text('Autoevaluación')),
                ],
                onChanged: (_) {},
              ),
              const SizedBox(height: 12),
              const Text('Pesos de ponderación', style: TextStyle(fontWeight: FontWeight.bold)),
              const _WeightSlider(label: 'Autoevaluación', initial: 0.2),
              const _WeightSlider(label: 'Coevaluación', initial: 0.5),
              const _WeightSlider(label: 'Docente', initial: 0.3),
            ],
          ),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancelar')),
          ElevatedButton(onPressed: () => Navigator.pop(ctx), child: const Text('Crear')),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Procesos de Evaluación')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          _ProcessCard(
            name: 'Evaluación Proyecto Final',
            status: 'ACTIVE',
            rubric: 'Evaluación por Pares v1',
            selfWeight: 0.2,
            peerWeight: 0.5,
            teacherWeight: 0.3,
            completionRate: 0.68,
            endDate: 'Nov 30, 2024',
            onAnalytics: () => context.go('/teacher/analytics/mock-id'),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _showCreateDialog,
        icon: const Icon(Icons.add),
        label: const Text('Nuevo Proceso'),
      ),
    );
  }
}

class _ProcessCard extends StatelessWidget {
  final String name;
  final String status;
  final String rubric;
  final double selfWeight;
  final double peerWeight;
  final double teacherWeight;
  final double completionRate;
  final String endDate;
  final VoidCallback onAnalytics;

  const _ProcessCard({
    required this.name, required this.status, required this.rubric,
    required this.selfWeight, required this.peerWeight, required this.teacherWeight,
    required this.completionRate, required this.endDate, required this.onAnalytics,
  });

  @override
  Widget build(BuildContext context) {
    final statusColor = status == 'ACTIVE' ? Colors.green
        : status == 'DRAFT' ? Colors.orange : Colors.grey;

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(child: Text(name,
                    style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15))),
                Chip(
                  label: Text(status),
                  backgroundColor: statusColor.withOpacity(0.1),
                  labelStyle: TextStyle(color: statusColor, fontSize: 11),
                ),
              ],
            ),
            Text(rubric, style: const TextStyle(color: Colors.grey, fontSize: 12)),
            const SizedBox(height: 8),
            Text('Pesos: Auto ${(selfWeight*100).toInt()}% · Pares ${(peerWeight*100).toInt()}% · Docente ${(teacherWeight*100).toInt()}%',
                style: const TextStyle(fontSize: 12, color: Colors.grey)),
            Text('Vence: $endDate', style: const TextStyle(fontSize: 12, color: Colors.grey)),
            const SizedBox(height: 8),
            Row(
              children: [
                Expanded(child: LinearProgressIndicator(
                  value: completionRate,
                  backgroundColor: Colors.grey[200],
                  valueColor: AlwaysStoppedAnimation<Color>(
                    completionRate > 0.7 ? Colors.green : Colors.orange,
                  ),
                )),
                const SizedBox(width: 8),
                Text('${(completionRate*100).toInt()}%',
                    style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
              ],
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(child: OutlinedButton.icon(
                  icon: const Icon(Icons.play_arrow),
                  label: const Text('Activar'),
                  onPressed: () {},
                )),
                const SizedBox(width: 8),
                Expanded(child: ElevatedButton.icon(
                  icon: const Icon(Icons.analytics),
                  label: const Text('Analítica'),
                  onPressed: onAnalytics,
                )),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _WeightSlider extends StatefulWidget {
  final String label;
  final double initial;
  const _WeightSlider({required this.label, required this.initial});

  @override
  State<_WeightSlider> createState() => _WeightSliderState();
}

class _WeightSliderState extends State<_WeightSlider> {
  late double _value;

  @override
  void initState() { super.initState(); _value = widget.initial; }

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        SizedBox(width: 100, child: Text(widget.label, style: const TextStyle(fontSize: 12))),
        Expanded(child: Slider(
          value: _value, min: 0.0, max: 1.0, divisions: 10,
          onChanged: (v) => setState(() => _value = v),
        )),
        Text('${(_value * 100).toInt()}%', style: const TextStyle(fontSize: 12)),
      ],
    );
  }
}
