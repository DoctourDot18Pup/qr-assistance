import { requireRole } from '@/lib/auth-helpers';
import { getSessionWithDetails, closeSession } from '@/lib/db/queries/sessions';
import { checkAttendanceAlerts } from '@/lib/alerts';
import { ok, fail } from '@/lib/utils';

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authSession = await requireRole(['teacher']);
    const { id } = await params;
    const session = await getSessionWithDetails(Number(id));
    if (!session) return fail('Sesión no encontrada.', 404);
    if (session.status !== 'active') return fail('La sesión ya está cerrada o cancelada.', 409);

    const teacherId = Number((authSession.user as { id: string }).id);
    if (session.teacherId !== teacherId) return fail('Acceso denegado.', 403);

    const closed = await closeSession(Number(id));
    await checkAttendanceAlerts(Number(id)).catch(() => {});
    return ok(closed, 'Sesión cerrada.');
  } catch (e) {
    if (e instanceof Response) return e;
    return fail('Error interno del servidor.', 500);
  }
}
