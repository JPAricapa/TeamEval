/// Pantalla de Evaluaciones Pendientes del Estudiante

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../services/api_service.dart';
import '../../models/evaluation_model.dart';

class MyEvaluationsScreen extends ConsumerStatefulWidget {
  const MyEvaluationsScreen({super.key});

  @override
  ConsumerState<MyEvaluationsScreen> createState() => _MyEvaluationsScreenState();
}

class _MyEvaluationsScreenState extends ConsumerState<MyEvaluationsScreen> {
  List<EvaluationModel> _evaluations = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final api = ref.read(apiServiceProvider);
      final response = await api.get('/evaluations/my-pending');
      final data = response.data['data'] as List;
      setState(() {
        _evaluations = data
            .map((e) => EvaluationModel.fromJson(e as Map<String, dynamic>))
            .toList();
        _isLoading = false;
      });
    } catch (_) {
      setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Mis Evaluaciones')),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _evaluations.isEmpty
              ? const Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.check_circle_outline, size: 80, color: Colors.green),
                      SizedBox(height: 16),
                      Text('¡Sin evaluaciones pendientes!',
                          style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                      SizedBox(height: 8),
                      Text('Estás al día con todas tus evaluaciones.',
                          style: TextStyle(color: Colors.grey)),
                    ],
                  ),
                )
              : ListView.builder(
                  padding: const EdgeInsets.all(16),
                  itemCount: _evaluations.length,
                  itemBuilder: (context, i) => _EvalCard(
                    evaluation: _evaluations[i],
                    onTap: () => context.go(
                        '/student/evaluations/${_evaluations[i].id}'),
                  ),
                ),
    );
  }
}

class _EvalCard extends StatelessWidget {
  final EvaluationModel evaluation;
  final VoidCallback onTap;
  const _EvalCard({required this.evaluation, required this.onTap});

  @override
  Widget build(BuildContext context) {
    final evalInfo = evaluation.evaluatedUser;
    final processInfo = evaluation.process;
    final daysLeft = evaluation.process?['endDate'] != null
        ? DateTime.parse(evaluation.process!['endDate'] as String)
            .difference(DateTime.now()).inDays
        : null;

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: ListTile(
        leading: CircleAvatar(
          backgroundColor: _typeColor(evaluation.type).withOpacity(0.15),
          child: Icon(_typeIcon(evaluation.type), color: _typeColor(evaluation.type)),
        ),
        title: Text(evaluation.typeName,
            style: const TextStyle(fontWeight: FontWeight.bold)),
        subtitle: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (evalInfo != null)
              Text('Para: ${evalInfo['firstName']} ${evalInfo['lastName']}'),
            if (processInfo != null)
              Text('Proceso: ${processInfo['name']}',
                  style: const TextStyle(color: Colors.grey, fontSize: 12)),
            if (daysLeft != null)
              Text('Vence en $daysLeft día(s)',
                  style: TextStyle(
                    color: daysLeft <= 2 ? Colors.red : Colors.orange,
                    fontSize: 12, fontWeight: FontWeight.w500,
                  )),
          ],
        ),
        trailing: ElevatedButton(
          onPressed: onTap,
          child: const Text('Iniciar'),
        ),
        isThreeLine: true,
      ),
    );
  }

  Color _typeColor(String type) {
    switch (type) {
      case 'SELF': return Colors.blue;
      case 'PEER': return Colors.orange;
      case 'TEACHER': return Colors.purple;
      default: return Colors.grey;
    }
  }

  IconData _typeIcon(String type) {
    switch (type) {
      case 'SELF': return Icons.person;
      case 'PEER': return Icons.people;
      case 'TEACHER': return Icons.school;
      default: return Icons.assignment;
    }
  }
}
