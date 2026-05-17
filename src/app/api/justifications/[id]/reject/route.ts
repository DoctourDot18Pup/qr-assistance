import { requireRole } from '@/lib/auth-helpers';
import { getJustificationById, rejectJustification } from '@/lib/db/queries/justifications';
import { ok, fail } from '@/lib/utils';
import { z } from 'zod';

const schema = z.object({ rejectionReason: z.string().min(1) });

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authSession = await requireRole(['teacher', 'admin']);
    const { id } = await params;
    const j = await getJustificationById(Number(id));
    if (!j) return fail('Justificante no encontrado.', 404);
    if (j.status !== 'pending') return fail('El justificante ya fue revisado.', 409);

    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) return fail('Datos inválidos.', 422, parsed.error.flatten());

    const reviewerId = Number((authSession.user as { id: string }).id);
    const updated = await rejectJustification(Number(id), reviewerId, parsed.data.rejectionReason);
    return ok(updated, 'Justificante rechazado.');
  } catch (e) {
    if (e instanceof Response) return e;
    return fail('Error interno del servidor.', 500);
  }
}
