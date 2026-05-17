import { requireRole } from '@/lib/auth-helpers';
import { addStudentToGroup } from '@/lib/db/queries/groups';
import { getUserById } from '@/lib/db/queries/users';
import { ok, fail } from '@/lib/utils';
import { z } from 'zod';

const schema = z.object({
  studentId: z.number().int().positive(),
});

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireRole(['admin']);
    const { id } = await params;
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) return fail('Datos inválidos.', 422, parsed.error.flatten());

    const student = await getUserById(parsed.data.studentId);
    if (!student || student.role !== 'student')
      return fail('El usuario no es un alumno válido.', 422);

    const gs = await addStudentToGroup(Number(id), parsed.data.studentId);
    return ok(gs, 'Alumno inscrito al grupo.', 201);
  } catch (e) {
    if (e instanceof Response) return e;
    return fail('Error interno del servidor.', 500);
  }
}
