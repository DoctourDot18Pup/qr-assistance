import { requireRole } from '@/lib/auth-helpers';
import { getJustificationById } from '@/lib/db/queries/justifications';
import { ok, fail } from '@/lib/utils';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authSession = await requireRole(['admin', 'teacher', 'student']);
    const { id } = await params;
    const j = await getJustificationById(Number(id));
    if (!j) return fail('Justificante no encontrado.', 404);
    return ok({ ...j, fileUrl: j.filePath });
  } catch (e) {
    if (e instanceof Response) return e;
    return fail('Error interno del servidor.', 500);
  }
}
