import { requireRole } from '@/lib/auth-helpers';
import { getSessionsByTeacher, createSession, getGroupSubjectForTeacher } from '@/lib/db/queries/sessions';
import { ok, fail } from '@/lib/utils';
import { z } from 'zod';

const createSchema = z.object({
  groupSubjectId:   z.number().int().positive(),
  date:             z.string().min(1),
  toleranceMinutes: z.number().int().min(0).optional(),
  latitude:         z.number().optional(),
  longitude:        z.number().optional(),
  geoRadius:        z.number().int().optional(),
  geoEnabled:       z.boolean().optional(),
});

export async function GET(req: Request) {
  try {
    const session = await requireRole(['teacher']);
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') ?? undefined;
    const groupSubjectId = searchParams.get('groupSubjectId') ? Number(searchParams.get('groupSubjectId')) : undefined;
    const teacherId = Number((session.user as { id: string }).id);
    const data = await getSessionsByTeacher(teacherId, { status, groupSubjectId });
    return ok(data);
  } catch (e) {
    if (e instanceof Response) return e;
    return fail('Error interno del servidor.', 500);
  }
}

export async function POST(req: Request) {
  try {
    const session = await requireRole(['teacher']);
    const body = await req.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) return fail('Datos inválidos.', 422, parsed.error.flatten());

    const teacherId = Number((session.user as { id: string }).id);
    const gs = await getGroupSubjectForTeacher(parsed.data.groupSubjectId, teacherId);
    if (!gs) return fail('No tienes acceso a este grupo-materia.', 403);

    const classSession = await createSession({
      groupSubjectId: parsed.data.groupSubjectId,
      date: new Date(parsed.data.date),
      toleranceMinutes: parsed.data.toleranceMinutes,
      latitude: parsed.data.latitude?.toString(),
      longitude: parsed.data.longitude?.toString(),
      geoRadius: parsed.data.geoRadius,
      geoEnabled: parsed.data.geoEnabled,
    });
    return ok(classSession, 'Sesión creada.', 201);
  } catch (e) {
    if (e instanceof Response) return e;
    return fail('Error interno del servidor.', 500);
  }
}
