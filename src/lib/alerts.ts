import { db } from '@/lib/db';
import { classSessions, groupStudents, groupSubjects, attendances, subjects } from '@/lib/db/schema';
import { eq, and, count, inArray } from 'drizzle-orm';
import { getThresholds } from '@/lib/db/queries/settings';
import { insertNotification } from '@/lib/db/queries/notifications';

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
  if (totalClosed === 0) return;

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

    let type: string | null = null;
    let minRequired: number | null = null;

    if (rate < thresholds.attendanceCritical) {
      type = 'critical';
      minRequired = thresholds.attendanceCritical;
    } else if (rate < thresholds.attendanceRisk) {
      type = 'risk';
      minRequired = thresholds.attendanceRisk;
    } else if (rate < thresholds.attendanceWarning) {
      type = 'warning';
      minRequired = thresholds.attendanceWarning;
    }

    if (type && minRequired !== null) {
      await insertNotification({
        userId: studentId,
        type,
        message: `Tu asistencia en ${subjectName} es ${rate}%. El mínimo requerido es ${minRequired}%.`,
      });
    }
  }
}
