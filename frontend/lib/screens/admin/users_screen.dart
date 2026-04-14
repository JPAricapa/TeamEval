/// Pantalla de gestión de usuarios (Admin)

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../services/api_service.dart';
import '../../models/user_model.dart';

class UsersScreen extends ConsumerStatefulWidget {
  const UsersScreen({super.key});
  @override
  ConsumerState<UsersScreen> createState() => _UsersScreenState();
}

class _UsersScreenState extends ConsumerState<UsersScreen> {
  List<UserModel> _users = [];
  bool _isLoading = true;
  String _filter = '';

  @override
  void initState() { super.initState(); _load(); }

  Future<void> _load() async {
    try {
      final api = ref.read(apiServiceProvider);
      final response = await api.get('/users', queryParameters: {'limit': 50});
      final data = response.data['data'] as List;
      setState(() {
        _users = data.map((u) => UserModel.fromJson(u)).toList();
        _isLoading = false;
      });
    } catch (_) { setState(() => _isLoading = false); }
  }

  List<UserModel> get _filtered => _users.where((u) =>
    u.fullName.toLowerCase().contains(_filter.toLowerCase()) ||
    u.email.toLowerCase().contains(_filter.toLowerCase())).toList();

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Gestión de Usuarios')),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(16),
            child: TextField(
              decoration: const InputDecoration(
                hintText: 'Buscar por nombre o email...',
                prefixIcon: Icon(Icons.search),
              ),
              onChanged: (v) => setState(() => _filter = v),
            ),
          ),
          Expanded(
            child: _isLoading
                ? const Center(child: CircularProgressIndicator())
                : ListView.builder(
                    itemCount: _filtered.length,
                    itemBuilder: (ctx, i) {
                      final u = _filtered[i];
                      return ListTile(
                        leading: CircleAvatar(
                          backgroundColor: _roleColor(u.role).withOpacity(0.15),
                          child: Text(u.firstName[0],
                              style: TextStyle(color: _roleColor(u.role),
                                  fontWeight: FontWeight.bold)),
                        ),
                        title: Text(u.fullName),
                        subtitle: Text('${u.email} · ${u.role}'),
                        trailing: Switch(
                          value: u.isActive,
                          onChanged: (_) {},
                        ),
                      );
                    },
                  ),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () {},
        icon: const Icon(Icons.person_add),
        label: const Text('Nuevo usuario'),
      ),
    );
  }

  Color _roleColor(String role) {
    switch (role) {
      case 'ADMIN': return Colors.purple;
      case 'TEACHER': return Colors.blue;
      case 'STUDENT': return Colors.green;
      default: return Colors.grey;
    }
  }
}
