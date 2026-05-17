import { requireRole } from '@/lib/auth-helpers';
import { markNotificationRead } from '@/lib/db/queries/notifications';
import { ok, fail } from '@/lib/utils';

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authSession = await requireRole(['admin', 'teacher', 'student']);
    const { id } = await params;
    const userId = Number((authSession.user as { id: string }).id);
    await markNotificationRead(Number(id), userId);
    return ok(null, 'Notificación marcada como leída.');
  } catch (e) {
    if (e instanceof Response) return e;
    return fail('Error interno del servidor.', 500);
  }
}
