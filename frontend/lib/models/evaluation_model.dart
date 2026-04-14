/// Modelos de Evaluación, Proceso y Resultados

class EvaluationProcessModel {
  final String id;
  final String courseId;
  final String rubricId;
  final String name;
  final String? description;
  final String status;
  final DateTime? startDate;
  final DateTime? endDate;
  final double selfWeight;
  final double peerWeight;
  final double teacherWeight;
  final bool includeSelf;
  final bool includePeer;
  final bool includeTeacher;

  const EvaluationProcessModel({
    required this.id,
    required this.courseId,
    required this.rubricId,
    required this.name,
    this.description,
    required this.status,
    this.startDate,
    this.endDate,
    required this.selfWeight,
    required this.peerWeight,
    required this.teacherWeight,
    required this.includeSelf,
    required this.includePeer,
    required this.includeTeacher,
  });

  bool get isActive => status == 'ACTIVE';
  bool get isExpired => endDate != null && DateTime.now().isAfter(endDate!);

  factory EvaluationProcessModel.fromJson(Map<String, dynamic> json) {
    return EvaluationProcessModel(
      id: json['id'] as String,
      courseId: json['courseId'] as String,
      rubricId: json['rubricId'] as String,
      name: json['name'] as String,
      description: json['description'] as String?,
      status: json['status'] as String,
      startDate: json['startDate'] != null
          ? DateTime.parse(json['startDate'] as String) : null,
      endDate: json['endDate'] != null
          ? DateTime.parse(json['endDate'] as String) : null,
      selfWeight: (json['selfWeight'] as num).toDouble(),
      peerWeight: (json['peerWeight'] as num).toDouble(),
      teacherWeight: (json['teacherWeight'] as num).toDouble(),
      includeSelf: json['includeSelf'] as bool? ?? true,
      includePeer: json['includePeer'] as bool? ?? true,
      includeTeacher: json['includeTeacher'] as bool? ?? true,
    );
  }
}

class EvaluationModel {
  final String id;
  final String processId;
  final String evaluatorId;
  final String evaluatedId;
  final String type; // SELF, PEER, TEACHER
  final String status; // PENDING, IN_PROGRESS, COMPLETED
  final String? generalComment;
  final DateTime? submittedAt;
  final Map<String, dynamic>? evaluatedUser;
  final Map<String, dynamic>? process;
  final List<EvaluationScoreModel> scores;

  const EvaluationModel({
    required this.id,
    required this.processId,
    required this.evaluatorId,
    required this.evaluatedId,
    required this.type,
    required this.status,
    this.generalComment,
    this.submittedAt,
    this.evaluatedUser,
    this.process,
    required this.scores,
  });

  bool get isPending => status == 'PENDING' || status == 'IN_PROGRESS';
  bool get isCompleted => status == 'COMPLETED';

  String get typeName {
    switch (type) {
      case 'SELF': return 'Autoevaluación';
      case 'PEER': return 'Coevaluación';
      case 'TEACHER': return 'Evaluación Docente';
      default: return type;
    }
  }

  factory EvaluationModel.fromJson(Map<String, dynamic> json) {
    return EvaluationModel(
      id: json['id'] as String,
      processId: json['processId'] as String,
      evaluatorId: json['evaluatorId'] as String,
      evaluatedId: json['evaluatedId'] as String,
      type: json['type'] as String,
      status: json['status'] as String,
      generalComment: json['generalComment'] as String?,
      submittedAt: json['submittedAt'] != null
          ? DateTime.parse(json['submittedAt'] as String) : null,
      evaluatedUser: json['evaluated'] as Map<String, dynamic>?,
      process: json['process'] as Map<String, dynamic>?,
      scores: (json['scores'] as List<dynamic>? ?? [])
          .map((s) => EvaluationScoreModel.fromJson(s as Map<String, dynamic>))
          .toList(),
    );
  }
}

class EvaluationScoreModel {
  final String id;
  final String evaluationId;
  final String criteriaId;
  final double score;
  final String? comment;

  const EvaluationScoreModel({
    required this.id,
    required this.evaluationId,
    required this.criteriaId,
    required this.score,
    this.comment,
  });

  factory EvaluationScoreModel.fromJson(Map<String, dynamic> json) {
    return EvaluationScoreModel(
      id: json['id'] as String,
      evaluationId: json['evaluationId'] as String,
      criteriaId: json['criteriaId'] as String,
      score: (json['score'] as num).toDouble(),
      comment: json['comment'] as String?,
    );
  }
}

class ConsolidatedResultModel {
  final String studentId;
  final String? teamId;
  final double? selfScore;
  final double? peerScore;
  final double? teacherScore;
  final double? finalScore;
  final double? overvaluationIndex;
  final Map<String, double>? criteriaScores;
  final Map<String, String>? student;
  final Map<String, String>? team;

  const ConsolidatedResultModel({
    required this.studentId,
    this.teamId,
    this.selfScore,
    this.peerScore,
    this.teacherScore,
    this.finalScore,
    this.overvaluationIndex,
    this.criteriaScores,
    this.student,
    this.team,
  });

  factory ConsolidatedResultModel.fromJson(Map<String, dynamic> json) {
    return ConsolidatedResultModel(
      studentId: json['studentId'] as String,
      teamId: json['teamId'] as String?,
      selfScore: (json['selfScore'] as num?)?.toDouble(),
      peerScore: (json['peerScore'] as num?)?.toDouble(),
      teacherScore: (json['teacherScore'] as num?)?.toDouble(),
      finalScore: (json['finalScore'] as num?)?.toDouble(),
      overvaluationIndex: (json['overvaluationIndex'] as num?)?.toDouble(),
      criteriaScores: (json['criteriaScores'] as Map<String, dynamic>?)
          ?.map((k, v) => MapEntry(k, (v as num).toDouble())),
      student: (json['student'] as Map<String, dynamic>?)
          ?.map((k, v) => MapEntry(k, v.toString())),
      team: (json['team'] as Map<String, dynamic>?)
          ?.map((k, v) => MapEntry(k, v.toString())),
    );
  }
}
