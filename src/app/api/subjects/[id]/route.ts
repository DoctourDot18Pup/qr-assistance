import { requireRole } from '@/lib/auth-helpers';
import { getSubjectById, updateSubject, deleteSubject } from '@/lib/db/queries/subjects';
import { ok, fail } from '@/lib/utils';
import { z } from 'zod';

const updateSchema = z.object({
  name:          z.string().min(1).optional(),
  code:          z.string().min(1).optional(),
  totalSessions: z.number().int().min(0).optional(),
});

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireRole(['admin']);
    const { id } = await params;
    const subject = await getSubjectById(Number(id));
    if (!subject) return fail('Materia no encontrada.', 404);
    return ok(subject);
  } catch (e) {
    if (e instanceof Response) return e;
    return fail('Error interno del servidor.', 500);
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireRole(['admin']);
    const { id } = await params;
    const body = await req.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) return fail('Datos inválidos.', 422, parsed.error.flatten());
    const subject = await updateSubject(Number(id), parsed.data);
    if (!subject) return fail('Materia no encontrada.', 404);
    return ok(subject, 'Materia actualizada.');
  } catch (e) {
    if (e instanceof Response) return e;
    return fail('Error interno del servidor.', 500);
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireRole(['admin']);
    const { id } = await params;
    await deleteSubject(Number(id));
    return ok(null, 'Materia eliminada.');
  } catch (e) {
    if (e instanceof Response) return e;
    if (e instanceof Error) return fail(e.message, 409);
    return fail('Error interno del servidor.', 500);
  }
}
