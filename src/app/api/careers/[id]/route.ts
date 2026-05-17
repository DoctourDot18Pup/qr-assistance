import { requireRole } from '@/lib/auth-helpers';
import { getCareerById, updateCareer, deleteCareer } from '@/lib/db/queries/careers';
import { ok, fail } from '@/lib/utils';
import { z } from 'zod';

const updateSchema = z.object({
  name:   z.string().min(1).optional(),
  code:   z.string().min(1).optional(),
  active: z.boolean().optional(),
});

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireRole(['admin']);
    const { id } = await params;
    const career = await getCareerById(Number(id));
    if (!career) return fail('Carrera no encontrada.', 404);
    return ok(career);
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
    const career = await updateCareer(Number(id), parsed.data);
    if (!career) return fail('Carrera no encontrada.', 404);
    return ok(career, 'Carrera actualizada.');
  } catch (e) {
    if (e instanceof Response) return e;
    return fail('Error interno del servidor.', 500);
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireRole(['admin']);
    const { id } = await params;
    await deleteCareer(Number(id));
    return ok(null, 'Carrera eliminada.');
  } catch (e) {
    if (e instanceof Response) return e;
    if (e instanceof Error) return fail(e.message, 409);
    return fail('Error interno del servidor.', 500);
  }
}
