import { requireRole } from '@/lib/auth-helpers';
import { getSessionWithDetails } from '@/lib/db/queries/sessions';
import { signQrToken } from '@/lib/qr';
import { ok, fail } from '@/lib/utils';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authSession = await requireRole(['teacher']);
    const { id } = await params;
    const session = await getSessionWithDetails(Number(id));
    if (!session) return fail('Sesión no encontrada.', 404);
    if (session.status !== 'active') return fail('La sesión no está activa.', 409);

    const teacherId = Number((authSession.user as { id: string }).id);
    if (session.teacherId !== teacherId) return fail('Acceso denegado.', 403);

    const token = await signQrToken(Number(id));
    return ok({ token });
  } catch (e) {
    if (e instanceof Response) return e;
    return fail('Error interno del servidor.', 500);
  }
}
