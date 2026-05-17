import { requireRole } from '@/lib/auth-helpers';
import { getAllCareers, createCareer } from '@/lib/db/queries/careers';
import { ok, fail } from '@/lib/utils';
import { z } from 'zod';

const createSchema = z.object({
  name:   z.string().min(1),
  code:   z.string().min(1),
  active: z.boolean().optional(),
});

export async function GET() {
  try {
    await requireRole(['admin']);
    const data = await getAllCareers();
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
    const career = await createCareer(parsed.data);
    return ok(career, 'Carrera creada.', 201);
  } catch (e) {
    if (e instanceof Response) return e;
    return fail('Error interno del servidor.', 500);
  }
}
