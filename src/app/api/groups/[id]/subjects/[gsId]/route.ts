import { requireRole } from '@/lib/auth-helpers';
import { removeSubjectFromGroup, getGroupSubjectById, groupSubjectHasSessions } from '@/lib/db/queries/groups';
import { ok, fail } from '@/lib/utils';

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string; gsId: string }> }) {
  try {
    await requireRole(['admin']);
    const { gsId } = await params;
    const gs = await getGroupSubjectById(Number(gsId));
    if (!gs) return fail('Asignación no encontrada.', 404);

    const hasSessions = await groupSubjectHasSessions(Number(gsId));
    if (hasSessions) return fail('La asignación tiene sesiones y no puede eliminarse.', 409);

    await removeSubjectFromGroup(Number(gsId));
    return ok(null, 'Materia removida del grupo.');
  } catch (e) {
    if (e instanceof Response) return e;
    return fail('Error interno del servidor.', 500);
  }
}
