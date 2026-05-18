import { requireRole } from '@/lib/auth-helpers';
import { getReportData } from '@/lib/db/queries/reports';
import { fail } from '@/lib/utils';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const GREEN  = [27, 58, 45]  as [number, number, number]; // #1B3A2D
const GOLD   = [184, 150, 90] as [number, number, number]; // #B8965A
const LIGHT  = [245, 241, 234] as [number, number, number]; // #F5F1EA
const GRAY   = [107, 100, 87] as [number, number, number]; // #6B6457

export async function GET(req: Request) {
  try {
    await requireRole(['admin', 'teacher']);
    const { searchParams } = new URL(req.url);
    const groupSubjectId = Number(searchParams.get('gsId') ?? searchParams.get('groupSubjectId'));
    if (!groupSubjectId) return fail('gsId es requerido.', 422);

    const data = await getReportData(groupSubjectId);
    if (!data) return fail('Grupo-materia no encontrado.', 404);

    const { gs, sessions, students, avgRate } = data;
    const landscape = sessions.length > 8;
    const doc = new jsPDF({ orientation: landscape ? 'landscape' : 'portrait', unit: 'mm', format: 'letter' });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();

    // Fondo blanco explícito para evitar sombra gris del visor
    doc.setFillColor(255, 255, 255);
    doc.rect(0, 0, pageW, pageH, 'F');

    // ── Header band ──────────────────────────────────────────────────
    doc.setFillColor(...GREEN);
    doc.rect(0, 0, pageW, 22, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text('Reporte de Asistencia', 12, 10);

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text('TecNM Campus Celaya · QR Assistance', 12, 16);
    doc.text(new Date().toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' }), pageW - 12, 16, { align: 'right' });

    // ── Info block ───────────────────────────────────────────────────
    doc.setFillColor(...LIGHT);
    doc.rect(0, 22, pageW, 18, 'F');

    doc.setTextColor(...GRAY);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    const col1 = 12, col2 = pageW / 2 + 4;

    doc.text('MATERIA', col1, 29);
    doc.text('GRUPO', col2, 29);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(10, 10, 10);
    doc.setFontSize(9);
    doc.text(gs.subject.name, col1, 34);
    doc.text(gs.group.name, col2, 34);

    doc.setTextColor(...GRAY);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text('DOCENTE', col1, 39);
    doc.text('SESIONES CERRADAS', col2, 39);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(10, 10, 10);
    doc.setFontSize(9);
    doc.text(gs.teacher.name, col1, 44 - 1);
    doc.text(`${sessions.length}  ·  Promedio: ${avgRate}%`, col2, 44 - 1);

    // ── Gold divider ─────────────────────────────────────────────────
    doc.setDrawColor(...GOLD);
    doc.setLineWidth(0.6);
    doc.line(12, 46, pageW - 12, 46);

    // ── Table ────────────────────────────────────────────────────────
    const sessionCols = sessions.map(s =>
      new Date(s.date).toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit' })
    );

    const head = [['Alumno', 'Matrícula', ...sessionCols, 'Asistencia']];
    const body = students.map(st => [
      st.name,
      st.enrollmentNumber ?? '—',
      ...sessions.map(s => {
        const status = st.attsBySession[s.id] ?? 'absent';
        return status === 'present' ? 'P' : status === 'justified' ? 'J' : 'A';
      }),
      `${st.rate}%`,
    ]);

    autoTable(doc, {
      head,
      body,
      startY: 50,
      styles: { fontSize: 7.5, cellPadding: 2.5, font: 'helvetica' },
      headStyles: { fillColor: GREEN, textColor: [255, 255, 255], fontStyle: 'bold', halign: 'center' },
      columnStyles: {
        0: { cellWidth: landscape ? 50 : 42, halign: 'left' },
        1: { cellWidth: 22, halign: 'center' },
        [sessions.length + 2]: { cellWidth: 18, fontStyle: 'bold', halign: 'center' },
      },
      alternateRowStyles: { fillColor: LIGHT },
      didParseCell(data) {
        if (data.section === 'body' && data.column.index >= 2 && data.column.index < sessions.length + 2) {
          const v = data.cell.text[0];
          if (v === 'P') data.cell.styles.textColor = [30, 100, 60];
          else if (v === 'J') data.cell.styles.textColor = [120, 90, 0];
          else if (v === 'A') data.cell.styles.textColor = [120, 20, 20];
          data.cell.styles.halign = 'center';
          data.cell.styles.fontStyle = 'bold';
        }
      },
    });

    // ── Footer ───────────────────────────────────────────────────────
    const finalY = (doc as any).lastAutoTable?.finalY ?? 200;
    doc.setFontSize(7);
    doc.setTextColor(...GRAY);
    doc.text('P = Presente  ·  J = Justificado  ·  A = Ausente', 12, finalY + 6);
    doc.text('Generado por QR Assistance — TecNM Celaya', pageW - 12, finalY + 6, { align: 'right' });

    const pdfBuffer = Buffer.from(doc.output('arraybuffer'));

    return new Response(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="asistencia-${gs.group.name}-${gs.subject.name}.pdf"`,
      },
    });
  } catch (e) {
    if (e instanceof Response) return e;
    return fail('Error interno del servidor.', 500);
  }
}
