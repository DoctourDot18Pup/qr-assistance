import { requireRole } from '@/lib/auth-helpers';
import { getAllSubjects, createSubject } from '@/lib/db/queries/subjects';
import { ok, fail } from '@/lib/utils';
import { z } from 'zod';

const createSchema = z.object({
  name:          z.string().min(1),
  code:          z.string().min(1),
  totalSessions: z.number().int().min(0),
});

export async function GET() {
  try {
    await requireRole(['admin']);
    const data = await getAllSubjects();
    return ok(data);
  } catch (e) {
    if (e instanceof Response) return e;
    return fail('Error interno del servidor.', 500);
  }
}

export async function POST(req: Request) {
  try {
    await requireRole(['admin']);
    const body = await req.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) return fail('Datos inválidos.', 422, parsed.error.flatten());
    const subject = await createSubject(parsed.data);
    return ok(subject, 'Materia creada.', 201);
  } catch (e) {
    if (e instanceof Response) return e;
    return fail('Error interno del servidor.', 500);
  }
}
