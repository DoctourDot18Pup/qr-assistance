import { db } from '@/lib/db';
import { classSessions, groupStudents, groupSubjects, attendances, subjects, notificationsLog } from '@/lib/db/schema';
import { eq, and, count, inArray, desc, like } from 'drizzle-orm';
import { getThresholds } from '@/lib/db/queries/settings';
import { insertNotification } from '@/lib/db/queries/notifications';

// Mínimo de sesiones cerradas antes de emitir cualquier alerta.
// Evita falsos positivos al inicio del período cuando cada sesión
// representa un porcentaje muy alto de la asistencia total.
const MIN_SESSIONS_BEFORE_ALERT = 3;

// Jerarquía de niveles: mayor número = mayor severidad.
const LEVEL_RANK: Record<string, number> = { warning: 1, risk: 2, critical: 3 };

export async function checkAttendanceAlerts(sessionId: number): Promise<void> {
  const [session] = await db
    .select({ groupSubjectId: classSessions.groupSubjectId })
    .from(classSessions)
    .where(eq(classSessions.id, sessionId))
    .limit(1);

  if (!session) return;

  const { groupSubjectId } = session;

  const [gs] = await db
    .select({ groupId: groupSubjects.groupId, subjectId: groupSubjects.subjectId })
    .from(groupSubjects)
    .where(eq(groupSubjects.id, groupSubjectId))
    .limit(1);

  if (!gs) return;

  const [subjectRow] = await db
    .select({ name: subjects.name })
    .from(subjects)
    .where(eq(subjects.id, gs.subjectId))
    .limit(1);

  const subjectName = subjectRow?.name ?? 'Materia';

  const closedSessions = await db
    .select({ id: classSessions.id })
    .from(classSessions)
    .where(and(eq(classSessions.groupSubjectId, groupSubjectId), eq(classSessions.status, 'closed')));

  const totalClosed = closedSessions.length;

  // Puerta mínima: no alertar hasta tener suficientes sesiones de referencia.
  if (totalClosed < MIN_SESSIONS_BEFORE_ALERT) return;

  const students = await db
    .select({ studentId: groupStudents.studentId })
    .from(groupStudents)
    .where(eq(groupStudents.groupId, gs.groupId));

  if (students.length === 0) return;

  const thresholds = await getThresholds();
  const closedSessionIds = closedSessions.map((s) => s.id);

  for (const { studentId } of students) {
    const [attended] = await db
      .select({ count: count() })
      .from(attendances)
      .where(
        and(
          eq(attendances.studentId, studentId),
          inArray(attendances.classSessionId, closedSessionIds),
          inArray(attendances.status, ['present', 'justified'])
        )
      );

    const rate = Math.round((Number(attended.count) / totalClosed) * 100);

    let newLevel: string | null = null;
    let minRequired: number | null = null;

    if (rate < thresholds.attendanceCritical) {
      newLevel = 'critical';
      minRequired = thresholds.attendanceCritical;
    } else if (rate < thresholds.attendanceRisk) {
      newLevel = 'risk';
      minRequired = thresholds.attendanceRisk;
    } else if (rate < thresholds.attendanceWarning) {
      newLevel = 'warning';
      minRequired = thresholds.attendanceWarning;
    }

    // Si la asistencia está dentro del rango aceptable, no hay alerta.
    if (!newLevel || minRequired === null) continue;

    // Buscar la última notificación enviada a este estudiante sobre esta materia.
    // Usamos LIKE sobre el mensaje porque la materia siempre aparece en él.
    const [lastNotif] = await db
      .select({ type: notificationsLog.type })
      .from(notificationsLog)
      .where(and(
        eq(notificationsLog.userId, studentId),
        like(notificationsLog.message, `%${subjectName}%`),
      ))
      .orderBy(desc(notificationsLog.createdAt))
      .limit(1);

    const lastLevel = lastNotif?.type ?? null;

    // Solo notificar si:
    // - Nunca se ha notificado antes por esta materia, O
    // - El nivel actual es PEOR que el último registrado (escalación).
    // Esto previene spam cuando el nivel se mantiene igual o mejora.
    if (lastLevel && (LEVEL_RANK[lastLevel] ?? 0) >= (LEVEL_RANK[newLevel] ?? 0)) continue;

    await insertNotification({
      userId: studentId,
      type: newLevel,
      message: `Tu asistencia en ${subjectName} es ${rate}% (${Number(attended.count)}/${totalClosed} sesiones). El mínimo requerido es ${minRequired}%.`,
    });
  }
}
