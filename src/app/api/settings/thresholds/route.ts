import { requireRole } from '@/lib/auth-helpers';
import { getThresholds, updateThreshold } from '@/lib/db/queries/settings';
import { ok, fail } from '@/lib/utils';
import { z } from 'zod';

const updateSchema = z.object({
  attendanceWarning:  z.number().int().min(1).max(100),
  attendanceRisk:     z.number().int().min(1).max(100),
  attendanceCritical: z.number().int().min(1).max(100),
}).refine(
  (d) => d.attendanceCritical < d.attendanceRisk && d.attendanceRisk < d.attendanceWarning,
  { message: 'Debe cumplirse: crítico < riesgo < advertencia ≤ 100.' }
);

export async function GET() {
  try {
    await requireRole(['admin']);
    const data = await getThresholds();
    return ok(data);
  } catch (e) {
    if (e instanceof Response) return e;
    return fail('Error interno del servidor.', 500);
  }
}

export async function PUT(req: Request) {
  try {
    await requireRole(['admin']);
    const body = await req.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) return fail('Datos inválidos.', 422, parsed.error.flatten());

    await updateThreshold('attendance_warning', parsed.data.attendanceWarning);
    await updateThreshold('attendance_risk', parsed.data.attendanceRisk);
    await updateThreshold('attendance_critical', parsed.data.attendanceCritical);

    const updated = await getThresholds();
    return ok(updated, 'Umbrales actualizados.');
  } catch (e) {
    if (e instanceof Response) return e;
    return fail('Error interno del servidor.', 500);
  }
}
