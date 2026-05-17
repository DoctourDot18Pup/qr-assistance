import { requireRole } from '@/lib/auth-helpers';
import { getSessionWithDetails, updateSession } from '@/lib/db/queries/sessions';
import { ok, fail } from '@/lib/utils';
import { z } from 'zod';

const updateSchema = z.object({
  toleranceMinutes: z.number().int().min(0).optional(),
  geoRadius:        z.number().int().optional(),
  geoEnabled:       z.boolean().optional(),
});

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authSession = await requireRole(['teacher', 'admin']);
    const { id } = await params;
    const session = await getSessionWithDetails(Number(id));
    if (!session) return fail('Sesión no encontrada.', 404);

    const role = (authSession.user as { role: string }).role;
    const userId = Number((authSession.user as { id: string }).id);
    if (role === 'teacher' && session.teacherId !== userId)
      return fail('Acceso denegado.', 403);

    return ok(session);
  } catch (e) {
    if (e instanceof Response) return e;
    return fail('Error interno del servidor.', 500);
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authSession = await requireRole(['teacher']);
    const { id } = await params;
    const session = await getSessionWithDetails(Number(id));
    if (!session) return fail('Sesión no encontrada.', 404);
    if (session.status !== 'active') return fail('Solo se pueden editar sesiones activas.', 409);
    const teacherId = Number((authSession.user as { id: string }).id);
    if (session.teacherId !== teacherId) return fail('Acceso denegado.', 403);

    const body = await req.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) return fail('Datos inválidos.', 422, parsed.error.flatten());
    const updated = await updateSession(Number(id), parsed.data);
    return ok(updated, 'Sesión actualizada.');
  } catch (e) {
    if (e instanceof Response) return e;
    return fail('Error interno del servidor.', 500);
  }
}
