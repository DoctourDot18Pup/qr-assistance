import { requireRole } from '@/lib/auth-helpers';
import { getSessionWithDetails } from '@/lib/db/queries/sessions';
import { setAttendanceStatus } from '@/lib/db/queries/attendance';
import { ok, fail } from '@/lib/utils';
import { z } from 'zod';

const schema = z.object({
  sessionId: z.number().int().positive(),
  studentId: z.number().int().positive(),
  status:    z.enum(['present', 'absent', 'justified']),
});

export async function POST(req: Request) {
  try {
    const authSession = await requireRole(['teacher']);
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) return fail('Datos inválidos.', 422, parsed.error.flatten());

    const teacherId = Number((authSession.user as { id: string }).id);
    const session = await getSessionWithDetails(parsed.data.sessionId);
    if (!session) return fail('Sesión no encontrada.', 404);
    if (session.teacherId !== teacherId) return fail('Acceso denegado.', 403);

    const att = await setAttendanceStatus(parsed.data.sessionId, parsed.data.studentId, parsed.data.status);
    if (!att) return fail('Registro de asistencia no encontrado.', 404);
    return ok(att, 'Asistencia actualizada.');
  } catch (e) {
    if (e instanceof Response) return e;
    return fail('Error interno del servidor.', 500);
  }
}
