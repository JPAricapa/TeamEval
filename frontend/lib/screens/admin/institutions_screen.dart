/// Pantalla de Instituciones (Admin)

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

class InstitutionsScreen extends ConsumerWidget {
  const InstitutionsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Scaffold(
      appBar: AppBar(title: const Text('Instituciones')),
      body: const Center(child: Text('Gestión de Instituciones')),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () {},
        icon: const Icon(Icons.add_business),
        label: const Text('Nueva institución'),
      ),
    );
  }
}
