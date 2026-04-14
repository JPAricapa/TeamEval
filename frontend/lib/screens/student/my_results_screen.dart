/// Pantalla de Resultados del Estudiante con gráficas

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:fl_chart/fl_chart.dart';

class MyResultsScreen extends ConsumerWidget {
  const MyResultsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    // Datos mock para demostración
    final mockResult = {
      'selfScore': 3.7,
      'peerScore': 3.3,
      'teacherScore': 3.5,
      'finalScore': 3.42,
      'criteriaScores': {
        'Contribución': 3.5,
        'Roles': 3.8,
        'Comunicación': 3.2,
      }
    };

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Nota final
          _FinalScoreCard(score: mockResult['finalScore'] as double),
          const SizedBox(height: 16),

          // Comparativa de evaluaciones
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('Comparativa de Evaluaciones',
                      style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 16),
                  SizedBox(
                    height: 200,
                    child: _buildComparisonChart(mockResult),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),

          // Detalle por criterio
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('Resultados por Criterio',
                      style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 12),
                  ...(mockResult['criteriaScores'] as Map<String, double>)
                      .entries.map((entry) => _CriterionResult(
                        name: entry.key,
                        score: entry.value,
                        maxScore: 4.0,
                      )),
                ],
              ),
            ),
          ),

          const SizedBox(height: 16),

          // Índice de sobrevaloración
          _OvervaluationCard(
            selfScore: mockResult['selfScore'] as double,
            peerScore: mockResult['peerScore'] as double,
          ),
        ],
      ),
    );
  }

  Widget _buildComparisonChart(Map<String, dynamic> result) {
    final data = [
      {'label': 'Auto', 'score': result['selfScore'] as double, 'color': Colors.blue},
      {'label': 'Pares', 'score': result['peerScore'] as double, 'color': Colors.orange},
      {'label': 'Docente', 'score': result['teacherScore'] as double, 'color': Colors.purple},
      {'label': 'Final', 'score': result['finalScore'] as double, 'color': Colors.green},
    ];

    return BarChart(
      BarChartData(
        maxY: 4.5,
        alignment: BarChartAlignment.spaceAround,
        barTouchData: BarTouchData(
          touchTooltipData: BarTouchTooltipData(
            getTooltipItem: (group, gi, rod, ri) => BarTooltipItem(
              '${(data[gi]['label'])}:\n${rod.toY.toStringAsFixed(2)}',
              const TextStyle(color: Colors.white, fontSize: 12),
            ),
          ),
        ),
        titlesData: FlTitlesData(
          bottomTitles: AxisTitles(
            sideTitles: SideTitles(
              showTitles: true,
              getTitlesWidget: (v, _) => Text(
                (data[v.toInt()]['label'] as String),
                style: const TextStyle(fontSize: 11),
              ),
              reservedSize: 24,
            ),
          ),
          leftTitles: AxisTitles(
            sideTitles: SideTitles(
              showTitles: true,
              interval: 1,
              reservedSize: 28,
              getTitlesWidget: (v, _) => Text(v.toStringAsFixed(0),
                  style: const TextStyle(fontSize: 10)),
            ),
          ),
          topTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
          rightTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
        ),
        gridData: const FlGridData(show: true, horizontalInterval: 1),
        borderData: FlBorderData(show: false),
        barGroups: data.asMap().entries.map((entry) => BarChartGroupData(
          x: entry.key,
          barRods: [BarChartRodData(
            toY: entry.value['score'] as double,
            color: entry.value['color'] as Color,
            width: 40,
            borderRadius: const BorderRadius.vertical(top: Radius.circular(4)),
          )],
        )).toList(),
      ),
    );
  }
}

class _FinalScoreCard extends StatelessWidget {
  final double score;
  const _FinalScoreCard({required this.score});

  Color get _color {
    if (score >= 3.8) return Colors.green;
    if (score >= 3.0) return Colors.blue;
    if (score >= 2.0) return Colors.orange;
    return Colors.red;
  }

  String get _label {
    if (score >= 3.8) return 'Proficiente';
    if (score >= 3.0) return 'Aceptable';
    if (score >= 2.0) return 'Principiante';
    return 'Necesita mejorar';
  }

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Column(
              children: [
                Text('Nota Final',
                    style: const TextStyle(fontSize: 16, color: Colors.grey)),
                Text(score.toStringAsFixed(2),
                    style: TextStyle(
                      fontSize: 52,
                      fontWeight: FontWeight.bold,
                      color: _color,
                    )),
                Text('de 4.0 — $_label',
                    style: TextStyle(color: _color)),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _CriterionResult extends StatelessWidget {
  final String name;
  final double score;
  final double maxScore;
  const _CriterionResult({required this.name, required this.score, required this.maxScore});

  @override
  Widget build(BuildContext context) {
    final progress = score / maxScore;
    final color = progress >= 0.875 ? Colors.green
        : progress >= 0.625 ? Colors.blue
        : progress >= 0.375 ? Colors.orange
        : Colors.red;

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(name, style: const TextStyle(fontWeight: FontWeight.w500)),
              Text('${score.toStringAsFixed(1)} / ${maxScore.toStringAsFixed(0)}',
                  style: TextStyle(color: color, fontWeight: FontWeight.bold)),
            ],
          ),
          const SizedBox(height: 4),
          ClipRRect(
            borderRadius: BorderRadius.circular(4),
            child: LinearProgressIndicator(
              value: progress,
              backgroundColor: Colors.grey[200],
              valueColor: AlwaysStoppedAnimation<Color>(color),
              minHeight: 8,
            ),
          ),
        ],
      ),
    );
  }
}

class _OvervaluationCard extends StatelessWidget {
  final double selfScore;
  final double peerScore;
  const _OvervaluationCard({required this.selfScore, required this.peerScore});

  @override
  Widget build(BuildContext context) {
    final diff = selfScore - peerScore;
    final isOvervalued = diff > 0.3;

    return Card(
      color: isOvervalued ? Colors.orange[50] : Colors.green[50],
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          children: [
            Icon(
              isOvervalued ? Icons.warning_amber : Icons.check_circle,
              color: isOvervalued ? Colors.orange : Colors.green,
              size: 40,
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    isOvervalued ? 'Índice de Sobrevaloración' : 'Calibración Adecuada',
                    style: TextStyle(
                      fontWeight: FontWeight.bold,
                      color: isOvervalued ? Colors.orange[800] : Colors.green[800],
                    ),
                  ),
                  Text(
                    isOvervalued
                        ? 'Tu autoevaluación (${selfScore.toStringAsFixed(2)}) es ${diff.toStringAsFixed(2)} puntos mayor que la coevaluación (${peerScore.toStringAsFixed(2)}).'
                        : 'Tu autoevaluación es consistente con la evaluación de tus compañeros.',
                    style: const TextStyle(fontSize: 12, color: Colors.black87),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
