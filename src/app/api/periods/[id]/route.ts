import { requireRole } from '@/lib/auth-helpers';
import { getPeriodById, updatePeriod, deletePeriod } from '@/lib/db/queries/periods';
import { ok, fail } from '@/lib/utils';
import { z } from 'zod';

const updateSchema = z.object({
  name:      z.string().min(1).optional(),
  startDate: z.string().min(1).optional(),
  endDate:   z.string().min(1).optional(),
  active:    z.boolean().optional(),
});

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireRole(['admin']);
    const { id } = await params;
    const period = await getPeriodById(Number(id));
    if (!period) return fail('Período no encontrado.', 404);
    return ok(period);
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
    const period = await updatePeriod(Number(id), parsed.data);
    if (!period) return fail('Período no encontrado.', 404);
    return ok(period, 'Período actualizado.');
  } catch (e) {
    if (e instanceof Response) return e;
    return fail('Error interno del servidor.', 500);
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireRole(['admin']);
    const { id } = await params;
    await deletePeriod(Number(id));
    return ok(null, 'Período eliminado.');
  } catch (e) {
    if (e instanceof Response) return e;
    if (e instanceof Error) return fail(e.message, 409);
    return fail('Error interno del servidor.', 500);
  }
}
