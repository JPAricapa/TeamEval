/// Modelo de Usuario

class UserModel {
  final String id;
  final String email;
  final String firstName;
  final String lastName;
  final String role;
  final String? institutionId;
  final bool isActive;

  const UserModel({
    required this.id,
    required this.email,
    required this.firstName,
    required this.lastName,
    required this.role,
    this.institutionId,
    this.isActive = true,
  });

  String get fullName => '$firstName $lastName';

  factory UserModel.fromJson(Map<String, dynamic> json) {
    return UserModel(
      id: json['id'] as String,
      email: json['email'] as String,
      firstName: json['firstName'] as String,
      lastName: json['lastName'] as String,
      role: json['role'] as String,
      institutionId: json['institutionId'] as String?,
      isActive: json['isActive'] as bool? ?? true,
    );
  }

  Map<String, dynamic> toJson() => {
    'id': id, 'email': email, 'firstName': firstName,
    'lastName': lastName, 'role': role,
    'institutionId': institutionId, 'isActive': isActive,
  };
}

/// Modelo de autenticación
class AuthModel {
  final String accessToken;
  final String refreshToken;
  final UserModel user;

  const AuthModel({
    required this.accessToken,
    required this.refreshToken,
    required this.user,
  });

  factory AuthModel.fromJson(Map<String, dynamic> json) {
    return AuthModel(
      accessToken: json['accessToken'] as String,
      refreshToken: json['refreshToken'] as String,
      user: UserModel.fromJson(json['user'] as Map<String, dynamic>),
    );
  }
}
