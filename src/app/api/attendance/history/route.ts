import { requireRole } from '@/lib/auth-helpers';
import { getStudentAttendanceHistory } from '@/lib/db/queries/attendance';
import { ok, fail } from '@/lib/utils';

export async function GET(req: Request) {
  try {
    const authSession = await requireRole(['student']);
    const { searchParams } = new URL(req.url);
    const groupSubjectId = searchParams.get('groupSubjectId') ? Number(searchParams.get('groupSubjectId')) : undefined;
    const studentId = Number((authSession.user as { id: string }).id);
    const { rows, rateMap } = await getStudentAttendanceHistory(studentId, groupSubjectId);
    return ok({ attendances: rows, rateBySubject: rateMap });
  } catch (e) {
    if (e instanceof Response) return e;
    return fail('Error interno del servidor.', 500);
  }
}
