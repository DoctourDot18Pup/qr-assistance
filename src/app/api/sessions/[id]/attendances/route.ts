import { requireRole } from '@/lib/auth-helpers';
import { getSessionWithDetails } from '@/lib/db/queries/sessions';
import { getAttendancesBySession } from '@/lib/db/queries/attendance';
import { ok, fail } from '@/lib/utils';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authSession = await requireRole(['teacher', 'admin']);
    const { id } = await params;
    const session = await getSessionWithDetails(Number(id));
    if (!session) return fail('Sesión no encontrada.', 404);

    const role = (authSession.user as { role: string }).role;
    const userId = Number((authSession.user as { id: string }).id);
    if (role === 'teacher' && session.teacherId !== userId) return fail('Acceso denegado.', 403);

    const data = await getAttendancesBySession(Number(id));
    return ok(data);
  } catch (e) {
    if (e instanceof Response) return e;
    return fail('Error interno del servidor.', 500);
  }
}
