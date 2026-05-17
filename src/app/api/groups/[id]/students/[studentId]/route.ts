import { requireRole } from '@/lib/auth-helpers';
import { removeStudentFromGroup } from '@/lib/db/queries/groups';
import { ok, fail } from '@/lib/utils';

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; studentId: string }> }
) {
  try {
    await requireRole(['admin']);
    const { id, studentId } = await params;
    await removeStudentFromGroup(Number(id), Number(studentId));
    return ok(null, 'Alumno removido del grupo.');
  } catch (e) {
    if (e instanceof Response) return e;
    return fail('Error interno del servidor.', 500);
  }
}
