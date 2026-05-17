import { requireRole } from '@/lib/auth-helpers';
import { getReportData } from '@/lib/db/queries/reports';
import { fail } from '@/lib/utils';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export async function GET(req: Request) {
  try {
    await requireRole(['admin', 'teacher']);
    const { searchParams } = new URL(req.url);
    const groupSubjectId = Number(searchParams.get('groupSubjectId'));
    if (!groupSubjectId) return fail('groupSubjectId es requerido.', 422);

    const data = await getReportData(groupSubjectId);
    if (!data) return fail('Grupo-materia no encontrado.', 404);

    const { gs, sessions, students, avgRate } = data;

    const doc = new jsPDF({ orientation: sessions.length > 10 ? 'landscape' : 'portrait' });

    doc.setFontSize(16);
    doc.text('Reporte de Asistencia', 14, 16);
    doc.setFontSize(11);
    doc.text(`Materia: ${gs.subject.name} | Grupo: ${gs.group.name}`, 14, 24);
    doc.text(`Docente: ${gs.teacher.name} | Asistencia promedio: ${avgRate}%`, 14, 30);

    const head = [['Alumno', 'Matrícula', ...sessions.map((s) => new Date(s.date).toLocaleDateString('es-MX')), '%']];
    const body = students.map((st) => [
      st.name,
      st.enrollmentNumber ?? '',
      ...sessions.map((s) => {
        const status = st.attsBySession[s.id] ?? 'absent';
        return status === 'present' ? 'P' : status === 'justified' ? 'J' : 'A';
      }),
      `${st.rate}%`,
    ]);

    autoTable(doc, {
      head,
      body,
      startY: 36,
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [30, 64, 175] },
    });

    const pdfBuffer = Buffer.from(doc.output('arraybuffer'));

    return new Response(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="reporte.pdf"',
      },
    });
  } catch (e) {
    if (e instanceof Response) return e;
    return fail('Error interno del servidor.', 500);
  }
}
