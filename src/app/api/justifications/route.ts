import { requireRole } from '@/lib/auth-helpers';
import {
  getJustificationsForAdmin,
  getJustificationsForTeacher,
  getJustificationsForStudent,
  createJustification,
} from '@/lib/db/queries/justifications';
import { getAttendanceById } from '@/lib/db/queries/attendance';
import { ok, fail } from '@/lib/utils';
import { put } from '@vercel/blob';

export async function GET() {
  try {
    const authSession = await requireRole(['admin', 'teacher', 'student']);
    const role = (authSession.user as { role: string }).role;
    const userId = Number((authSession.user as { id: string }).id);

    const data =
      role === 'admin'
        ? await getJustificationsForAdmin()
        : role === 'teacher'
        ? await getJustificationsForTeacher(userId)
        : await getJustificationsForStudent(userId);

    return ok(data);
  } catch (e) {
    if (e instanceof Response) return e;
    return fail('Error interno del servidor.', 500);
  }
}

export async function POST(req: Request) {
  try {
    const authSession = await requireRole(['student']);
    const studentId = Number((authSession.user as { id: string }).id);

    const formData = await req.formData();
    const attendanceId = Number(formData.get('attendanceId'));
    const description = formData.get('description')?.toString();
    const file = formData.get('file') as File | null;

    if (!attendanceId || isNaN(attendanceId))
      return fail('attendanceId es requerido.', 422);

    const att = await getAttendanceById(attendanceId);
    if (!att) return fail('Registro de asistencia no encontrado.', 404);
    if (att.studentId !== studentId) return fail('Acceso denegado.', 403);
    if (att.status !== 'absent') return fail('Solo se pueden justificar faltas.', 409);

    let filePath: string | undefined;
    if (file && process.env.BLOB_READ_WRITE_TOKEN) {
      const blob = await put(`justifications/${Date.now()}-${file.name}`, file, { access: 'public' });
      filePath = blob.url;
    }

    const j = await createJustification({ attendanceId, description, filePath });
    return ok(j, 'Justificante enviado.', 201);
  } catch (e) {
    if (e instanceof Response) return e;
    return fail('Error interno del servidor.', 500);
  }
}
