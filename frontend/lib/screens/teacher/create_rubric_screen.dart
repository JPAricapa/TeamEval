/// Pantalla de creación de rúbrica con criterios y niveles dinámicos

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../services/api_service.dart';

class CreateRubricScreen extends ConsumerStatefulWidget {
  const CreateRubricScreen({super.key});

  @override
  ConsumerState<CreateRubricScreen> createState() => _CreateRubricScreenState();
}

class _CreateRubricScreenState extends ConsumerState<CreateRubricScreen> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _descController = TextEditingController();
  bool _isPublic = false;
  bool _isSaving = false;

  // Lista de criterios dinámicos
  final List<_CriterionData> _criteria = [];

  @override
  void initState() {
    super.initState();
    // Agregar criterios base de la rúbrica oficial
    _criteria.addAll([
      _CriterionData(name: 'Contribución', weight: 1.0),
      _CriterionData(name: 'Roles', weight: 1.0),
      _CriterionData(name: 'Comunicación Interna', weight: 1.0),
    ]);
  }

  @override
  void dispose() {
    _nameController.dispose();
    _descController.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    if (!_formKey.currentState!.validate()) return;
    if (_criteria.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Agregue al menos un criterio')),
      );
      return;
    }

    setState(() => _isSaving = true);
    try {
      final api = ref.read(apiServiceProvider);
      await api.post('/rubrics', data: {
        'name': _nameController.text,
        'description': _descController.text,
        'isPublic': _isPublic,
        'criteria': _criteria.map((c) => {
          'name': c.name,
          'description': c.description,
          'weight': c.weight,
          'order': _criteria.indexOf(c),
          'performanceLevels': [
            {'name': 'Proficiente', 'score': 4, 'order': 1, 'description': c.level4},
            {'name': 'Aceptable', 'score': 3, 'order': 2, 'description': c.level3},
            {'name': 'Principiante', 'score': 2, 'order': 3, 'description': c.level2},
            {'name': 'Necesita mejorar', 'score': 1, 'order': 4, 'description': c.level1},
          ]
        }).toList()
      });

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('✅ Rúbrica creada exitosamente'),
              backgroundColor: Colors.green),
        );
        context.go('/teacher/rubrics');
      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Error: $e'), backgroundColor: Colors.red),
      );
    } finally {
      if (mounted) setState(() => _isSaving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Crear Rúbrica'),
        actions: [
          TextButton(
            onPressed: _isSaving ? null : _save,
            child: _isSaving
                ? const SizedBox(width: 20, height: 20,
                    child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                : const Text('Guardar', style: TextStyle(color: Colors.white)),
          ),
        ],
      ),
      body: Form(
        key: _formKey,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            // Información básica
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('Información General',
                        style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                    const SizedBox(height: 12),
                    TextFormField(
                      controller: _nameController,
                      decoration: const InputDecoration(labelText: 'Nombre de la rúbrica *'),
                      validator: (v) => v!.isEmpty ? 'Requerido' : null,
                    ),
                    const SizedBox(height: 12),
                    TextFormField(
                      controller: _descController,
                      maxLines: 2,
                      decoration: const InputDecoration(labelText: 'Descripción'),
                    ),
                    const SizedBox(height: 8),
                    SwitchListTile(
                      title: const Text('Rúbrica pública'),
                      subtitle: const Text('Otros docentes podrán usar esta rúbrica'),
                      value: _isPublic,
                      onChanged: (v) => setState(() => _isPublic = v),
                      contentPadding: EdgeInsets.zero,
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 16),

            // Criterios
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text('Criterios de Evaluación',
                    style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                TextButton.icon(
                  icon: const Icon(Icons.add),
                  label: const Text('Agregar Criterio'),
                  onPressed: () => setState(() => _criteria.add(_CriterionData())),
                ),
              ],
            ),
            const SizedBox(height: 8),
            ..._criteria.asMap().entries.map((entry) => _CriterionEditor(
              index: entry.key,
              data: entry.value,
              onRemove: () => setState(() => _criteria.removeAt(entry.key)),
              onChanged: () => setState(() {}),
            )),

            const SizedBox(height: 80),
          ],
        ),
      ),
    );
  }
}

class _CriterionData {
  String name;
  String? description;
  double weight;
  String level4;
  String level3;
  String level2;
  String level1;

  _CriterionData({
    this.name = '',
    this.description,
    this.weight = 1.0,
    this.level4 = '',
    this.level3 = '',
    this.level2 = '',
    this.level1 = '',
  });
}

class _CriterionEditor extends StatelessWidget {
  final int index;
  final _CriterionData data;
  final VoidCallback onRemove;
  final VoidCallback onChanged;

  const _CriterionEditor({
    required this.index,
    required this.data,
    required this.onRemove,
    required this.onChanged,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: ExpansionTile(
        leading: CircleAvatar(
          backgroundColor: const Color(0xFF1565C0).withOpacity(0.1),
          child: Text('${index + 1}',
              style: const TextStyle(color: Color(0xFF1565C0), fontWeight: FontWeight.bold)),
        ),
        title: Text(data.name.isEmpty ? 'Criterio ${index + 1}' : data.name),
        subtitle: Text('Peso: ${data.weight.toStringAsFixed(1)}'),
        trailing: IconButton(
          icon: const Icon(Icons.delete, color: Colors.red),
          onPressed: onRemove,
        ),
        children: [
          Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              children: [
                TextField(
                  controller: TextEditingController(text: data.name),
                  decoration: const InputDecoration(labelText: 'Nombre del criterio *'),
                  onChanged: (v) { data.name = v; onChanged(); },
                ),
                const SizedBox(height: 8),
                TextField(
                  decoration: const InputDecoration(labelText: 'Descripción'),
                  onChanged: (v) => data.description = v,
                ),
                const SizedBox(height: 8),
                Row(
                  children: [
                    const Text('Peso: ', style: TextStyle(fontWeight: FontWeight.w500)),
                    Expanded(child: Slider(
                      value: data.weight, min: 0.5, max: 3.0, divisions: 5,
                      label: data.weight.toStringAsFixed(1),
                      onChanged: (v) { data.weight = v; onChanged(); },
                    )),
                    Text(data.weight.toStringAsFixed(1)),
                  ],
                ),
                const Divider(),
                const Text('Niveles de Desempeño',
                    style: TextStyle(fontWeight: FontWeight.bold)),
                const SizedBox(height: 8),
                _levelField('4 - Proficiente', Colors.green,
                    (v) => data.level4 = v),
                _levelField('3 - Aceptable', Colors.blue,
                    (v) => data.level3 = v),
                _levelField('2 - Principiante', Colors.orange,
                    (v) => data.level2 = v),
                _levelField('1 - Necesita mejorar', Colors.red,
                    (v) => data.level1 = v),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _levelField(String label, Color color, Function(String) onChanged) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: TextField(
        maxLines: 2,
        decoration: InputDecoration(
          labelText: label,
          labelStyle: TextStyle(color: color),
          border: OutlineInputBorder(
            borderSide: BorderSide(color: color.withOpacity(0.5)),
          ),
          focusedBorder: OutlineInputBorder(
            borderSide: BorderSide(color: color),
          ),
        ),
        onChanged: onChanged,
      ),
    );
  }
}
