import { requireRole } from '@/lib/auth-helpers';
import { getReportData } from '@/lib/db/queries/reports';
import { fail } from '@/lib/utils';
import * as XLSX from 'xlsx';

export async function GET(req: Request) {
  try {
    await requireRole(['admin', 'teacher']);
    const { searchParams } = new URL(req.url);
    const groupSubjectId = Number(searchParams.get('groupSubjectId'));
    if (!groupSubjectId) return fail('groupSubjectId es requerido.', 422);

    const data = await getReportData(groupSubjectId);
    if (!data) return fail('Grupo-materia no encontrado.', 404);

    const { gs, sessions, students, avgRate } = data;

    const wb = XLSX.utils.book_new();

    // Summary sheet
    const summaryData = [
      ['Materia', gs.subject.name],
      ['Grupo', gs.group.name],
      ['Docente', gs.teacher.name],
      ['Sesiones cerradas', sessions.length],
      ['% Asistencia promedio', `${avgRate}%`],
    ];
    const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Resumen');

    // Detail sheet
    const headers = ['Alumno', 'Matrícula', ...sessions.map((s) => new Date(s.date).toLocaleDateString('es-MX')), '% Asistencia'];
    const rows = students.map((st) => [
      st.name,
      st.enrollmentNumber ?? '',
      ...sessions.map((s) => {
        const status = st.attsBySession[s.id] ?? 'absent';
        return status === 'present' ? 'P' : status === 'justified' ? 'J' : 'A';
      }),
      `${st.rate}%`,
    ]);
    const wsDetail = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    XLSX.utils.book_append_sheet(wb, wsDetail, 'Detalle');

    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    return new Response(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="reporte.xlsx"',
      },
    });
  } catch (e) {
    if (e instanceof Response) return e;
    return fail('Error interno del servidor.', 500);
  }
}
