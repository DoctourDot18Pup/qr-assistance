import { requireRole } from '@/lib/auth-helpers';
import { getAllGroups, createGroup } from '@/lib/db/queries/groups';
import { ok, fail } from '@/lib/utils';
import { z } from 'zod';

const createSchema = z.object({
  name:     z.string().min(1),
  careerId: z.number().int().positive(),
  periodId: z.number().int().positive(),
});

export async function GET() {
  try {
    await requireRole(['admin']);
    const data = await getAllGroups();
    return ok(data);
  } catch (e) {
    if (e instanceof Response) return e;
    return fail('Error interno del servidor.', 500);
  }
}

export async function POST(req: Request) {
  try {
    await requireRole(['admin']);
    const body = await req.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) return fail('Datos inválidos.', 422, parsed.error.flatten());
    const group = await createGroup(parsed.data);
    return ok(group, 'Grupo creado.', 201);
  } catch (e) {
    if (e instanceof Response) return e;
    return fail('Error interno del servidor.', 500);
  }
}
