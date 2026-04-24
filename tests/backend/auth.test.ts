/**
 * ============================================================
 * PRUEBAS - Módulo de Autenticación
 * Pruebas funcionales de login, registro y JWT
 * ============================================================
 */

import request from 'supertest';
import app from '../../backend/src/index';

// Mock de Prisma para evitar BD real en pruebas
jest.mock('../../backend/src/utils/prisma', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn()
    },
    refreshToken: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn()
    },
    $connect: jest.fn(),
    $disconnect: jest.fn()
  }
}));

const { prisma } = require('../../backend/src/utils/prisma');

describe('🔐 Autenticación - Registro y Login', () => {

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── Registro ────────────────────────────────────────────────

  describe('POST /api/v1/auth/register', () => {
    it('rechaza contraseña débil (sin mayúscula/número)', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'test@university.edu',
          password: 'password',     // sin mayúscula ni número
          firstName: 'Juan',
          lastName: 'García',
          role: 'STUDENT'
        });

      expect(res.status).toBe(422);
      expect(res.body.success).toBe(false);
    });

    it('rechaza email inválido', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'no-es-email',
          password: 'Password1!',
          firstName: 'Juan',
          lastName: 'García',
          role: 'STUDENT'
        });

      expect(res.status).toBe(422);
    });

    it('rechaza rol inválido', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'valid@uni.edu',
          password: 'Password1!',
          firstName: 'Juan',
          lastName: 'García',
          role: 'SUPERADMIN' // rol no válido
        });

      expect(res.status).toBe(422);
    });

    it('rechaza campos vacíos requeridos', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'test@uni.edu',
          password: 'Password1!',
          // falta firstName y lastName
          role: 'STUDENT'
        });

      expect(res.status).toBe(422);
    });
  });

  // ── Login ───────────────────────────────────────────────────

  describe('POST /api/v1/auth/login', () => {
    it('requiere email y contraseña', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: '' });

      expect(res.status).toBe(422);
    });

    it('rechaza email mal formado', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'malformed', password: '123' });

      expect(res.status).toBe(422);
    });

    it('retorna 401 si usuario no existe', async () => {
      prisma.user.findFirst.mockResolvedValue(null);

      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'noexiste@uni.edu', password: 'Password1!' });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  // ── Refresh Token ───────────────────────────────────────────

  describe('POST /api/v1/auth/refresh', () => {
    it('requiere refresh token', async () => {
      const res = await request(app)
        .post('/api/v1/auth/refresh')
        .send({});

      expect(res.status).toBe(422);
    });

    it('retorna 401 para token inválido', async () => {
      prisma.refreshToken.findUnique.mockResolvedValue(null);

      const res = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: 'token-invalido' });

      expect(res.status).toBe(401);
    });
  });

  // ── Ruta protegida sin token ────────────────────────────────

  describe('Middleware de autenticación', () => {
    it('rechaza solicitudes sin token Bearer', async () => {
      const res = await request(app).get('/api/v1/users/me');
      expect(res.status).toBe(401);
    });

    it('rechaza token mal formado', async () => {
      const res = await request(app)
        .get('/api/v1/users/me')
        .set('Authorization', 'Bearer token-falso-invalido');

      expect(res.status).toBe(401);
    });
  });
});

// ============================================================
// PRUEBAS DE VALIDACIÓN
// ============================================================

describe('✅ Validaciones del Sistema', () => {

  describe('Pesos de evaluación', () => {
    it('pesos deben sumar exactamente 1.0', async () => {
      const validWeights = { self: 0.2, peer: 0.5, teacher: 0.3 };
      const sum = validWeights.self + validWeights.peer + validWeights.teacher;
      expect(sum).toBeCloseTo(1.0);
    });

    it('peso no negativo', () => {
      const weights = [-0.1, 0.6, 0.5];
      const allPositive = weights.every(w => w >= 0);
      expect(allPositive).toBe(false);
    });
  });

  describe('Verificación de criterios completos', () => {
    it('detecta criterios faltantes en evaluación', () => {
      const criteriaIds = ['c1', 'c2', 'c3'];
      const submittedIds = ['c1', 'c2'];
      const missing = criteriaIds.filter(id => !submittedIds.includes(id));
      expect(missing).toHaveLength(1);
      expect(missing).toContain('c3');
    });

    it('evalúación completa sin faltantes', () => {
      const criteriaIds = ['c1', 'c2', 'c3'];
      const submittedIds = ['c1', 'c2', 'c3'];
      const missing = criteriaIds.filter(id => !submittedIds.includes(id));
      expect(missing).toHaveLength(0);
    });
  });
});

// ============================================================
// PRUEBAS DE SEGURIDAD
// ============================================================

describe('🔒 Seguridad', () => {

  it('health endpoint es público', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  it('endpoint de usuarios requiere autenticación', async () => {
    const res = await request(app).get('/api/v1/users');
    expect(res.status).toBe(401);
  });

  it('ruta inexistente retorna 404', async () => {
    const res = await request(app).get('/api/v1/ruta-que-no-existe');
    expect(res.status).toBe(404);
  });
});
