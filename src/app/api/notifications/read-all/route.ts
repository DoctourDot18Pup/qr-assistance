import { requireRole } from '@/lib/auth-helpers';
import { markAllNotificationsRead } from '@/lib/db/queries/notifications';
import { ok, fail } from '@/lib/utils';

export async function POST() {
  try {
    const authSession = await requireRole(['admin', 'teacher', 'student']);
    const userId = Number((authSession.user as { id: string }).id);
    await markAllNotificationsRead(userId);
    return ok(null, 'Todas las notificaciones marcadas como leídas.');
  } catch (e) {
    if (e instanceof Response) return e;
    return fail('Error interno del servidor.', 500);
  }
}
