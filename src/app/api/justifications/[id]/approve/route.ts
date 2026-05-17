import { requireRole } from '@/lib/auth-helpers';
import { getJustificationById, approveJustification } from '@/lib/db/queries/justifications';
import { ok, fail } from '@/lib/utils';

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authSession = await requireRole(['teacher', 'admin']);
    const { id } = await params;
    const j = await getJustificationById(Number(id));
    if (!j) return fail('Justificante no encontrado.', 404);
    if (j.status !== 'pending') return fail('El justificante ya fue revisado.', 409);

    const reviewerId = Number((authSession.user as { id: string }).id);
    const updated = await approveJustification(Number(id), reviewerId);
    return ok(updated, 'Justificante aprobado.');
  } catch (e) {
    if (e instanceof Response) return e;
    return fail('Error interno del servidor.', 500);
  }
}
