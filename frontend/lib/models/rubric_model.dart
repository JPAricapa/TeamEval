/// Modelos de Rúbrica, Criterio y Nivel de Desempeño

class RubricModel {
  final String id;
  final String name;
  final String? description;
  final int version;
  final bool isPublic;
  final bool isActive;
  final String creatorId;
  final List<CriteriaModel> criteria;
  final DateTime createdAt;

  const RubricModel({
    required this.id,
    required this.name,
    this.description,
    required this.version,
    required this.isPublic,
    required this.isActive,
    required this.creatorId,
    required this.criteria,
    required this.createdAt,
  });

  /// Puntaje máximo posible (promedio ponderado del nivel más alto)
  double get maxScore {
    if (criteria.isEmpty) return 0;
    final totalWeight = criteria.fold(0.0, (s, c) => s + c.weight);
    if (totalWeight == 0) return 0;
    double max = 0;
    for (final c in criteria) {
      final maxLevel = c.performanceLevels.fold<double>(
        0, (s, l) => l.score > s ? l.score : s);
      max += maxLevel * (c.weight / totalWeight);
    }
    return max;
  }

  factory RubricModel.fromJson(Map<String, dynamic> json) {
    return RubricModel(
      id: json['id'] as String,
      name: json['name'] as String,
      description: json['description'] as String?,
      version: json['version'] as int? ?? 1,
      isPublic: json['isPublic'] as bool? ?? false,
      isActive: json['isActive'] as bool? ?? true,
      creatorId: json['creatorId'] as String? ?? '',
      criteria: (json['criteria'] as List<dynamic>? ?? [])
          .map((c) => CriteriaModel.fromJson(c as Map<String, dynamic>))
          .toList(),
      createdAt: DateTime.parse(json['createdAt'] as String? ??
          DateTime.now().toIso8601String()),
    );
  }
}

class CriteriaModel {
  final String id;
  final String rubricId;
  final String name;
  final String? description;
  final double weight;
  final int order;
  final List<PerformanceLevelModel> performanceLevels;

  const CriteriaModel({
    required this.id,
    required this.rubricId,
    required this.name,
    this.description,
    required this.weight,
    required this.order,
    required this.performanceLevels,
  });

  factory CriteriaModel.fromJson(Map<String, dynamic> json) {
    return CriteriaModel(
      id: json['id'] as String,
      rubricId: json['rubricId'] as String? ?? '',
      name: json['name'] as String,
      description: json['description'] as String?,
      weight: (json['weight'] as num).toDouble(),
      order: json['order'] as int? ?? 0,
      performanceLevels: (json['performanceLevels'] as List<dynamic>? ?? [])
          .map((l) => PerformanceLevelModel.fromJson(l as Map<String, dynamic>))
          .toList()
          ..sort((a, b) => a.order.compareTo(b.order)),
    );
  }
}

class PerformanceLevelModel {
  final String id;
  final String criteriaId;
  final String name;
  final String? description;
  final double score;
  final int order;

  const PerformanceLevelModel({
    required this.id,
    required this.criteriaId,
    required this.name,
    this.description,
    required this.score,
    required this.order,
  });

  factory PerformanceLevelModel.fromJson(Map<String, dynamic> json) {
    return PerformanceLevelModel(
      id: json['id'] as String,
      criteriaId: json['criteriaId'] as String? ?? '',
      name: json['name'] as String,
      description: json['description'] as String?,
      score: (json['score'] as num).toDouble(),
      order: json['order'] as int? ?? 0,
    );
  }
}
