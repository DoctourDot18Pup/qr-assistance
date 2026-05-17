import { requireRole } from '@/lib/auth-helpers';
import { getAllUsers } from '@/lib/db/queries/users';
import { ok, fail } from '@/lib/utils';

export async function GET() {
  try {
    await requireRole(['admin']);
    const data = await getAllUsers();
    return ok(data);
  } catch (e) {
    if (e instanceof Response) return e;
    return fail('Error interno del servidor.', 500);
  }
}
