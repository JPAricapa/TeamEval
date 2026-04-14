/// Pantalla de Formulario de Evaluación
/// Renderiza los criterios de la rúbrica con niveles de desempeño seleccionables

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../models/evaluation_model.dart';
import '../../models/rubric_model.dart';
import '../../services/api_service.dart';

class EvaluationFormScreen extends ConsumerStatefulWidget {
  final String evaluationId;
  const EvaluationFormScreen({super.key, required this.evaluationId});

  @override
  ConsumerState<EvaluationFormScreen> createState() => _EvaluationFormScreenState();
}

class _EvaluationFormScreenState extends ConsumerState<EvaluationFormScreen> {
  EvaluationModel? _evaluation;
  bool _isLoading = true;
  bool _isSubmitting = false;

  // scores: criteriaId -> selectedScore
  final Map<String, double> _selectedScores = {};
  // comments: criteriaId -> comment
  final Map<String, String> _comments = {};
  String _generalComment = '';

  @override
  void initState() {
    super.initState();
    _loadEvaluation();
  }

  Future<void> _loadEvaluation() async {
    try {
      final api = ref.read(apiServiceProvider);
      final response = await api.get('/evaluations/${widget.evaluationId}');
      setState(() {
        _evaluation = EvaluationModel.fromJson(response.data['data']);
        _isLoading = false;
      });
    } catch (e) {
      setState(() => _isLoading = false);
    }
  }

  Future<void> _submit() async {
    if (_evaluation == null) return;

    // Verificar que se hayan seleccionado todos los criterios
    final criteria = _evaluation!.process?['rubric']?['criteria'] as List? ?? [];
    if (_selectedScores.length < criteria.length) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Debe evaluar todos los criterios antes de enviar.'),
          backgroundColor: Colors.red,
        ),
      );
      return;
    }

    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Confirmar envío'),
        content: const Text(
          'Una vez enviada, no podrá modificar esta evaluación. ¿Desea continuar?'
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Cancelar'),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Confirmar'),
          ),
        ],
      ),
    );

    if (confirm != true) return;

    setState(() => _isSubmitting = true);
    try {
      final api = ref.read(apiServiceProvider);
      await api.post(
        '/evaluations/${widget.evaluationId}/submit',
        data: {
          'scores': _selectedScores.entries.map((e) => {
            'criteriaId': e.key,
            'score': e.value,
            'comment': _comments[e.key] ?? '',
          }).toList(),
          'generalComment': _generalComment,
        },
      );

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('✅ Evaluación enviada exitosamente'),
            backgroundColor: Colors.green,
          ),
        );
        Navigator.pop(context);
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: $e'), backgroundColor: Colors.red),
        );
      }
    } finally {
      if (mounted) setState(() => _isSubmitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }

    if (_evaluation == null) {
      return const Scaffold(
        body: Center(child: Text('Evaluación no encontrada')),
      );
    }

    final criteria = (_evaluation!.process?['rubric']?['criteria'] as List? ?? [])
        .map((c) => CriteriaModel.fromJson(c as Map<String, dynamic>))
        .toList();

    final evaluatedName = _evaluation!.evaluatedUser != null
        ? '${_evaluation!.evaluatedUser!['firstName']} ${_evaluation!.evaluatedUser!['lastName']}'
        : 'Compañero';

    final progress = criteria.isEmpty ? 0.0
        : _selectedScores.length / criteria.length;

    return Scaffold(
      appBar: AppBar(
        title: Text(_evaluation!.typeName),
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(4),
          child: LinearProgressIndicator(
            value: progress,
            backgroundColor: Colors.white30,
            valueColor: const AlwaysStoppedAnimation<Color>(Colors.white),
          ),
        ),
      ),
      body: Column(
        children: [
          // Cabecera
          Container(
            padding: const EdgeInsets.all(16),
            color: Colors.blue[50],
            child: Row(
              children: [
                const Icon(Icons.person, color: Color(0xFF1565C0)),
                const SizedBox(width: 8),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('Evaluando a: $evaluatedName',
                          style: const TextStyle(fontWeight: FontWeight.bold)),
                      Text('Rúbrica: ${_evaluation!.process?['rubric']?['name'] ?? ""}',
                          style: const TextStyle(color: Colors.grey, fontSize: 12)),
                    ],
                  ),
                ),
                Text('${_selectedScores.length}/${criteria.length}',
                    style: const TextStyle(
                        fontWeight: FontWeight.bold, color: Color(0xFF1565C0))),
              ],
            ),
          ),

          // Lista de criterios
          Expanded(
            child: ListView(
              padding: const EdgeInsets.all(16),
              children: [
                ...criteria.map((criterion) => _CriterionCard(
                  criterion: criterion,
                  selectedScore: _selectedScores[criterion.id],
                  onScoreSelected: (score) {
                    setState(() => _selectedScores[criterion.id] = score);
                  },
                  onCommentChanged: (comment) {
                    _comments[criterion.id] = comment;
                  },
                )),

                // Comentario general
                const SizedBox(height: 8),
                TextField(
                  maxLines: 3,
                  decoration: const InputDecoration(
                    labelText: 'Comentario general (opcional)',
                    hintText: 'Observaciones generales sobre el desempeño...',
                    prefixIcon: Icon(Icons.comment),
                  ),
                  onChanged: (v) => _generalComment = v,
                ),

                const SizedBox(height: 80), // espacio para el botón flotante
              ],
            ),
          ),
        ],
      ),

      // Botón de envío
      bottomNavigationBar: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.white,
          boxShadow: [BoxShadow(blurRadius: 8, color: Colors.black.withOpacity(0.1))],
        ),
        child: ElevatedButton(
          onPressed: _isSubmitting ? null : _submit,
          style: ElevatedButton.styleFrom(
            padding: const EdgeInsets.symmetric(vertical: 16),
            backgroundColor: progress < 1.0 ? Colors.grey : const Color(0xFF1565C0),
          ),
          child: _isSubmitting
              ? const SizedBox(
                  height: 20, width: 20,
                  child: CircularProgressIndicator(
                    strokeWidth: 2, color: Colors.white,
                  ),
                )
              : Text(
                  progress < 1.0
                      ? 'Complete todos los criterios (${_selectedScores.length}/${criteria.length})'
                      : 'Enviar Evaluación',
                  style: const TextStyle(fontSize: 16),
                ),
        ),
      ),
    );
  }
}

/// Tarjeta de un criterio con sus niveles de desempeño seleccionables
class _CriterionCard extends StatelessWidget {
  final CriteriaModel criterion;
  final double? selectedScore;
  final ValueChanged<double> onScoreSelected;
  final ValueChanged<String> onCommentChanged;

  const _CriterionCard({
    required this.criterion,
    this.selectedScore,
    required this.onScoreSelected,
    required this.onCommentChanged,
  });

  @override
  Widget build(BuildContext context) {
    final isComplete = selectedScore != null;

    return Card(
      margin: const EdgeInsets.only(bottom: 16),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: BorderSide(
          color: isComplete ? Colors.green : Colors.grey[300]!,
          width: isComplete ? 2 : 1,
        ),
      ),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Encabezado del criterio
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(4),
                  decoration: BoxDecoration(
                    color: isComplete
                        ? Colors.green.withOpacity(0.1)
                        : Colors.grey.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: Icon(
                    isComplete ? Icons.check_circle : Icons.radio_button_unchecked,
                    color: isComplete ? Colors.green : Colors.grey,
                    size: 18,
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    criterion.name,
                    style: const TextStyle(
                        fontWeight: FontWeight.bold, fontSize: 15),
                  ),
                ),
                if (selectedScore != null)
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(
                      color: _scoreColor(selectedScore!).withOpacity(0.15),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Text(
                      '${selectedScore!.toStringAsFixed(0)}/4',
                      style: TextStyle(
                        fontWeight: FontWeight.bold,
                        color: _scoreColor(selectedScore!),
                      ),
                    ),
                  ),
              ],
            ),

            if (criterion.description != null) ...[
              const SizedBox(height: 4),
              Text(criterion.description!,
                  style: const TextStyle(color: Colors.grey, fontSize: 12)),
            ],

            const SizedBox(height: 12),
            const Text('Seleccione el nivel de desempeño:',
                style: TextStyle(fontSize: 12, color: Colors.grey)),
            const SizedBox(height: 8),

            // Niveles de desempeño
            ...criterion.performanceLevels.map((level) => _LevelOption(
              level: level,
              isSelected: selectedScore == level.score,
              onTap: () => onScoreSelected(level.score),
            )),

            // Campo de comentario
            const SizedBox(height: 8),
            TextField(
              decoration: const InputDecoration(
                labelText: 'Comentario del criterio (opcional)',
                hintText: 'Justificación o evidencia...',
                isDense: true,
                prefixIcon: Icon(Icons.note, size: 18),
              ),
              style: const TextStyle(fontSize: 13),
              onChanged: onCommentChanged,
            ),
          ],
        ),
      ),
    );
  }

  Color _scoreColor(double score) {
    if (score >= 4) return Colors.green;
    if (score >= 3) return Colors.blue;
    if (score >= 2) return Colors.orange;
    return Colors.red;
  }
}

class _LevelOption extends StatelessWidget {
  final PerformanceLevelModel level;
  final bool isSelected;
  final VoidCallback onTap;

  const _LevelOption({
    required this.level,
    required this.isSelected,
    required this.onTap,
  });

  Color get _color {
    if (level.score >= 4) return Colors.green;
    if (level.score >= 3) return Colors.blue;
    if (level.score >= 2) return Colors.orange;
    return Colors.red;
  }

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(8),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        margin: const EdgeInsets.only(bottom: 6),
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        decoration: BoxDecoration(
          color: isSelected ? _color.withOpacity(0.15) : Colors.grey[50],
          borderRadius: BorderRadius.circular(8),
          border: Border.all(
            color: isSelected ? _color : Colors.grey[300]!,
            width: isSelected ? 2 : 1,
          ),
        ),
        child: Row(
          children: [
            Container(
              width: 28,
              height: 28,
              decoration: BoxDecoration(
                color: isSelected ? _color : Colors.grey[300],
                shape: BoxShape.circle,
              ),
              child: Center(
                child: Text(
                  level.score.toInt().toString(),
                  style: TextStyle(
                    color: isSelected ? Colors.white : Colors.grey[600],
                    fontWeight: FontWeight.bold,
                    fontSize: 13,
                  ),
                ),
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(level.name,
                      style: TextStyle(
                        fontWeight: FontWeight.bold,
                        color: isSelected ? _color : Colors.black87,
                        fontSize: 13,
                      )),
                  if (level.description != null)
                    Text(level.description!,
                        style: const TextStyle(fontSize: 11, color: Colors.grey)),
                ],
              ),
            ),
            if (isSelected)
              Icon(Icons.check_circle, color: _color, size: 20),
          ],
        ),
      ),
    );
  }
}
