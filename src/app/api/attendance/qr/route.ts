import { requireRole } from '@/lib/auth-helpers';
import { verifyQrToken } from '@/lib/qr';
import { getSessionById } from '@/lib/db/queries/sessions';
import { getAttendanceBySessionAndStudent, markPresent } from '@/lib/db/queries/attendance';
import { ok, fail } from '@/lib/utils';
import { z } from 'zod';

const schema = z.object({
  qrToken:   z.string().min(1),
  latitude:  z.number().optional(),
  longitude: z.number().optional(),
});

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export async function POST(req: Request) {
  try {
    const authSession = await requireRole(['student']);
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) return fail('Datos inválidos.', 422, parsed.error.flatten());

    let sessionId: number;
    try {
      const payload = await verifyQrToken(parsed.data.qrToken);
      sessionId = payload.sessionId;
    } catch {
      return fail('QR inválido o expirado.', 401);
    }

    const classSession = await getSessionById(sessionId);
    if (!classSession || classSession.status !== 'active')
      return fail('La sesión no está activa.', 409);

    if (classSession.geoEnabled && parsed.data.latitude !== undefined && parsed.data.longitude !== undefined) {
      const dist = haversineDistance(
        Number(classSession.latitude),
        Number(classSession.longitude),
        parsed.data.latitude,
        parsed.data.longitude
      );
      if (dist > (classSession.geoRadius ?? 100))
        return fail(`Estás fuera del área permitida (${Math.round(dist)}m de distancia).`, 403);
    }

    const studentId = Number((authSession.user as { id: string }).id);
    const existing = await getAttendanceBySessionAndStudent(sessionId, studentId);
    if (!existing) return fail('No estás inscrito en esta sesión.', 404);
    if (existing.status === 'present') return fail('Tu asistencia ya fue registrada.', 409);

    const att = await markPresent(
      sessionId,
      studentId,
      'qr',
      parsed.data.latitude?.toString(),
      parsed.data.longitude?.toString()
    );
    return ok(att, 'Asistencia registrada.');
  } catch (e) {
    if (e instanceof Response) return e;
    return fail('Error interno del servidor.', 500);
  }
}
