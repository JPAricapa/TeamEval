/// Pantalla de inicio de sesión
/// Login con email/contraseña + validación

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../providers/auth_provider.dart';

class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({super.key});

  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen> {
  final _formKey = GlobalKey<FormState>();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  bool _obscurePassword = true;

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  Future<void> _login() async {
    if (!_formKey.currentState!.validate()) return;

    await ref.read(authProvider.notifier).login(
      _emailController.text.trim(),
      _passwordController.text,
    );

    final authState = ref.read(authProvider);
    if (authState.isAuthenticated && mounted) {
      switch (authState.user?.role) {
        case 'ADMIN':
          context.go('/admin');
          break;
        case 'TEACHER':
          context.go('/teacher');
          break;
        case 'STUDENT':
          context.go('/student');
          break;
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final authState = ref.watch(authProvider);
    final screenSize = MediaQuery.of(context).size;
    final isWide = screenSize.width > 700;

    return Scaffold(
      backgroundColor: const Color(0xFFF5F7FA),
      body: isWide ? _buildWideLayout() : _buildNarrowLayout(),
    );
  }

  Widget _buildWideLayout() {
    return Row(
      children: [
        // Panel izquierdo (decorativo)
        Expanded(
          flex: 2,
          child: Container(
            decoration: const BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: [Color(0xFF1565C0), Color(0xFF003C8F)],
              ),
            ),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Icon(Icons.groups, size: 100, color: Colors.white),
                const SizedBox(height: 24),
                const Text(
                  'TeamEval',
                  style: TextStyle(
                    color: Colors.white,
                    fontSize: 40,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 12),
                const Padding(
                  padding: EdgeInsets.symmetric(horizontal: 40),
                  child: Text(
                    'Plataforma de Evaluación y Analítica\nde Trabajo en Equipo',
                    style: TextStyle(color: Colors.white70, fontSize: 16),
                    textAlign: TextAlign.center,
                  ),
                ),
                const SizedBox(height: 40),
                _FeatureChip(icon: Icons.analytics, label: 'Analítica avanzada'),
                const SizedBox(height: 8),
                _FeatureChip(icon: Icons.assessment, label: 'Rúbricas configurables'),
                const SizedBox(height: 8),
                _FeatureChip(icon: Icons.people, label: 'Multi-rol institucional'),
              ],
            ),
          ),
        ),
        // Panel derecho (formulario)
        Expanded(
          flex: 3,
          child: Center(
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 400),
              child: _buildLoginForm(),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildNarrowLayout() {
    return SingleChildScrollView(
      child: Column(
        children: [
          Container(
            height: 200,
            width: double.infinity,
            decoration: const BoxDecoration(
              gradient: LinearGradient(
                colors: [Color(0xFF1565C0), Color(0xFF003C8F)],
              ),
            ),
            child: const Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(Icons.groups, size: 60, color: Colors.white),
                SizedBox(height: 8),
                Text('TeamEval',
                    style: TextStyle(color: Colors.white, fontSize: 28,
                        fontWeight: FontWeight.bold)),
              ],
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(24),
            child: _buildLoginForm(),
          ),
        ],
      ),
    );
  }

  Widget _buildLoginForm() {
    final authState = ref.watch(authProvider);

    return Card(
      elevation: 4,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Form(
          key: _formKey,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const Text(
                'Iniciar Sesión',
                style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 8),
              const Text(
                'Accede con tus credenciales institucionales',
                style: TextStyle(color: Colors.grey),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 32),

              // Error message
              if (authState.error != null) ...[
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: Colors.red[50],
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: Colors.red[300]!),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.error_outline, color: Colors.red),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(authState.error!,
                            style: const TextStyle(color: Colors.red)),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 16),
              ],

              // Email
              TextFormField(
                controller: _emailController,
                keyboardType: TextInputType.emailAddress,
                decoration: const InputDecoration(
                  labelText: 'Correo institucional',
                  prefixIcon: Icon(Icons.email_outlined),
                ),
                validator: (v) {
                  if (v == null || v.isEmpty) return 'Email requerido';
                  if (!RegExp(r'^[^@]+@[^@]+\.[^@]+').hasMatch(v)) {
                    return 'Email inválido';
                  }
                  return null;
                },
              ),
              const SizedBox(height: 16),

              // Contraseña
              TextFormField(
                controller: _passwordController,
                obscureText: _obscurePassword,
                decoration: InputDecoration(
                  labelText: 'Contraseña',
                  prefixIcon: const Icon(Icons.lock_outlined),
                  suffixIcon: IconButton(
                    icon: Icon(_obscurePassword
                        ? Icons.visibility_outlined
                        : Icons.visibility_off_outlined),
                    onPressed: () =>
                        setState(() => _obscurePassword = !_obscurePassword),
                  ),
                ),
                validator: (v) {
                  if (v == null || v.isEmpty) return 'Contraseña requerida';
                  return null;
                },
                onFieldSubmitted: (_) => _login(),
              ),
              const SizedBox(height: 24),

              // Botón
              ElevatedButton(
                onPressed: authState.isLoading ? null : _login,
                style: ElevatedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(8),
                  ),
                ),
                child: authState.isLoading
                    ? const SizedBox(
                        height: 20, width: 20,
                        child: CircularProgressIndicator(
                          strokeWidth: 2, color: Colors.white,
                        ),
                      )
                    : const Text('Ingresar',
                        style: TextStyle(fontSize: 16)),
              ),

              const SizedBox(height: 16),
              const Text(
                'Plataforma de uso institucional.\nSi no tienes credenciales, contacta al administrador.',
                style: TextStyle(fontSize: 12, color: Colors.grey),
                textAlign: TextAlign.center,
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _FeatureChip extends StatelessWidget {
  final IconData icon;
  final String label;
  const _FeatureChip({required this.icon, required this.label});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.15),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, color: Colors.white, size: 18),
          const SizedBox(width: 8),
          Text(label, style: const TextStyle(color: Colors.white)),
        ],
      ),
    );
  }
}
