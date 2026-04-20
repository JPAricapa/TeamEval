/**
 * ============================================================
 * SEED DE BASE DE DATOS - TeamEval Platform
 *
 * Contenido mínimo para arrancar la plataforma:
 *   - Institución base
 *   - Período académico actual
 *   - 1 usuario ADMIN (que también actúa como docente)
 *   - 3 rúbricas base de trabajo en equipo (pares, docente, auto)
 *
 * El docente/admin crea los cursos, grupos y estudiantes desde la UI.
 * NO se crean datos de demo.
 * ============================================================
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { UserRole } from '../src/constants/enums';

const prisma = new PrismaClient();

type SeedPerformanceLevel = {
  name: string;
  score: number;
  order: number;
  description: string;
};

type SeedCriterion = {
  name: string;
  description: string;
  weight: number;
  order: number;
  levels: SeedPerformanceLevel[];
};

function getCurrentAcademicPeriod(date = new Date()) {
  const year = date.getFullYear();
  const semester = date.getMonth() <= 4 ? 1 : 2;

  return {
    code: `${year}-${semester}`,
    name: `Semestre ${year}-${semester}`,
    startDate: new Date(`${year}-${semester === 1 ? '01-01' : '06-01'}`),
    endDate: new Date(`${year}-${semester === 1 ? '05-31' : '12-31'}`),
  };
}

async function syncRubricCriteria(rubricId: string, criteriaDefinitions: SeedCriterion[]) {
  for (const criterion of criteriaDefinitions) {
    const existingCriterion = await prisma.rubricCriteria.findFirst({
      where: { rubricId, name: criterion.name },
      include: { performanceLevels: true }
    });

    const currentCriterion = existingCriterion
      ? await prisma.rubricCriteria.update({
          where: { id: existingCriterion.id },
          data: {
            description: criterion.description,
            weight: criterion.weight,
            order: criterion.order,
            isActive: true
          },
          include: { performanceLevels: true }
        })
      : await prisma.rubricCriteria.create({
          data: {
            rubricId,
            name: criterion.name,
            description: criterion.description,
            weight: criterion.weight,
            order: criterion.order,
            isActive: true
          },
          include: { performanceLevels: true }
        });

    const desiredScores = criterion.levels.map((level) => level.score);

    for (const level of criterion.levels) {
      const existingLevel = currentCriterion.performanceLevels.find((item) => item.score === level.score);

      if (existingLevel) {
        await prisma.performanceLevel.update({
          where: { id: existingLevel.id },
          data: {
            name: level.name,
            description: level.description,
            order: level.order
          }
        });
      } else {
        await prisma.performanceLevel.create({
          data: {
            criteriaId: currentCriterion.id,
            name: level.name,
            score: level.score,
            order: level.order,
            description: level.description
          }
        });
      }
    }

    await prisma.performanceLevel.deleteMany({
      where: {
        criteriaId: currentCriterion.id,
        score: { notIn: desiredScores }
      }
    });
  }
}

async function main() {
  console.log('🌱 Iniciando seed de la base de datos...\n');

  // ============================================================
  // INSTITUCIÓN
  // ============================================================
  const institution = await prisma.institution.upsert({
    where: { code: 'UQ' },
    update: {},
    create: {
      name: 'Universidad',
      code: 'UQ'
    }
  });
  console.log('✅ Institución creada:', institution.name);

  // ============================================================
  // PERÍODO ACADÉMICO
  // ============================================================
  const currentPeriod = getCurrentAcademicPeriod();

  await prisma.academicPeriod.updateMany({
    where: {
      isActive: true,
      code: { not: currentPeriod.code }
    },
    data: { isActive: false }
  });

  const period = await prisma.academicPeriod.upsert({
    where: { code: currentPeriod.code },
    update: {
      name: currentPeriod.name,
      startDate: currentPeriod.startDate,
      endDate: currentPeriod.endDate,
      isActive: true
    },
    create: {
      name: currentPeriod.name,
      code: currentPeriod.code,
      startDate: currentPeriod.startDate,
      endDate: currentPeriod.endDate,
      isActive: true
    }
  });
  console.log('✅ Período académico:', period.name);

  // ============================================================
  // PROGRAMA ACADÉMICO BASE
  // ============================================================
  const program = await prisma.program.upsert({
    where: {
      institutionId_code: {
        institutionId: institution.id,
        code: 'IE'
      }
    },
    update: {
      name: 'Ingeniería Electrónica',
      department: 'Facultad de Ingeniería'
    },
    create: {
      institutionId: institution.id,
      name: 'Ingeniería Electrónica',
      code: 'IE',
      department: 'Facultad de Ingeniería'
    }
  });
  console.log('✅ Programa académico:', program.name);

  // ============================================================
  // USUARIO ADMIN (también docente)
  // ============================================================
  const adminPassword = await bcrypt.hash('TeamEval2024!', 12);
  const adminData = {
    email: 'jaldana@uniquindio.edu.co',
    nationalId: '1012345678',
    passwordHash: adminPassword,
    firstName: 'Jorge Alejandro',
    lastName: 'Aldana Gutierrez',
    role: UserRole.ADMIN,
    institutionId: institution.id,
    isActive: true
  };

  const existingAdmin = await prisma.user.findFirst({
    where: {
      OR: [
        { email: 'jaldana@uniquindio.edu.co' },
        { email: 'admin@teameval.edu.co' },
        { role: UserRole.ADMIN }
      ]
    }
  });

  const admin = existingAdmin
    ? await prisma.user.update({
        where: { id: existingAdmin.id },
        data: adminData
      })
    : await prisma.user.create({
        data: adminData
      });
  console.log('✅ Usuario admin/docente:', admin.email);

  // ============================================================
  // RÚBRICA 1: EVALUACIÓN POR PARES
  // ============================================================
  const existingPares = await prisma.rubric.findFirst({
    where: { name: 'Evaluación de Trabajo en Equipo - Por Pares', institutionId: institution.id }
  });
  const rubricPares = existingPares ?? await prisma.rubric.create({
    data: {
      institutionId: institution.id,
      creatorId: admin.id,
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
        { name: 'Excelente', score: 5, order: 1, description: 'Lidera con iniciativa el cumplimiento de los objetivos, propone soluciones valiosas y moviliza al equipo para ejecutarlas con consistencia.' },
        { name: 'Proficiente', score: 4, order: 2, description: 'Aporta al logro de los objetivos, sugiere soluciones y participa activamente en su desarrollo.' },
        { name: 'Aceptable', score: 3, order: 3, description: 'Aporta al logro de los objetivos, sugiere soluciones, pero participa muy poco en su desarrollo.' },
        { name: 'Principiante', score: 2, order: 4, description: 'Pocas veces aporta al logro de los objetivos.' },
        { name: 'Necesita mejorar', score: 1, order: 5, description: 'Nunca realizó aportes al logro de los objetivos.' }
      ]
    },
    {
      name: 'Roles',
      description: 'Evalúa la responsabilidad con el rol asignado y la colaboración con el equipo.',
      weight: 1.0,
      order: 2,
      levels: [
        { name: 'Excelente', score: 5, order: 1, description: 'Asume su rol con autonomía, fortalece a otros integrantes y ayuda al equipo a coordinarse incluso ante dificultades complejas.' },
        { name: 'Proficiente', score: 4, order: 2, description: 'Pone sus habilidades al servicio del equipo. Es responsable con el rol asignado y colabora con los demás integrantes del equipo cuando éstos tienen dificultades.' },
        { name: 'Aceptable', score: 3, order: 3, description: 'Pone sus habilidades al servicio del equipo. Es responsable con el rol asignado, respeta los roles de los demás integrantes del equipo, pero no se integra en un trabajo colaborativo.' },
        { name: 'Principiante', score: 2, order: 4, description: 'Asume un rol específico, pero no respeta las responsabilidades de los demás integrantes del equipo, entorpeciendo su trabajo.' },
        { name: 'Necesita mejorar', score: 1, order: 5, description: 'No asume responsablemente el rol asignado y entorpece el trabajo de los demás integrantes del equipo.' }
      ]
    },
    {
      name: 'Comunicación Interna',
      description: 'Evalúa la capacidad de comunicación constructiva y receptividad dentro del equipo.',
      weight: 1.0,
      order: 3,
      levels: [
        { name: 'Excelente', score: 5, order: 1, description: 'Promueve conversaciones productivas, integra sugerencias con madurez y facilita acuerdos claros dentro del equipo.' },
        { name: 'Proficiente', score: 4, order: 2, description: 'Es receptivo a aceptar sugerencias u observaciones de los miembros del equipo, y realiza observaciones constructivas a los demás integrantes.' },
        { name: 'Aceptable', score: 3, order: 3, description: 'Es receptivo a aceptar las sugerencias u observaciones de los demás integrantes del equipo, pero no opina constructivamente sobre los demás integrantes.' },
        { name: 'Principiante', score: 2, order: 4, description: 'Realiza observaciones a los demás integrantes del equipo, pero no es receptivo a aceptar las sugerencias que le hagan.' },
        { name: 'Necesita mejorar', score: 1, order: 5, description: 'No acepta las sugerencias u observaciones de los miembros del equipo. Tampoco realiza observaciones constructivas a los demás integrantes.' }
      ]
    }
  ];

  await syncRubricCriteria(rubricPares.id, criteriaPares);
  console.log(`✅ Rúbrica de evaluación por pares ${existingPares ? 'sincronizada' : 'creada'}`);

  // ============================================================
  // RÚBRICA 2: HETEROEVALUACIÓN DOCENTE
  // ============================================================
  const existingDocente = await prisma.rubric.findFirst({
    where: { name: 'Evaluación de Trabajo en Equipo - Heteroevaluación Docente', institutionId: institution.id }
  });
  const rubricDocente = existingDocente ?? await prisma.rubric.create({
    data: {
      institutionId: institution.id,
      creatorId: admin.id,
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
        { name: 'Excelente', score: 5, order: 1, description: 'El equipo define metas realistas, medibles y priorizadas, con acuerdos explícitos y seguimiento visible por parte de todos sus integrantes.' },
        { name: 'Proficiente', score: 4, order: 2, description: 'El equipo establece metas realizables. Las metas y prioridades son claras, justificadas y acordadas por la totalidad de los integrantes del equipo.' },
        { name: 'Aceptable', score: 3, order: 3, description: 'El equipo establece metas realizables. Las metas no están priorizadas, pero son justificadas y acordadas por la totalidad de los integrantes del equipo.' },
        { name: 'Principiante', score: 2, order: 4, description: 'El equipo establece metas difíciles de realizar. Hay algunos acuerdos de realización entre los integrantes del equipo.' },
        { name: 'Necesita mejorar', score: 1, order: 5, description: 'El equipo propone algunas ideas para la construcción de metas, pero sin tener una estructura.' }
      ]
    },
    {
      name: 'Decisiones del Equipo',
      description: 'Evalúa el proceso de toma de decisiones del equipo.',
      weight: 1.0,
      order: 2,
      levels: [
        { name: 'Excelente', score: 5, order: 1, description: 'El equipo sigue un proceso claro, participativo y verificable para decidir, con evidencia de análisis y consenso informado.' },
        { name: 'Proficiente', score: 4, order: 2, description: 'El equipo muestra un procedimiento formal y consistente para la toma de decisiones. Estas son acordadas por la totalidad de los integrantes del equipo.' },
        { name: 'Aceptable', score: 3, order: 3, description: 'El equipo toma decisiones consistentes, pero sin mostrar un procedimiento ordenado o avalado por la totalidad de los integrantes del equipo.' },
        { name: 'Principiante', score: 2, order: 4, description: 'El equipo toma decisiones sin dimensionar la pertinencia o trascendencia de estas.' },
        { name: 'Necesita mejorar', score: 1, order: 5, description: 'Las decisiones son desafortunadas y recaen en esfuerzos individuales de los integrantes del equipo.' }
      ]
    },
    {
      name: 'Registros de Control del Equipo',
      description: 'Evalúa la existencia y uso de registros del trabajo en equipo.',
      weight: 1.0,
      order: 3,
      levels: [
        { name: 'Excelente', score: 5, order: 1, description: 'El equipo mantiene registros completos, trazables y actualizados que realmente orientan la supervisión, el control y la mejora del trabajo colectivo.' },
        { name: 'Proficiente', score: 4, order: 2, description: 'El equipo tiene evidencias reales de las metas y registros completos del trabajo en equipo que se usan para la supervisión y control.' },
        { name: 'Aceptable', score: 3, order: 3, description: 'El equipo tiene evidencias reales de las metas y registro del trabajo en equipo, pero están incompletos o se usan poco para la supervisión y control.' },
        { name: 'Principiante', score: 2, order: 4, description: 'El equipo tiene evidencias de las metas y registros del trabajo en equipo, pero no corresponden a la realidad.' },
        { name: 'Necesita mejorar', score: 1, order: 5, description: 'El equipo no cuenta con evidencias de las metas establecidas ni mecanismos de supervisión del trabajo del equipo.' }
      ]
    }
  ];

  await syncRubricCriteria(rubricDocente.id, criteriaDocente);
  console.log(`✅ Rúbrica de heteroevaluación docente ${existingDocente ? 'sincronizada' : 'creada'}`);

  // ============================================================
  // RÚBRICA 3: AUTOEVALUACIÓN
  // ============================================================
  const existingAuto = await prisma.rubric.findFirst({
    where: { name: 'Evaluación de Trabajo en Equipo - Autoevaluación', institutionId: institution.id }
  });
  const rubricAuto = existingAuto ?? await prisma.rubric.create({
    data: {
      institutionId: institution.id,
      creatorId: admin.id,
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
        { name: 'Excelente', score: 5, order: 1, description: 'Mi aporte fue constante, oportuno y decisivo para que el equipo lograra sus objetivos con calidad.' },
        { name: 'Proficiente', score: 4, order: 2, description: 'Aporté activamente al logro de los objetivos, sugerí soluciones y participé activamente en su desarrollo.' },
        { name: 'Aceptable', score: 3, order: 3, description: 'Aporté al logro de los objetivos y sugerí soluciones, pero participé poco en el desarrollo.' },
        { name: 'Principiante', score: 2, order: 4, description: 'Pocas veces aporté al logro de los objetivos del equipo.' },
        { name: 'Necesita mejorar', score: 1, order: 5, description: 'Nunca realicé aportes significativos al logro de los objetivos.' }
      ]
    },
    {
      name: 'Mi Rol en el Equipo',
      description: 'Evalúo mi responsabilidad con el rol asignado y colaboración.',
      weight: 1.0, order: 2,
      levels: [
        { name: 'Excelente', score: 5, order: 1, description: 'Cumplí mi rol con excelencia y además apoyé activamente la coordinación y el desempeño global del equipo.' },
        { name: 'Proficiente', score: 4, order: 2, description: 'Puse mis habilidades al servicio del equipo, fui responsable con mi rol y colaboré con mis compañeros cuando tuvieron dificultades.' },
        { name: 'Aceptable', score: 3, order: 3, description: 'Fui responsable con mi rol y respeté los roles de los demás, pero no me integré completamente en el trabajo colaborativo.' },
        { name: 'Principiante', score: 2, order: 4, description: 'Asumí mi rol, pero a veces entorpecí el trabajo de mis compañeros.' },
        { name: 'Necesita mejorar', score: 1, order: 5, description: 'No asumí responsablemente mi rol y entorpecí el trabajo del equipo.' }
      ]
    },
    {
      name: 'Mi Comunicación',
      description: 'Evalúo mi comunicación constructiva con el equipo.',
      weight: 1.0, order: 3,
      levels: [
        { name: 'Excelente', score: 5, order: 1, description: 'Me comuniqué de forma clara, empática y oportuna, ayudando a resolver tensiones y a mejorar el trabajo del equipo.' },
        { name: 'Proficiente', score: 4, order: 2, description: 'Fui receptivo a las sugerencias de mis compañeros y realicé observaciones constructivas.' },
        { name: 'Aceptable', score: 3, order: 3, description: 'Fui receptivo a las sugerencias pero no aportaba constructivamente mis opiniones.' },
        { name: 'Principiante', score: 2, order: 4, description: 'Hacía observaciones a mis compañeros pero no era receptivo a las sugerencias que me hacían.' },
        { name: 'Necesita mejorar', score: 1, order: 5, description: 'No acepté las sugerencias de mis compañeros ni realicé observaciones constructivas.' }
      ]
    }
  ];

  await syncRubricCriteria(rubricAuto.id, criteriaAuto);
  console.log(`✅ Rúbrica de autoevaluación ${existingAuto ? 'sincronizada' : 'creada'}`);

  console.log('\n🎉 Seed completado.');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Ingresa con:');
  console.log('  Email:   jaldana@uniquindio.edu.co');
  console.log('  Clave:   TeamEval2024!');
  console.log('');
  console.log('Desde ahí puedes crear cursos, importar estudiantes por CSV');
  console.log('y lanzar procesos de evaluación.');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

main()
  .catch((e) => { console.error('❌ Error en seed:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
