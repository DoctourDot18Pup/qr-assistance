import { requireRole } from '@/lib/auth-helpers';
import { getNotificationsForUser } from '@/lib/db/queries/notifications';
import { ok, fail } from '@/lib/utils';

export async function GET(req: Request) {
  try {
    const authSession = await requireRole(['admin', 'teacher', 'student']);
    const userId = Number((authSession.user as { id: string }).id);
    const { searchParams } = new URL(req.url);
    const unreadOnly = searchParams.get('unreadOnly') === 'true';
    const data = await getNotificationsForUser(userId, unreadOnly);
    return ok(data);
  } catch (e) {
    if (e instanceof Response) return e;
    return fail('Error interno del servidor.', 500);
  }
}
