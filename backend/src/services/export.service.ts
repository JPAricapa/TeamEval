/**
 * Servicio de Exportación de Datos
 * Genera reportes en Excel, CSV y PDF
 */

import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import { prisma } from '../utils/prisma';
import { AppError } from '../middleware/errorHandler';
import { consolidationService } from './consolidation.service';
import { getAllProcessCriteria } from '../utils/rubricAssignment';

export class ExportService {

  /**
   * Exportar resultados a Excel con múltiples hojas
   */
  async exportToExcel(processId: string): Promise<Buffer> {
    const process = await prisma.evaluationProcess.findUnique({
      where: { id: processId },
      include: {
        course: { select: { name: true, code: true } },
        selfRubric: { include: { criteria: { where: { isActive: true } } } },
        peerRubric: { include: { criteria: { where: { isActive: true } } } },
        teacherRubric: { include: { criteria: { where: { isActive: true } } } },
      }
    });

    if (!process) throw new AppError('Proceso no encontrado', 404);

    const results = await consolidationService.getProcessResults(processId);
    const workbook = new ExcelJS.Workbook();

    // --------------------------------------------------------
    // Hoja 1: Resultados generales
    // --------------------------------------------------------
    const sheet1 = workbook.addWorksheet('Resultados Generales');

    // Encabezado
    sheet1.mergeCells('A1:G1');
    const titleCell = sheet1.getCell('A1');
    titleCell.value = `Evaluación de Trabajo en Equipo - ${process.course.name}`;
    titleCell.font = { bold: true, size: 14 };
    titleCell.alignment = { horizontal: 'center' };

    sheet1.getRow(3).values = [
      'Estudiante', 'Email', 'Equipo',
      'Autoevaluación', 'Coevaluación', 'Evaluación Docente',
      'Nota Final'
    ];
    sheet1.getRow(3).font = { bold: true };
    sheet1.getRow(3).fill = {
      type: 'pattern', pattern: 'solid',
      fgColor: { argb: 'FF1565C0' }
    };
    sheet1.getRow(3).font = { bold: true, color: { argb: 'FFFFFFFF' } };

    let row = 4;
    for (const result of results) {
      sheet1.getRow(row).values = [
        result.student?.name ?? 'N/A',
        result.student?.email ?? 'N/A',
        result.team?.name ?? 'Sin equipo',
        result.selfScore !== null ? result.selfScore.toFixed(2) : 'N/E',
        result.peerScore !== null ? result.peerScore.toFixed(2) : 'N/E',
        result.teacherScore !== null ? result.teacherScore.toFixed(2) : 'N/E',
        result.finalScore !== null ? result.finalScore.toFixed(2) : 'N/C'
      ];

      // Color por nota
      const finalScore = result.finalScore;
      if (finalScore !== null) {
        const color = finalScore >= 4.5 ? 'FF4CAF50'
          : finalScore >= 3.5 ? 'FF1565C0'
          : finalScore >= 2.5 ? 'FFFF9800'
          : 'FFF44336';
        sheet1.getCell(`G${row}`).fill = {
          type: 'pattern', pattern: 'solid', fgColor: { argb: color }
        };
      }
      row++;
    }

    sheet1.columns.forEach((col) => { col.width = 20; });

    // --------------------------------------------------------
    // Hoja 2: Detalle por criterio
    // --------------------------------------------------------
    const sheet2 = workbook.addWorksheet('Detalle por Criterio');
    const criteria = getAllProcessCriteria(process);
    const headers = ['Estudiante', ...criteria.map((c) => c.name), 'Promedio'];
    sheet2.getRow(1).values = headers;
    sheet2.getRow(1).font = { bold: true };

    let rowIdx = 2;
    for (const result of results) {
      const criteriaScores = result.criteriaScores as Record<string, number> | null;
      const rowValues = [
        result.student?.name ?? 'N/A',
        ...criteria.map((c) =>
          criteriaScores ? (criteriaScores[c.id] ?? 0).toFixed(2) : 'N/E'
        ),
        result.finalScore !== null ? result.finalScore.toFixed(2) : 'N/C'
      ];
      sheet2.getRow(rowIdx).values = rowValues;
      rowIdx++;
    }
    sheet2.columns.forEach((col) => { col.width = 18; });

    // --------------------------------------------------------
    // Hoja 3: Dataset para investigación (formato largo)
    // --------------------------------------------------------
    const sheet3 = workbook.addWorksheet('Dataset Investigación');
    sheet3.getRow(1).values = [
      'processId', 'processName', 'courseId', 'courseName',
      'studentId', 'studentName', 'teamName',
      'selfScore', 'peerScore', 'teacherScore', 'finalScore',
      'overvaluationIndex', 'criteriaScores'
    ];
    sheet3.getRow(1).font = { bold: true };

    rowIdx = 2;
    for (const result of results) {
      sheet3.getRow(rowIdx).values = [
        processId, process.name, process.course.code, process.course.name,
        result.studentId, result.student?.name ?? 'N/A', result.team?.name ?? 'Sin equipo',
        result.selfScore, result.peerScore, result.teacherScore, result.finalScore,
        result.overvaluationIndex,
        JSON.stringify(result.criteriaScores)
      ];
      rowIdx++;
    }
    sheet3.columns.forEach((col) => { col.width = 18; });

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  /**
   * Exportar resultados a CSV
   */
  async exportToCSV(processId: string): Promise<string> {
    const process = await prisma.evaluationProcess.findUnique({
      where: { id: processId },
      include: {
        course: { select: { name: true } },
        selfRubric: { include: { criteria: { where: { isActive: true } } } },
        peerRubric: { include: { criteria: { where: { isActive: true } } } },
        teacherRubric: { include: { criteria: { where: { isActive: true } } } },
      }
    });

    if (!process) throw new AppError('Proceso no encontrado', 404);

    const results = await consolidationService.getProcessResults(processId);

    const criteria = getAllProcessCriteria(process);
    const criteriaHeaders = criteria.map((c) => `"${c.name}"`).join(',');
    let csv = `Estudiante,Email,Equipo,Autoevaluación,Coevaluación,Docente,Nota Final,Índice Sobrevaloración,${criteriaHeaders}\n`;

    for (const result of results) {
      const criteriaScores = result.criteriaScores as Record<string, number> | null;
      const criteriaValues = criteria
        .map((c) => criteriaScores ? criteriaScores[c.id]?.toFixed(2) ?? '' : '')
        .join(',');

      csv += [
        `"${result.student?.name ?? ''}"`,
        `"${result.student?.email ?? ''}"`,
        `"${result.team?.name ?? 'Sin equipo'}"`,
        result.selfScore?.toFixed(2) ?? '',
        result.peerScore?.toFixed(2) ?? '',
        result.teacherScore?.toFixed(2) ?? '',
        result.finalScore?.toFixed(2) ?? '',
        result.overvaluationIndex?.toFixed(2) ?? '',
        criteriaValues
      ].join(',') + '\n';
    }

    return csv;
  }

  /**
   * Exportar reporte a PDF
   */
  async exportToPDF(processId: string): Promise<Buffer> {
    const process = await prisma.evaluationProcess.findUnique({
      where: { id: processId },
      include: {
        course: { include: { teacher: { select: { firstName: true, lastName: true } } } },
        selfRubric: true,
        peerRubric: true,
        teacherRubric: true,
      }
    });

    if (!process) throw new AppError('Proceso no encontrado', 404);

    const results = await consolidationService.getProcessResults(processId);

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50 });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Portada
      doc.fontSize(20).font('Helvetica-Bold')
        .text('Plataforma de Evaluación y Analítica', { align: 'center' });
      doc.fontSize(16)
        .text('Trabajo en Equipo', { align: 'center' });
      doc.moveDown();
      const rubricSummary = [
        process.selfRubric ? `Auto: ${process.selfRubric.name} v${process.selfRubric.version}` : null,
        process.peerRubric ? `Pares: ${process.peerRubric.name} v${process.peerRubric.version}` : null,
        process.teacherRubric ? `Docente: ${process.teacherRubric.name} v${process.teacherRubric.version}` : null,
      ].filter((item): item is string => Boolean(item)).join(' | ');
      doc.fontSize(12).font('Helvetica')
        .text(`Curso: ${process.course.name}`, { align: 'center' })
        .text(`Proceso: ${process.name}`, { align: 'center' })
        .text(`Rúbricas: ${rubricSummary}`, { align: 'center' })
        .text(`Docente: ${process.course.teacher.firstName} ${process.course.teacher.lastName}`, { align: 'center' })
        .text(`Generado: ${new Date().toLocaleDateString('es-CO')}`, { align: 'center' });

      doc.addPage();

      // Tabla de resultados
      doc.fontSize(14).font('Helvetica-Bold').text('Resultados por Estudiante');
      doc.moveDown(0.5);

      for (const result of results) {
        doc.fontSize(10).font('Helvetica-Bold')
          .text(`${result.student?.name ?? 'N/A'} - ${result.team?.name ?? 'Sin equipo'}`);
        doc.font('Helvetica')
          .text(`  Autoevaluación: ${result.selfScore?.toFixed(2) ?? 'N/E'}`)
          .text(`  Coevaluación:   ${result.peerScore?.toFixed(2) ?? 'N/E'}`)
          .text(`  Docente:        ${result.teacherScore?.toFixed(2) ?? 'N/E'}`)
          .text(`  NOTA FINAL:     ${result.finalScore?.toFixed(2) ?? 'N/C'}`)
          .text(`  Sobrevaloración:${result.overvaluationIndex?.toFixed(2) ?? 'N/A'}`);
        doc.moveDown(0.5);
      }

      doc.addPage();

      // Estadísticas del proceso
      const finalScores = results
        .map((r) => r.finalScore)
        .filter((s): s is number => s !== null);

      if (finalScores.length > 0) {
        doc.fontSize(14).font('Helvetica-Bold').text('Estadísticas del Proceso');
        doc.moveDown(0.5);
        doc.fontSize(10).font('Helvetica');

        const avg = finalScores.reduce((a, b) => a + b, 0) / finalScores.length;
        const sorted = [...finalScores].sort((a, b) => a - b);
        const mid = Math.floor(sorted.length / 2);
        const median = sorted.length % 2 === 0
          ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];

        doc.text(`Total estudiantes evaluados: ${finalScores.length}`)
          .text(`Nota promedio: ${avg.toFixed(2)}`)
          .text(`Mediana: ${median.toFixed(2)}`)
          .text(`Nota mínima: ${Math.min(...finalScores).toFixed(2)}`)
          .text(`Nota máxima: ${Math.max(...finalScores).toFixed(2)}`);
      }

      doc.end();
    });
  }
}

export const exportService = new ExportService();
