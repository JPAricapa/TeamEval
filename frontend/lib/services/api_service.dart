/// Servicio base de comunicación con la API REST
/// Maneja: autenticación, headers, refresh de tokens, interceptores

import 'dart:convert';
import 'package:dio/dio.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class ApiService {
  static const String _baseUrl = 'http://localhost:3000/api/v1';
  static const String _accessTokenKey = 'access_token';
  static const String _refreshTokenKey = 'refresh_token';

  late final Dio _dio;
  final _storage = const FlutterSecureStorage();

  static final ApiService _instance = ApiService._internal();
  factory ApiService() => _instance;

  ApiService._internal() {
    _dio = Dio(BaseOptions(
      baseUrl: _baseUrl,
      connectTimeout: const Duration(seconds: 30),
      receiveTimeout: const Duration(seconds: 30),
      headers: {'Content-Type': 'application/json'},
    ));

    _setupInterceptors();
  }

  void _setupInterceptors() {
    _dio.interceptors.add(
      InterceptorsWrapper(
        // Agregar token a cada solicitud
        onRequest: (options, handler) async {
          final token = await _storage.read(key: _accessTokenKey);
          if (token != null) {
            options.headers['Authorization'] = 'Bearer $token';
          }
          return handler.next(options);
        },

        // Manejar respuestas
        onResponse: (response, handler) => handler.next(response),

        // Manejar errores (incluyendo refresh automático)
        onError: (error, handler) async {
          if (error.response?.statusCode == 401) {
            try {
              await _refreshToken();
              // Reintentar la solicitud original
              final token = await _storage.read(key: _accessTokenKey);
              error.requestOptions.headers['Authorization'] = 'Bearer $token';
              final response = await _dio.fetch(error.requestOptions);
              return handler.resolve(response);
            } catch (_) {
              await clearTokens();
            }
          }
          return handler.next(error);
        },
      ),
    );
  }

  // ============================================================
  // MÉTODOS HTTP
  // ============================================================

  Future<Response> get(String path, {Map<String, dynamic>? queryParameters}) {
    return _dio.get(path, queryParameters: queryParameters);
  }

  Future<Response> post(String path, {dynamic data}) {
    return _dio.post(path, data: data);
  }

  Future<Response> put(String path, {dynamic data}) {
    return _dio.put(path, data: data);
  }

  Future<Response> patch(String path, {dynamic data}) {
    return _dio.patch(path, data: data);
  }

  Future<Response> delete(String path) {
    return _dio.delete(path);
  }

  // ============================================================
  // GESTIÓN DE TOKENS
  // ============================================================

  Future<void> saveTokens(String accessToken, String refreshToken) async {
    await _storage.write(key: _accessTokenKey, value: accessToken);
    await _storage.write(key: _refreshTokenKey, value: refreshToken);
  }

  Future<String?> getAccessToken() => _storage.read(key: _accessTokenKey);

  Future<void> clearTokens() async {
    await _storage.delete(key: _accessTokenKey);
    await _storage.delete(key: _refreshTokenKey);
  }

  Future<bool> isAuthenticated() async {
    final token = await _storage.read(key: _accessTokenKey);
    return token != null;
  }

  Future<void> _refreshToken() async {
    final refreshToken = await _storage.read(key: _refreshTokenKey);
    if (refreshToken == null) throw Exception('No hay refresh token');

    final response = await _dio.post('/auth/refresh',
        data: {'refreshToken': refreshToken});

    final data = response.data['data'];
    await saveTokens(data['accessToken'], data['refreshToken']);
  }
}
