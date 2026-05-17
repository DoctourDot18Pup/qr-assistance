import { requireRole } from '@/lib/auth-helpers';
import { getAllPeriods, createPeriod } from '@/lib/db/queries/periods';
import { ok, fail } from '@/lib/utils';
import { z } from 'zod';

const createSchema = z.object({
  name:      z.string().min(1),
  startDate: z.string().min(1),
  endDate:   z.string().min(1),
  active:    z.boolean().optional(),
});

export async function GET() {
  try {
    await requireRole(['admin']);
    const data = await getAllPeriods();
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
    const period = await createPeriod(parsed.data);
    return ok(period, 'Período creado.', 201);
  } catch (e) {
    if (e instanceof Response) return e;
    return fail('Error interno del servidor.', 500);
  }
}
