/// Provider de autenticación usando Riverpod

import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/user_model.dart';
import '../services/api_service.dart';

class AuthState {
  final bool isAuthenticated;
  final UserModel? user;
  final bool isLoading;
  final String? error;

  const AuthState({
    this.isAuthenticated = false,
    this.user,
    this.isLoading = false,
    this.error,
  });

  AuthState copyWith({
    bool? isAuthenticated,
    UserModel? user,
    bool? isLoading,
    String? error,
  }) {
    return AuthState(
      isAuthenticated: isAuthenticated ?? this.isAuthenticated,
      user: user ?? this.user,
      isLoading: isLoading ?? this.isLoading,
      error: error,
    );
  }
}

class AuthNotifier extends StateNotifier<AuthState> {
  final ApiService _api;

  AuthNotifier(this._api) : super(const AuthState()) {
    _checkAuth();
  }

  /// Verificar si hay sesión activa al iniciar
  Future<void> _checkAuth() async {
    final isAuth = await _api.isAuthenticated();
    if (isAuth) {
      try {
        final response = await _api.get('/users/me');
        final user = UserModel.fromJson(response.data['data']);
        state = AuthState(isAuthenticated: true, user: user);
      } catch (_) {
        state = const AuthState(isAuthenticated: false);
      }
    }
  }

  /// Iniciar sesión
  Future<void> login(String email, String password) async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      final response = await _api.post('/auth/login', data: {
        'email': email,
        'password': password,
      });

      final data = response.data['data'];
      await _api.saveTokens(data['accessToken'], data['refreshToken']);
      final user = UserModel.fromJson(data['user']);

      state = AuthState(isAuthenticated: true, user: user);
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: 'Credenciales inválidas. Verifique su email y contraseña.',
      );
    }
  }

  /// Cerrar sesión
  Future<void> logout() async {
    try {
      final token = await _api.getAccessToken();
      if (token != null) {
        await _api.post('/auth/logout', data: {'refreshToken': token});
      }
    } finally {
      await _api.clearTokens();
      state = const AuthState(isAuthenticated: false);
    }
  }
}

/// Providers
final apiServiceProvider = Provider<ApiService>((ref) => ApiService());

final authProvider = StateNotifierProvider<AuthNotifier, AuthState>((ref) {
  return AuthNotifier(ref.watch(apiServiceProvider));
});
