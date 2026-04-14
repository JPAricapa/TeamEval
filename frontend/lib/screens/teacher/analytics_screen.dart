/// Pantalla de Analítica Avanzada del Docente
/// Gráficas: radar chart, histograma, barras comparativas, percentiles

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:fl_chart/fl_chart.dart';
import '../../services/api_service.dart';

class AnalyticsScreen extends ConsumerStatefulWidget {
  final String processId;
  const AnalyticsScreen({super.key, required this.processId});

  @override
  ConsumerState<AnalyticsScreen> createState() => _AnalyticsScreenState();
}

class _AnalyticsScreenState extends ConsumerState<AnalyticsScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  Map<String, dynamic>? _courseAnalytics;
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    _loadAnalytics();
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  Future<void> _loadAnalytics() async {
    try {
      final api = ref.read(apiServiceProvider);
      final response = await api.get('/analytics/course/${widget.processId}');
      setState(() {
        _courseAnalytics = response.data['data'];
        _isLoading = false;
      });
    } catch (e) {
      // Datos de ejemplo para demostración
      setState(() {
        _courseAnalytics = _mockAnalytics();
        _isLoading = false;
      });
    }
  }

  Map<String, dynamic> _mockAnalytics() {
    return {
      'courseName': 'Gestión de Proyectos de Software',
      'totalStudents': 18,
      'completionRate': 0.89,
      'mean': 3.42,
      'median': 3.50,
      'standardDeviation': 0.68,
      'variance': 0.46,
      'percentile25': 2.9,
      'percentile75': 3.9,
      'percentile90': 4.1,
      'scoreDistribution': {
        '0.0-2.0': 2, '2.0-3.0': 3, '3.0-3.5': 5,
        '3.5-4.0': 4, '4.0-4.5': 3, '4.5-5.0': 1
      },
      'criteriaAverages': {
        'crit-1': {'name': 'Contribución', 'average': 3.2, 'weight': 1.0},
        'crit-2': {'name': 'Roles', 'average': 3.6, 'weight': 1.0},
        'crit-3': {'name': 'Comunicación', 'average': 3.5, 'weight': 1.0},
        'crit-4': {'name': 'Metas', 'average': 3.1, 'weight': 1.0},
        'crit-5': {'name': 'Decisiones', 'average': 3.4, 'weight': 1.0},
        'crit-6': {'name': 'Registros', 'average': 2.9, 'weight': 1.0},
      }
    };
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }

    return Scaffold(
      appBar: AppBar(
        title: Text('Analítica: ${_courseAnalytics!['courseName']}'),
        bottom: TabBar(
          controller: _tabController,
          labelColor: Colors.white,
          unselectedLabelColor: Colors.white70,
          indicatorColor: Colors.white,
          tabs: const [
            Tab(icon: Icon(Icons.bar_chart), text: 'General'),
            Tab(icon: Icon(Icons.radar), text: 'Criterios'),
            Tab(icon: Icon(Icons.people), text: 'Equipos'),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.download),
            onPressed: _showExportDialog,
            tooltip: 'Exportar datos',
          ),
        ],
      ),
      body: TabBarView(
        controller: _tabController,
        children: [
          _GeneralTab(analytics: _courseAnalytics!),
          _CriteriaTab(analytics: _courseAnalytics!),
          _TeamsTab(processId: widget.processId),
        ],
      ),
    );
  }

  void _showExportDialog() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Exportar Datos'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            ListTile(
              leading: const Icon(Icons.table_chart, color: Colors.green),
              title: const Text('Excel (.xlsx)'),
              subtitle: const Text('Resultados detallados por estudiante'),
              onTap: () => Navigator.pop(context),
            ),
            ListTile(
              leading: const Icon(Icons.text_snippet, color: Colors.blue),
              title: const Text('CSV'),
              subtitle: const Text('Dataset para análisis estadístico'),
              onTap: () => Navigator.pop(context),
            ),
            ListTile(
              leading: const Icon(Icons.picture_as_pdf, color: Colors.red),
              title: const Text('PDF'),
              subtitle: const Text('Reporte ejecutivo del proceso'),
              onTap: () => Navigator.pop(context),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancelar'),
          ),
        ],
      ),
    );
  }
}

/// Tab General: Estadísticas descriptivas + Histograma
class _GeneralTab extends StatelessWidget {
  final Map<String, dynamic> analytics;
  const _GeneralTab({required this.analytics});

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        children: [
          // Tarjetas estadísticas
          GridView.count(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            crossAxisCount: MediaQuery.of(context).size.width > 600 ? 4 : 2,
            childAspectRatio: 1.5,
            crossAxisSpacing: 8,
            mainAxisSpacing: 8,
            children: [
              _StatsCard('Media', analytics['mean'].toStringAsFixed(2),
                  Icons.trending_flat, Colors.blue),
              _StatsCard('Mediana', analytics['median'].toStringAsFixed(2),
                  Icons.bar_chart, Colors.green),
              _StatsCard('Desv. Est.', analytics['standardDeviation'].toStringAsFixed(2),
                  Icons.show_chart, Colors.orange),
              _StatsCard('Varianza', analytics['variance'].toStringAsFixed(2),
                  Icons.functions, Colors.purple),
              _StatsCard('P25', analytics['percentile25'].toStringAsFixed(2),
                  Icons.arrow_downward, Colors.red),
              _StatsCard('P75', analytics['percentile75'].toStringAsFixed(2),
                  Icons.arrow_upward, Colors.teal),
              _StatsCard('P90', analytics['percentile90'].toStringAsFixed(2),
                  Icons.star, Colors.amber),
              _StatsCard('Completitud',
                  '${(analytics['completionRate'] * 100).toInt()}%',
                  Icons.check_circle, Colors.indigo),
            ],
          ),
          const SizedBox(height: 24),

          // Histograma
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('Distribución de Calificaciones',
                      style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 8),
                  const Text('Histograma de notas finales ponderadas',
                      style: TextStyle(color: Colors.grey, fontSize: 13)),
                  const SizedBox(height: 16),
                  SizedBox(
                    height: 220,
                    child: _buildHistogram(),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildHistogram() {
    final dist = analytics['scoreDistribution'] as Map<String, dynamic>;
    final labels = dist.keys.toList();
    final values = dist.values.map((v) => (v as int).toDouble()).toList();
    final maxVal = values.reduce((a, b) => a > b ? a : b);

    return BarChart(
      BarChartData(
        alignment: BarChartAlignment.spaceAround,
        maxY: maxVal + 2,
        barTouchData: BarTouchData(
          touchTooltipData: BarTouchTooltipData(
            getTooltipItem: (group, groupIndex, rod, rodIndex) {
              return BarTooltipItem(
                '${labels[groupIndex]}\n${rod.toY.toInt()} est.',
                const TextStyle(color: Colors.white),
              );
            },
          ),
        ),
        titlesData: FlTitlesData(
          bottomTitles: AxisTitles(
            sideTitles: SideTitles(
              showTitles: true,
              getTitlesWidget: (value, meta) {
                return Padding(
                  padding: const EdgeInsets.only(top: 4),
                  child: Text(labels[value.toInt()],
                      style: const TextStyle(fontSize: 10)),
                );
              },
              reservedSize: 28,
            ),
          ),
          leftTitles: AxisTitles(
            sideTitles: SideTitles(
              showTitles: true,
              reservedSize: 28,
              getTitlesWidget: (value, meta) => Text(
                value.toInt().toString(),
                style: const TextStyle(fontSize: 10),
              ),
            ),
          ),
          topTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
          rightTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
        ),
        gridData: FlGridData(
          horizontalInterval: 2,
          getDrawingHorizontalLine: (value) =>
              FlLine(color: Colors.grey[200]!, strokeWidth: 1),
        ),
        borderData: FlBorderData(show: false),
        barGroups: List.generate(values.length, (i) => BarChartGroupData(
          x: i,
          barRods: [BarChartRodData(
            toY: values[i],
            color: const Color(0xFF1565C0),
            width: 30,
            borderRadius: const BorderRadius.vertical(top: Radius.circular(4)),
          )],
        )),
      ),
    );
  }
}

/// Tab Criterios: Radar chart + Ranking
class _CriteriaTab extends StatelessWidget {
  final Map<String, dynamic> analytics;
  const _CriteriaTab({required this.analytics});

  @override
  Widget build(BuildContext context) {
    final criteriaMap = analytics['criteriaAverages'] as Map<String, dynamic>;
    final criteria = criteriaMap.values.toList();

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        children: [
          // Radar Chart
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                children: [
                  const Text('Radar de Competencias por Criterio',
                      style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 16),
                  SizedBox(
                    height: 280,
                    child: RadarChart(
                      RadarChartData(
                        dataSets: [
                          RadarDataSet(
                            fillColor: const Color(0xFF1565C0).withOpacity(0.2),
                            borderColor: const Color(0xFF1565C0),
                            borderWidth: 2,
                            entryRadius: 4,
                            dataEntries: criteria.map((c) => RadarEntry(
                              value: (c as Map)['average'].toDouble(),
                            )).toList(),
                          ),
                        ],
                        radarShape: RadarShape.polygon,
                        tickCount: 4,
                        ticksTextStyle: const TextStyle(fontSize: 9, color: Colors.grey),
                        radarBorderData: const BorderSide(color: Colors.grey),
                        tickBorderData: const BorderSide(color: Colors.grey),
                        gridBorderData: const BorderSide(color: Colors.grey, width: 0.5),
                        getTitle: (index, angle) {
                          final name = (criteria[index] as Map)['name'].toString();
                          return RadarChartTitle(text: name, angle: angle);
                        },
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),

          // Ranking de criterios
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('Ranking de Criterios (promedio del grupo)',
                      style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 12),
                  ...() {
                    final sorted = List<Map>.from(criteria)
                      ..sort((a, b) => (b['average'] as double)
                          .compareTo(a['average'] as double));
                    return sorted.asMap().entries.map((entry) {
                      final rank = entry.key + 1;
                      final c = entry.value;
                      final avg = (c['average'] as double);
                      final color = avg >= 3.5 ? Colors.green
                          : avg >= 2.5 ? Colors.orange
                          : Colors.red;

                      return Padding(
                        padding: const EdgeInsets.symmetric(vertical: 4),
                        child: Row(
                          children: [
                            CircleAvatar(
                              radius: 14,
                              backgroundColor: rank <= 1
                                  ? Colors.amber : Colors.grey[300],
                              child: Text('$rank',
                                  style: TextStyle(
                                    fontSize: 12,
                                    color: rank <= 1 ? Colors.white : Colors.black,
                                    fontWeight: FontWeight.bold,
                                  )),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(c['name'].toString(),
                                      style: const TextStyle(fontWeight: FontWeight.w500)),
                                  LinearProgressIndicator(
                                    value: avg / 4.0,
                                    backgroundColor: Colors.grey[200],
                                    valueColor: AlwaysStoppedAnimation<Color>(color),
                                  ),
                                ],
                              ),
                            ),
                            const SizedBox(width: 12),
                            Text(avg.toStringAsFixed(2),
                                style: TextStyle(
                                  fontWeight: FontWeight.bold,
                                  color: color,
                                )),
                          ],
                        ),
                      );
                    }).toList();
                  }(),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

/// Tab Equipos
class _TeamsTab extends StatelessWidget {
  final String processId;
  const _TeamsTab({required this.processId});

  @override
  Widget build(BuildContext context) {
    return const Padding(
      padding: EdgeInsets.all(16),
      child: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.groups, size: 64, color: Colors.grey),
            SizedBox(height: 16),
            Text('Analítica por Equipos',
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
            SizedBox(height: 8),
            Text('Seleccione un proceso activo con resultados consolidados.',
                textAlign: TextAlign.center,
                style: TextStyle(color: Colors.grey)),
          ],
        ),
      ),
    );
  }
}

class _StatsCard extends StatelessWidget {
  final String title;
  final String value;
  final IconData icon;
  final Color color;

  const _StatsCard(this.title, this.value, this.icon, this.color);

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(icon, color: color, size: 22),
            const SizedBox(height: 4),
            Text(value,
                style: TextStyle(
                    fontSize: 20, fontWeight: FontWeight.bold, color: color)),
            Text(title,
                style: const TextStyle(fontSize: 11, color: Colors.grey),
                textAlign: TextAlign.center),
          ],
        ),
      ),
    );
  }
}
