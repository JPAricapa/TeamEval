/// Configuración de navegación con go_router
/// Rutas protegidas por autenticación y rol

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../providers/auth_provider.dart';
import '../screens/auth/login_screen.dart';
import '../screens/admin/admin_dashboard.dart';
import '../screens/admin/users_screen.dart';
import '../screens/admin/institutions_screen.dart';
import '../screens/teacher/teacher_dashboard.dart';
import '../screens/teacher/courses_screen.dart';
import '../screens/teacher/rubrics_screen.dart';
import '../screens/teacher/evaluation_process_screen.dart';
import '../screens/teacher/analytics_screen.dart';
import '../screens/teacher/create_rubric_screen.dart';
import '../screens/student/student_dashboard.dart';
import '../screens/student/my_evaluations_screen.dart';
import '../screens/student/evaluation_form_screen.dart';
import '../screens/student/my_results_screen.dart';

/// Provider del router (reactivo al estado de auth)
final routerProvider = Provider<GoRouter>((ref) {
  final authState = ref.watch(authProvider);

  return GoRouter(
    initialLocation: '/login',
    redirect: (context, state) {
      final isLoggedIn = authState.isAuthenticated;
      final isLoginPage = state.matchedLocation == '/login';

      if (!isLoggedIn && !isLoginPage) return '/login';
      if (isLoggedIn && isLoginPage) {
        // Redirigir según rol
        switch (authState.user?.role) {
          case 'ADMIN':
            return '/admin';
          case 'TEACHER':
            return '/teacher';
          case 'STUDENT':
            return '/student';
          default:
            return '/login';
        }
      }
      return null;
    },
    routes: [
      // --------------------------------------------------------
      // Autenticación
      // --------------------------------------------------------
      GoRoute(
        path: '/login',
        name: 'login',
        builder: (context, state) => const LoginScreen(),
      ),

      // --------------------------------------------------------
      // Rutas del Administrador
      // --------------------------------------------------------
      ShellRoute(
        builder: (context, state, child) => AdminShell(child: child),
        routes: [
          GoRoute(
            path: '/admin',
            name: 'admin-dashboard',
            builder: (context, state) => const AdminDashboard(),
          ),
          GoRoute(
            path: '/admin/users',
            name: 'admin-users',
            builder: (context, state) => const UsersScreen(),
          ),
          GoRoute(
            path: '/admin/institutions',
            name: 'admin-institutions',
            builder: (context, state) => const InstitutionsScreen(),
          ),
        ],
      ),

      // --------------------------------------------------------
      // Rutas del Docente
      // --------------------------------------------------------
      ShellRoute(
        builder: (context, state, child) => TeacherShell(child: child),
        routes: [
          GoRoute(
            path: '/teacher',
            name: 'teacher-dashboard',
            builder: (context, state) => const TeacherDashboard(),
          ),
          GoRoute(
            path: '/teacher/courses',
            name: 'teacher-courses',
            builder: (context, state) => const CoursesScreen(),
          ),
          GoRoute(
            path: '/teacher/rubrics',
            name: 'teacher-rubrics',
            builder: (context, state) => const RubricsScreen(),
          ),
          GoRoute(
            path: '/teacher/rubrics/create',
            name: 'create-rubric',
            builder: (context, state) => const CreateRubricScreen(),
          ),
          GoRoute(
            path: '/teacher/processes/:courseId',
            name: 'evaluation-processes',
            builder: (context, state) => EvaluationProcessScreen(
              courseId: state.pathParameters['courseId']!,
            ),
          ),
          GoRoute(
            path: '/teacher/analytics/:processId',
            name: 'analytics',
            builder: (context, state) => AnalyticsScreen(
              processId: state.pathParameters['processId']!,
            ),
          ),
        ],
      ),

      // --------------------------------------------------------
      // Rutas del Estudiante
      // --------------------------------------------------------
      ShellRoute(
        builder: (context, state, child) => StudentShell(child: child),
        routes: [
          GoRoute(
            path: '/student',
            name: 'student-dashboard',
            builder: (context, state) => const StudentDashboard(),
          ),
          GoRoute(
            path: '/student/evaluations',
            name: 'my-evaluations',
            builder: (context, state) => const MyEvaluationsScreen(),
          ),
          GoRoute(
            path: '/student/evaluations/:evaluationId',
            name: 'evaluation-form',
            builder: (context, state) => EvaluationFormScreen(
              evaluationId: state.pathParameters['evaluationId']!,
            ),
          ),
          GoRoute(
            path: '/student/results',
            name: 'my-results',
            builder: (context, state) => const MyResultsScreen(),
          ),
        ],
      ),
    ],
  );
});

// ============================================================
// Shells de navegación (contienen el drawer/nav lateral)
// ============================================================

class AdminShell extends StatelessWidget {
  final Widget child;
  const AdminShell({super.key, required this.child});

  @override
  Widget build(BuildContext context) {
    return _AppShell(
      title: 'TeamEval - Administrador',
      navItems: const [
        _NavItem(icon: Icons.dashboard, label: 'Dashboard', route: '/admin'),
        _NavItem(icon: Icons.people, label: 'Usuarios', route: '/admin/users'),
        _NavItem(icon: Icons.business, label: 'Instituciones', route: '/admin/institutions'),
      ],
      child: child,
    );
  }
}

class TeacherShell extends StatelessWidget {
  final Widget child;
  const TeacherShell({super.key, required this.child});

  @override
  Widget build(BuildContext context) {
    return _AppShell(
      title: 'TeamEval - Docente',
      navItems: const [
        _NavItem(icon: Icons.dashboard, label: 'Dashboard', route: '/teacher'),
        _NavItem(icon: Icons.school, label: 'Mis Cursos', route: '/teacher/courses'),
        _NavItem(icon: Icons.assignment, label: 'Rúbricas', route: '/teacher/rubrics'),
        _NavItem(icon: Icons.analytics, label: 'Analítica', route: '/teacher/analytics/'),
      ],
      child: child,
    );
  }
}

class StudentShell extends StatelessWidget {
  final Widget child;
  const StudentShell({super.key, required this.child});

  @override
  Widget build(BuildContext context) {
    return _AppShell(
      title: 'TeamEval - Estudiante',
      navItems: const [
        _NavItem(icon: Icons.dashboard, label: 'Dashboard', route: '/student'),
        _NavItem(icon: Icons.rate_review, label: 'Mis Evaluaciones', route: '/student/evaluations'),
        _NavItem(icon: Icons.bar_chart, label: 'Mis Resultados', route: '/student/results'),
      ],
      child: child,
    );
  }
}

class _NavItem {
  final IconData icon;
  final String label;
  final String route;
  const _NavItem({required this.icon, required this.label, required this.route});
}

/// Shell base con NavigationDrawer responsivo
class _AppShell extends StatelessWidget {
  final String title;
  final List<_NavItem> navItems;
  final Widget child;

  const _AppShell({
    required this.title,
    required this.navItems,
    required this.child,
  });

  @override
  Widget build(BuildContext context) {
    final isWide = MediaQuery.of(context).size.width > 800;

    return Scaffold(
      appBar: isWide
          ? null
          : AppBar(
              title: Text(title),
              backgroundColor: const Color(0xFF1565C0),
              foregroundColor: Colors.white,
            ),
      drawer: isWide ? null : _buildDrawer(context),
      body: isWide
          ? Row(
              children: [
                _buildNavRail(context),
                const VerticalDivider(width: 1),
                Expanded(child: child),
              ],
            )
          : child,
    );
  }

  Widget _buildDrawer(BuildContext context) {
    return Drawer(
      child: Column(
        children: [
          DrawerHeader(
            decoration: const BoxDecoration(color: Color(0xFF1565C0)),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisAlignment: MainAxisAlignment.end,
              children: [
                const Icon(Icons.groups, color: Colors.white, size: 40),
                const SizedBox(height: 8),
                Text(title,
                    style: const TextStyle(color: Colors.white, fontSize: 16)),
              ],
            ),
          ),
          ...navItems.map((item) => ListTile(
                leading: Icon(item.icon),
                title: Text(item.label),
                onTap: () {
                  Navigator.pop(context);
                  context.go(item.route);
                },
              )),
          const Spacer(),
          ListTile(
            leading: const Icon(Icons.logout, color: Colors.red),
            title: const Text('Cerrar sesión',
                style: TextStyle(color: Colors.red)),
            onTap: () => context.go('/login'),
          ),
        ],
      ),
    );
  }

  Widget _buildNavRail(BuildContext context) {
    return NavigationRail(
      selectedIndex: _getSelectedIndex(context),
      onDestinationSelected: (index) {
        context.go(navItems[index].route);
      },
      labelType: NavigationRailLabelType.all,
      destinations: navItems
          .map((item) => NavigationRailDestination(
                icon: Icon(item.icon),
                label: Text(item.label),
              ))
          .toList(),
      trailing: Column(
        children: [
          const Divider(),
          IconButton(
            icon: const Icon(Icons.logout, color: Colors.red),
            onPressed: () => context.go('/login'),
            tooltip: 'Cerrar sesión',
          ),
        ],
      ),
    );
  }

  int _getSelectedIndex(BuildContext context) {
    final location = GoRouterState.of(context).matchedLocation;
    for (int i = 0; i < navItems.length; i++) {
      if (location.startsWith(navItems[i].route)) return i;
    }
    return 0;
  }
}
