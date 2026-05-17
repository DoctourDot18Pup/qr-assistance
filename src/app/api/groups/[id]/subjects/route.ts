import { requireRole } from '@/lib/auth-helpers';
import { addSubjectToGroup } from '@/lib/db/queries/groups';
import { getUserById } from '@/lib/db/queries/users';
import { ok, fail } from '@/lib/utils';
import { z } from 'zod';

const schema = z.object({
  subjectId: z.number().int().positive(),
  teacherId: z.number().int().positive(),
});

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireRole(['admin']);
    const { id } = await params;
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) return fail('Datos inválidos.', 422, parsed.error.flatten());

    const teacher = await getUserById(parsed.data.teacherId);
    if (!teacher || teacher.role !== 'teacher')
      return fail('El usuario no es un docente válido.', 422);

    const gs = await addSubjectToGroup(Number(id), parsed.data.subjectId, parsed.data.teacherId);
    return ok(gs, 'Materia asignada al grupo.', 201);
  } catch (e) {
    if (e instanceof Response) return e;
    return fail('Error interno del servidor.', 500);
  }
}
