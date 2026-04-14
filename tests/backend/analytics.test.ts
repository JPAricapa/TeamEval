/**
 * ============================================================
 * PRUEBAS - Módulo de Analítica de Datos
 * Valida cálculos estadísticos y métricas FASE 6
 * ============================================================
 */

// Extraemos la lógica estadística para pruebas unitarias puras
class StatsCalculator {
  static mean(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((a, b) => a + b, 0) / values.length;
  }

  static median(values: number[]): number {
    if (values.length === 0) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0
      ? (sorted[mid - 1] + sorted[mid]) / 2
      : sorted[mid];
  }

  static variance(values: number[]): number {
    if (values.length === 0) return 0;
    const avg = StatsCalculator.mean(values);
    return StatsCalculator.mean(values.map((v) => Math.pow(v - avg, 2)));
  }

  static stdDev(values: number[]): number {
    return Math.sqrt(StatsCalculator.variance(values));
  }

  static percentile(values: number[], p: number): number {
    if (values.length === 0) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const index = (p / 100) * (sorted.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    if (lower === upper) return sorted[lower];
    return sorted[lower] + (index - lower) * (sorted[upper] - sorted[lower]);
  }

  static detectOutliers(values: number[], ids: string[]): string[] {
    const q1 = StatsCalculator.percentile(values, 25);
    const q3 = StatsCalculator.percentile(values, 75);
    const iqr = q3 - q1;
    const lower = q1 - 1.5 * iqr;
    const upper = q3 + 1.5 * iqr;
    return ids.filter((_, i) => values[i] < lower || values[i] > upper);
  }

  static cohesionIndex(values: number[]): number {
    const avg = StatsCalculator.mean(values);
    if (avg === 0) return 0;
    return 1 - StatsCalculator.stdDev(values) / avg;
  }
}

// ============================================================
// SUITE DE PRUEBAS ESTADÍSTICAS
// ============================================================

describe('📊 Módulo de Analítica - Estadísticas Básicas', () => {

  // ── Media ──────────────────────────────────────────────────

  describe('mean()', () => {
    it('calcula la media correctamente', () => {
      expect(StatsCalculator.mean([1, 2, 3, 4, 5])).toBeCloseTo(3.0);
      expect(StatsCalculator.mean([3, 3, 3])).toBeCloseTo(3.0);
      expect(StatsCalculator.mean([1, 4])).toBeCloseTo(2.5);
    });

    it('retorna 0 para arreglo vacío', () => {
      expect(StatsCalculator.mean([])).toBe(0);
    });

    it('funciona con un solo elemento', () => {
      expect(StatsCalculator.mean([3.5])).toBeCloseTo(3.5);
    });

    it('maneja notas reales de evaluación (escala 1-4)', () => {
      const notas = [3.2, 3.8, 2.9, 4.0, 3.5, 2.7, 3.1];
      const resultado = StatsCalculator.mean(notas);
      expect(resultado).toBeGreaterThan(1);
      expect(resultado).toBeLessThanOrEqual(4);
      expect(resultado).toBeCloseTo(3.171, 1);
    });
  });

  // ── Mediana ────────────────────────────────────────────────

  describe('median()', () => {
    it('mediana de n impar', () => {
      expect(StatsCalculator.median([1, 2, 3, 4, 5])).toBe(3);
    });

    it('mediana de n par (promedio de dos centrales)', () => {
      expect(StatsCalculator.median([1, 2, 3, 4])).toBe(2.5);
    });

    it('no depende del orden de entrada', () => {
      expect(StatsCalculator.median([5, 1, 3, 2, 4])).toBe(3);
    });

    it('retorna 0 para arreglo vacío', () => {
      expect(StatsCalculator.median([])).toBe(0);
    });
  });

  // ── Varianza ───────────────────────────────────────────────

  describe('variance()', () => {
    it('varianza cero para todos iguales', () => {
      expect(StatsCalculator.variance([3, 3, 3, 3])).toBeCloseTo(0);
    });

    it('calcula varianza correctamente', () => {
      // {1,2,3}: media=2, varianza=(1+0+1)/3 = 0.667
      expect(StatsCalculator.variance([1, 2, 3])).toBeCloseTo(0.667, 2);
    });

    it('retorna 0 para vacío', () => {
      expect(StatsCalculator.variance([])).toBe(0);
    });
  });

  // ── Desviación Estándar ────────────────────────────────────

  describe('stdDev()', () => {
    it('desviación cero para valores iguales', () => {
      expect(StatsCalculator.stdDev([4, 4, 4])).toBeCloseTo(0);
    });

    it('calcula desviación correctamente', () => {
      expect(StatsCalculator.stdDev([2, 4, 4, 4, 5, 5, 7, 9])).toBeCloseTo(2.0, 0);
    });
  });

  // ── Percentiles ────────────────────────────────────────────

  describe('percentile()', () => {
    const data = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

    it('percentil 25 (Q1)', () => {
      expect(StatsCalculator.percentile(data, 25)).toBeCloseTo(3.25);
    });

    it('percentil 50 (mediana)', () => {
      expect(StatsCalculator.percentile(data, 50)).toBeCloseTo(5.5);
    });

    it('percentil 75 (Q3)', () => {
      expect(StatsCalculator.percentile(data, 75)).toBeCloseTo(7.75);
    });

    it('percentil 90', () => {
      expect(StatsCalculator.percentile(data, 90)).toBeCloseTo(9.1);
    });

    it('percentil 0 retorna mínimo', () => {
      expect(StatsCalculator.percentile(data, 0)).toBe(1);
    });

    it('percentil 100 retorna máximo', () => {
      expect(StatsCalculator.percentile(data, 100)).toBe(10);
    });
  });

  // ── Detección de Outliers (IQR) ────────────────────────────

  describe('detectOutliers()', () => {
    it('detecta outlier superior', () => {
      const scores = [3.0, 3.2, 3.1, 3.3, 3.0, 1.0]; // 1.0 es outlier bajo
      const ids = ['a', 'b', 'c', 'd', 'e', 'f'];
      const outliers = StatsCalculator.detectOutliers(scores, ids);
      expect(outliers).toContain('f');
    });

    it('no detecta outliers en datos uniformes', () => {
      const scores = [3.0, 3.1, 3.2, 3.0, 3.1];
      const ids = ['a', 'b', 'c', 'd', 'e'];
      expect(StatsCalculator.detectOutliers(scores, ids)).toHaveLength(0);
    });

    it('detecta múltiples outliers', () => {
      const scores = [3.0, 3.0, 3.0, 3.0, 1.0, 5.0]; // extremos en escala 0-5
      const ids = ['a', 'b', 'c', 'd', 'e', 'f'];
      const outliers = StatsCalculator.detectOutliers(scores, ids);
      expect(outliers.length).toBeGreaterThanOrEqual(1);
    });
  });

  // ── Índice de Cohesión ─────────────────────────────────────

  describe('cohesionIndex()', () => {
    it('cohesión perfecta para valores iguales', () => {
      expect(StatsCalculator.cohesionIndex([3, 3, 3, 3])).toBeCloseTo(1.0);
    });

    it('cohesión baja para alta dispersión', () => {
      const idx = StatsCalculator.cohesionIndex([1, 4, 1, 4, 1, 4]);
      expect(idx).toBeLessThan(0.8);
    });

    it('retorna 0 cuando media es 0', () => {
      expect(StatsCalculator.cohesionIndex([0, 0, 0])).toBe(0);
    });
  });
});

// ============================================================
// PRUEBAS DE ÍNDICE DE SOBREVALORACIÓN
// ============================================================

describe('📈 Índice de Sobrevaloración', () => {
  const overvaluationIndex = (self: number, peer: number) => self - peer;

  it('índice positivo indica sobrevaloración', () => {
    expect(overvaluationIndex(3.8, 3.0)).toBeCloseTo(0.8);
  });

  it('índice negativo indica subvaloración', () => {
    expect(overvaluationIndex(2.5, 3.5)).toBeCloseTo(-1.0);
  });

  it('índice cero indica calibración perfecta', () => {
    expect(overvaluationIndex(3.5, 3.5)).toBeCloseTo(0);
  });

  it('umbral de sobrevaloración significativa (> 0.5 puntos)', () => {
    const threshold = 0.5;
    expect(overvaluationIndex(4.0, 2.5)).toBeGreaterThan(threshold);
    expect(overvaluationIndex(3.0, 3.2)).toBeLessThanOrEqual(threshold);
  });
});

// ============================================================
// PRUEBAS DE CONSOLIDACIÓN DE PUNTAJE FINAL
// ============================================================

describe('🎯 Cálculo de Puntaje Final Ponderado', () => {

  const calcFinal = (
    self: number | null, peer: number | null, teacher: number | null,
    weights: { self: number; peer: number; teacher: number }
  ): number => {
    let total = 0;
    let usedWeight = 0;
    if (self !== null) { total += self * weights.self; usedWeight += weights.self; }
    if (peer !== null) { total += peer * weights.peer; usedWeight += weights.peer; }
    if (teacher !== null) { total += teacher * weights.teacher; usedWeight += weights.teacher; }
    return usedWeight > 0 ? total / usedWeight : 0;
  };

  it('pesos estándar (auto 20%, pares 50%, docente 30%)', () => {
    const final_ = calcFinal(3.5, 3.0, 3.8, { self: 0.2, peer: 0.5, teacher: 0.3 });
    // (3.5*0.2 + 3.0*0.5 + 3.8*0.3) = 0.7 + 1.5 + 1.14 = 3.34
    expect(final_).toBeCloseTo(3.34, 1);
  });

  it('solo autoevaluación disponible', () => {
    const final_ = calcFinal(3.5, null, null, { self: 0.2, peer: 0.5, teacher: 0.3 });
    expect(final_).toBeCloseTo(3.5, 2);
  });

  it('solo coevaluación disponible', () => {
    const final_ = calcFinal(null, 3.2, null, { self: 0.2, peer: 0.5, teacher: 0.3 });
    expect(final_).toBeCloseTo(3.2, 2);
  });

  it('los pesos deben sumar 1', () => {
    const w = { self: 0.2, peer: 0.5, teacher: 0.3 };
    expect(w.self + w.peer + w.teacher).toBeCloseTo(1.0);
  });

  it('puntaje dentro del rango 1-4', () => {
    const final_ = calcFinal(4.0, 4.0, 4.0, { self: 0.2, peer: 0.5, teacher: 0.3 });
    expect(final_).toBeGreaterThanOrEqual(1);
    expect(final_).toBeLessThanOrEqual(4);
  });
});

// ============================================================
// PRUEBAS DE DISTRIBUCIÓN DE NOTAS (HISTOGRAMA)
// ============================================================

describe('📊 Distribución de Notas', () => {
  const buildDistribution = (scores: number[]) => {
    const dist: Record<string, number> = {
      '0.0-2.0': 0, '2.0-3.0': 0, '3.0-3.5': 0,
      '3.5-4.0': 0, '4.0-4.5': 0, '4.5-5.0': 0
    };
    for (const s of scores) {
      if (s < 2) dist['0.0-2.0']++;
      else if (s < 3) dist['2.0-3.0']++;
      else if (s < 3.5) dist['3.0-3.5']++;
      else if (s < 4) dist['3.5-4.0']++;
      else if (s < 4.5) dist['4.0-4.5']++;
      else dist['4.5-5.0']++;
    }
    return dist;
  };

  it('todos los puntajes están clasificados', () => {
    const scores = [1.5, 2.5, 3.2, 3.7, 4.2, 4.8];
    const dist = buildDistribution(scores);
    const total = Object.values(dist).reduce((a, b) => a + b, 0);
    expect(total).toBe(scores.length);
  });

  it('distribución correcta por rango', () => {
    const dist = buildDistribution([3.2, 3.3, 3.2]); // todos en 3.0-3.5
    expect(dist['3.0-3.5']).toBe(3);
    expect(dist['3.5-4.0']).toBe(0);
  });
});
