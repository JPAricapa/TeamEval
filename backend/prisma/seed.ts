/**
 * ============================================================
 * SEED DE BASE DE DATOS - TeamEval Platform
 *
 * Incluye las rúbricas de evaluación de trabajo en equipo
 * con los criterios y niveles extraídos del archivo Excel:
 * "rubrica evaluacion trabajo en equipo.xlsx"
 *
 * Rúbrica 1: Evaluación por Pares (coevaluación)
 *   - Contribución
 *   - Roles
 *   - Comunicación Interna
 *
 * Rúbrica 2: Heteroevaluación Docente
 *   - Metas
 *   - Decisiones del Equipo
 *   - Registros de Control
 *
 * Rúbrica 3: Autoevaluación (combinada)
 * ============================================================
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { UserRole } from '../src/constants/enums';

const prisma = new PrismaClient();

// Niveles de desempeño base (igual para todas las rúbricas)
const PERFORMANCE_LEVELS = [
  { name: 'Proficiente',     score: 4, order: 1, description: 'Desempeño sobresaliente y constante.' },
  { name: 'Aceptable',       score: 3, order: 2, description: 'Desempeño satisfactorio.' },
  { name: 'Principiante',    score: 2, order: 3, description: 'Desempeño básico con oportunidades de mejora.' },
  { name: 'Necesita mejorar', score: 1, order: 4, description: 'Desempeño deficiente, requiere intervención.' }
];

async function main() {
  console.log('🌱 Iniciando seed de la base de datos...\n');

  // ============================================================
  // INSTITUCIÓN
  // ============================================================
  const institution = await prisma.institution.upsert({
    where: { code: 'DEMO' },
    update: {},
    create: {
      name: 'Institución Demo',
      code: 'DEMO'
    }
  });
  console.log('✅ Institución creada:', institution.name);

  // ============================================================
  // PERÍODO ACADÉMICO
  // ============================================================
  const period = await prisma.academicPeriod.upsert({
    where: { code: '2024-2' },
    update: {},
    create: {
      name: 'Semestre 2024-2',
      code: '2024-2',
      startDate: new Date('2024-08-01'),
      endDate: new Date('2024-12-15'),
      isActive: true
    }
  });
  console.log('✅ Período académico creado:', period.name);

  // ============================================================
  // USUARIOS
  // ============================================================
  const passwordHash = await bcrypt.hash('TeamEval2024!', 12);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@teameval.edu.co' },
    update: {},
    create: {
      email: 'admin@teameval.edu.co',
      passwordHash,
      firstName: 'Administrador',
      lastName: 'Sistema',
      role: UserRole.ADMIN,
      institutionId: institution.id
    }
  });

  const teacher = await prisma.user.upsert({
    where: { email: 'docente@teameval.edu.co' },
    update: {},
    create: {
      email: 'docente@teameval.edu.co',
      passwordHash,
      firstName: 'Jorge',
      lastName: 'Aldana',
      role: UserRole.TEACHER,
      institutionId: institution.id
    }
  });

  // Estudiantes de ejemplo. La contraseña de cada estudiante es su cédula (nationalId).
  const studentSeeds = [
    { email: 'est1@teameval.edu.co', nationalId: '1000000001', firstName: 'Ana', lastName: 'García' },
    { email: 'est2@teameval.edu.co', nationalId: '1000000002', firstName: 'Carlos', lastName: 'López' },
    { email: 'est3@teameval.edu.co', nationalId: '1000000003', firstName: 'María', lastName: 'Martínez' },
    { email: 'est4@teameval.edu.co', nationalId: '1000000004', firstName: 'Juan', lastName: 'Rodríguez' },
    { email: 'est5@teameval.edu.co', nationalId: '1000000005', firstName: 'Laura', lastName: 'Hernández' },
    { email: 'est6@teameval.edu.co', nationalId: '1000000006', firstName: 'Pedro', lastName: 'González' }
  ];

  const students = [];
  for (const s of studentSeeds) {
    const studentPasswordHash = await bcrypt.hash(s.nationalId, 12);
    const student = await prisma.user.upsert({
      where: { email: s.email },
      update: { nationalId: s.nationalId, passwordHash: studentPasswordHash },
      create: {
        email: s.email,
        nationalId: s.nationalId,
        passwordHash: studentPasswordHash,
        firstName: s.firstName,
        lastName: s.lastName,
        role: UserRole.STUDENT,
        institutionId: institution.id
      }
    });
    students.push(student);
  }
  console.log(`✅ ${students.length + 2} usuarios creados (admin, docente, ${students.length} estudiantes)`);

  // ============================================================
  // PROGRAMA
  // ============================================================
  const program = await prisma.program.upsert({
    where: { institutionId_code: { institutionId: institution.id, code: 'ING' } },
    update: {},
    create: {
      institutionId: institution.id,
      name: 'Ingeniería',
      code: 'ING',
      department: 'Facultad de Ingeniería'
    }
  });

  // ============================================================
  // CURSO
  // ============================================================
  const course = await prisma.course.create({
    data: {
      institutionId: institution.id,
      programId: program.id,
      periodId: period.id,
      teacherId: teacher.id,
      name: 'Gestión de Proyectos de Software',
      code: 'ING-401',
      credits: 3,
      description: 'Curso de gestión de proyectos aplicando metodologías ágiles y trabajo en equipo.'
    }
  });
  console.log('✅ Curso creado:', course.name);

  // ============================================================
  // GRUPOS Y EQUIPOS
  // ============================================================
  const group = await prisma.group.create({
    data: { courseId: course.id, name: 'Grupo 1' }
  });

  for (const student of students) {
    await prisma.groupMember.create({
      data: { groupId: group.id, userId: student.id }
    });
  }

  const team1 = await prisma.team.create({
    data: { groupId: group.id, name: 'Equipo Alpha' }
  });
  const team2 = await prisma.team.create({
    data: { groupId: group.id, name: 'Equipo Beta' }
  });

  // Asignar estudiantes a equipos (3 por equipo)
  for (let i = 0; i < 3; i++) {
    await prisma.teamMember.create({ data: { teamId: team1.id, userId: students[i].id } });
  }
  for (let i = 3; i < 6; i++) {
    await prisma.teamMember.create({ data: { teamId: team2.id, userId: students[i].id } });
  }
  console.log('✅ Grupos y equipos creados');

  // ============================================================
  // RÚBRICA 1: EVALUACIÓN POR PARES
  // Fuente: hoja "TrabajoEquipo-pares" del archivo Excel
  // ============================================================
  const rubricPares = await prisma.rubric.create({
    data: {
      institutionId: institution.id,
      creatorId: teacher.id,
      name: 'Evaluación de Trabajo en Equipo - Por Pares',
      description: 'Esta rúbrica evalúa las habilidades de trabajo en equipo a partir de información del desempeño de un integrante por parte de sus compañeros (pares).',
      isPublic: true,
      version: 1
    }
  });

  const criteriaPares = [
    {
      name: 'Contribución',
      description: 'Evalúa el aporte activo del integrante al logro de los objetivos del equipo.',
      weight: 1.0,
      order: 1,
      levels: [
        {
          name: 'Proficiente', score: 4, order: 1,
          description: 'Aporta al logro de los objetivos, sugiere soluciones y participa activamente en su desarrollo.'
        },
        {
          name: 'Aceptable', score: 3, order: 2,
          description: 'Aporta al logro de los objetivos, sugiere soluciones, pero participa muy poco en su desarrollo.'
        },
        {
          name: 'Principiante', score: 2, order: 3,
          description: 'Pocas veces aporta al logro de los objetivos.'
        },
        {
          name: 'Necesita mejorar', score: 1, order: 4,
          description: 'Nunca realizó aportes al logro de los objetivos.'
        }
      ]
    },
    {
      name: 'Roles',
      description: 'Evalúa la responsabilidad con el rol asignado y la colaboración con el equipo.',
      weight: 1.0,
      order: 2,
      levels: [
        {
          name: 'Proficiente', score: 4, order: 1,
          description: 'Pone sus habilidades al servicio del equipo. Es responsable con el rol asignado y colabora con los demás integrantes del equipo cuando éstos tienen dificultades.'
        },
        {
          name: 'Aceptable', score: 3, order: 2,
          description: 'Pone sus habilidades al servicio del equipo. Es responsable con el rol asignado, respeta los roles de los demás integrantes del equipo, pero no se integra en un trabajo colaborativo.'
        },
        {
          name: 'Principiante', score: 2, order: 3,
          description: 'Asume un rol específico, pero no respeta las responsabilidades de los demás integrantes del equipo, entorpeciendo su trabajo.'
        },
        {
          name: 'Necesita mejorar', score: 1, order: 4,
          description: 'No asume responsablemente el rol asignado y entorpece el trabajo de los demás integrantes del equipo.'
        }
      ]
    },
    {
      name: 'Comunicación Interna',
      description: 'Evalúa la capacidad de comunicación constructiva y receptividad dentro del equipo.',
      weight: 1.0,
      order: 3,
      levels: [
        {
          name: 'Proficiente', score: 4, order: 1,
          description: 'Es receptivo a aceptar sugerencias u observaciones de los miembros del equipo, y realiza observaciones constructivas a los demás integrantes.'
        },
        {
          name: 'Aceptable', score: 3, order: 2,
          description: 'Es receptivo a aceptar las sugerencias u observaciones de los demás integrantes del equipo, pero no opina constructivamente sobre los demás integrantes.'
        },
        {
          name: 'Principiante', score: 2, order: 3,
          description: 'Realiza observaciones a los demás integrantes del equipo, pero no es receptivo a aceptar las sugerencias que le hagan.'
        },
        {
          name: 'Necesita mejorar', score: 1, order: 4,
          description: 'No acepta las sugerencias u observaciones de los miembros del equipo. Tampoco realiza observaciones constructivas a los demás integrantes.'
        }
      ]
    }
  ];

  for (const criterion of criteriaPares) {
    const newCriterion = await prisma.rubricCriteria.create({
      data: {
        rubricId: rubricPares.id,
        name: criterion.name,
        description: criterion.description,
        weight: criterion.weight,
        order: criterion.order
      }
    });
    for (const level of criterion.levels) {
      await prisma.performanceLevel.create({
        data: {
          criteriaId: newCriterion.id,
          name: level.name,
          score: level.score,
          order: level.order,
          description: level.description
        }
      });
    }
  }
  console.log('✅ Rúbrica de evaluación por pares creada (3 criterios)');

  // ============================================================
  // RÚBRICA 2: HETEROEVALUACIÓN DOCENTE
  // Fuente: hoja "TrabajoEquipo-general" del archivo Excel
  // ============================================================
  const rubricDocente = await prisma.rubric.create({
    data: {
      institutionId: institution.id,
      creatorId: teacher.id,
      name: 'Evaluación de Trabajo en Equipo - Heteroevaluación Docente',
      description: 'Rúbrica que usa el docente para evaluar el trabajo en equipo a partir de los instrumentos de seguimiento.',
      isPublic: true,
      version: 1
    }
  });

  const criteriaDocente = [
    {
      name: 'Metas del Equipo',
      description: 'Evalúa el establecimiento y claridad de metas del equipo.',
      weight: 1.0,
      order: 1,
      levels: [
        {
          name: 'Proficiente', score: 4, order: 1,
          description: 'El equipo establece metas realizables. Las metas y prioridades son claras, justificadas y acordadas por la totalidad de los integrantes del equipo.'
        },
        {
          name: 'Aceptable', score: 3, order: 2,
          description: 'El equipo establece metas realizables. Las metas no están priorizadas, pero son justificadas y acordadas por la totalidad de los integrantes del equipo.'
        },
        {
          name: 'Principiante', score: 2, order: 3,
          description: 'El equipo establece metas difíciles de realizar. Hay algunos acuerdos de realización entre los integrantes del equipo.'
        },
        {
          name: 'Necesita mejorar', score: 1, order: 4,
          description: 'El equipo propone algunas ideas para la construcción de metas, pero sin tener una estructura.'
        }
      ]
    },
    {
      name: 'Decisiones del Equipo',
      description: 'Evalúa el proceso de toma de decisiones del equipo.',
      weight: 1.0,
      order: 2,
      levels: [
        {
          name: 'Proficiente', score: 4, order: 1,
          description: 'El equipo muestra un procedimiento formal y consistente para la toma de decisiones. Estas son acordadas por la totalidad de los integrantes del equipo.'
        },
        {
          name: 'Aceptable', score: 3, order: 2,
          description: 'El equipo toma decisiones consistentes, pero sin mostrar un procedimiento ordenado o avalado por la totalidad de los integrantes del equipo.'
        },
        {
          name: 'Principiante', score: 2, order: 3,
          description: 'El equipo toma decisiones sin dimensionar la pertinencia o trascendencia de estas.'
        },
        {
          name: 'Necesita mejorar', score: 1, order: 4,
          description: 'Las decisiones son desafortunadas y recaen en esfuerzos individuales de los integrantes del equipo.'
        }
      ]
    },
    {
      name: 'Registros de Control del Equipo',
      description: 'Evalúa la existencia y uso de registros del trabajo en equipo.',
      weight: 1.0,
      order: 3,
      levels: [
        {
          name: 'Proficiente', score: 4, order: 1,
          description: 'El equipo tiene evidencias reales de las metas y registros completos del trabajo en equipo que se usan para la supervisión y control.'
        },
        {
          name: 'Aceptable', score: 3, order: 2,
          description: 'El equipo tiene evidencias reales de las metas y registro del trabajo en equipo, pero están incompletos o se usan poco para la supervisión y control.'
        },
        {
          name: 'Principiante', score: 2, order: 3,
          description: 'El equipo tiene evidencias de las metas y registros del trabajo en equipo, pero no corresponden a la realidad.'
        },
        {
          name: 'Necesita mejorar', score: 1, order: 4,
          description: 'El equipo no cuenta con evidencias de las metas establecidas ni mecanismos de supervisión del trabajo del equipo.'
        }
      ]
    }
  ];

  for (const criterion of criteriaDocente) {
    const newCriterion = await prisma.rubricCriteria.create({
      data: {
        rubricId: rubricDocente.id,
        name: criterion.name,
        description: criterion.description,
        weight: criterion.weight,
        order: criterion.order
      }
    });
    for (const level of criterion.levels) {
      await prisma.performanceLevel.create({
        data: {
          criteriaId: newCriterion.id,
          name: level.name,
          score: level.score,
          order: level.order,
          description: level.description
        }
      });
    }
  }
  console.log('✅ Rúbrica de heteroevaluación docente creada (3 criterios)');

  // ============================================================
  // RÚBRICA 3: AUTOEVALUACIÓN (combinada con los 6 criterios)
  // ============================================================
  const rubricAuto = await prisma.rubric.create({
    data: {
      institutionId: institution.id,
      creatorId: teacher.id,
      name: 'Evaluación de Trabajo en Equipo - Autoevaluación',
      description: 'Rúbrica para autoevaluación del trabajo en equipo. Combina criterios de contribución individual y desempeño colectivo.',
      isPublic: true,
      version: 1
    }
  });

  const criteriaAuto = [
    {
      name: 'Mi Contribución',
      description: 'Evalúo mi propio aporte al logro de los objetivos del equipo.',
      weight: 1.0, order: 1,
      levels: [
        { name: 'Proficiente', score: 4, order: 1, description: 'Aporté activamente al logro de los objetivos, sugerí soluciones y participé activamente en su desarrollo.' },
        { name: 'Aceptable', score: 3, order: 2, description: 'Aporté al logro de los objetivos y sugerí soluciones, pero participé poco en el desarrollo.' },
        { name: 'Principiante', score: 2, order: 3, description: 'Pocas veces aporté al logro de los objetivos del equipo.' },
        { name: 'Necesita mejorar', score: 1, order: 4, description: 'Nunca realicé aportes significativos al logro de los objetivos.' }
      ]
    },
    {
      name: 'Mi Rol en el Equipo',
      description: 'Evalúo mi responsabilidad con el rol asignado y colaboración.',
      weight: 1.0, order: 2,
      levels: [
        { name: 'Proficiente', score: 4, order: 1, description: 'Puse mis habilidades al servicio del equipo, fui responsable con mi rol y colaboré con mis compañeros cuando tuvieron dificultades.' },
        { name: 'Aceptable', score: 3, order: 2, description: 'Fui responsable con mi rol y respeté los roles de los demás, pero no me integré completamente en el trabajo colaborativo.' },
        { name: 'Principiante', score: 2, order: 3, description: 'Asumí mi rol, pero a veces entorpecí el trabajo de mis compañeros.' },
        { name: 'Necesita mejorar', score: 1, order: 4, description: 'No asumí responsablemente mi rol y entorpecí el trabajo del equipo.' }
      ]
    },
    {
      name: 'Mi Comunicación',
      description: 'Evalúo mi comunicación constructiva con el equipo.',
      weight: 1.0, order: 3,
      levels: [
        { name: 'Proficiente', score: 4, order: 1, description: 'Fui receptivo a las sugerencias de mis compañeros y realicé observaciones constructivas.' },
        { name: 'Aceptable', score: 3, order: 2, description: 'Fui receptivo a las sugerencias pero no aportaba constructivamente mis opiniones.' },
        { name: 'Principiante', score: 2, order: 3, description: 'Hacía observaciones a mis compañeros pero no era receptivo a las sugerencias que me hacían.' },
        { name: 'Necesita mejorar', score: 1, order: 4, description: 'No acepté las sugerencias de mis compañeros ni realicé observaciones constructivas.' }
      ]
    }
  ];

  for (const criterion of criteriaAuto) {
    const newCriterion = await prisma.rubricCriteria.create({
      data: {
        rubricId: rubricAuto.id,
        name: criterion.name,
        description: criterion.description,
        weight: criterion.weight,
        order: criterion.order
      }
    });
    for (const level of criterion.levels) {
      await prisma.performanceLevel.create({
        data: {
          criteriaId: newCriterion.id,
          name: level.name,
          score: level.score,
          order: level.order,
          description: level.description
        }
      });
    }
  }
  console.log('✅ Rúbrica de autoevaluación creada (3 criterios)');

  // Asociar rúbricas al curso
  await prisma.courseRubric.createMany({
    data: [
      { courseId: course.id, rubricId: rubricPares.id },
      { courseId: course.id, rubricId: rubricDocente.id },
      { courseId: course.id, rubricId: rubricAuto.id }
    ]
  });

  console.log('\n🎉 Seed completado exitosamente!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Credenciales admin/docente (contraseña: TeamEval2024!):');
  console.log('  Admin:   admin@teameval.edu.co');
  console.log('  Docente: docente@teameval.edu.co');
  console.log('');
  console.log('Credenciales estudiantes (contraseña = cédula):');
  console.log('  est1@teameval.edu.co → 1000000001');
  console.log('  est2@teameval.edu.co → 1000000002');
  console.log('  ... hasta est6 → 1000000006');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

main()
  .catch((e) => { console.error('❌ Error en seed:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
