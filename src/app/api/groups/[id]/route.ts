import { requireRole } from '@/lib/auth-helpers';
import { getGroupById, updateGroup, deleteGroup } from '@/lib/db/queries/groups';
import { ok, fail } from '@/lib/utils';
import { z } from 'zod';

const updateSchema = z.object({
  name:     z.string().min(1).optional(),
  careerId: z.number().int().positive().optional(),
  periodId: z.number().int().positive().optional(),
});

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireRole(['admin']);
    const { id } = await params;
    const group = await getGroupById(Number(id));
    if (!group) return fail('Grupo no encontrado.', 404);
    return ok(group);
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
    const group = await updateGroup(Number(id), parsed.data);
    if (!group) return fail('Grupo no encontrado.', 404);
    return ok(group, 'Grupo actualizado.');
  } catch (e) {
    if (e instanceof Response) return e;
    return fail('Error interno del servidor.', 500);
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireRole(['admin']);
    const { id } = await params;
    await deleteGroup(Number(id));
    return ok(null, 'Grupo eliminado.');
  } catch (e) {
    if (e instanceof Response) return e;
    return fail('Error interno del servidor.', 500);
  }
}
