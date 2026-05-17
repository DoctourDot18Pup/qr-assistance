import { requireRole } from '@/lib/auth-helpers';
import { db } from '@/lib/db';
import { groupStudents, groupSubjects, subjects, groups, users, classSessions, attendances, justifications } from '@/lib/db/schema';
import { eq, and, count, desc } from 'drizzle-orm';
import { getThresholds } from '@/lib/db/queries/settings';
import { ok, fail } from '@/lib/utils';

export async function GET() {
  try {
    const authSession = await requireRole(['student']);
    const studentId = Number((authSession.user as { id: string }).id);
    const thresholds = await getThresholds();

    const enrolled = await db
      .select({
        groupSubjectId: groupSubjects.id,
        subjectName: subjects.name,
        groupName: groups.name,
        teacherName: users.name,
      })
      .from(groupStudents)
      .innerJoin(groupSubjects, eq(groupStudents.groupId, groupSubjects.groupId))
      .innerJoin(subjects, eq(groupSubjects.subjectId, subjects.id))
      .innerJoin(groups, eq(groupSubjects.groupId, groups.id))
      .innerJoin(users, eq(groupSubjects.teacherId, users.id))
      .where(eq(groupStudents.studentId, studentId));

    const enrolledSubjects = await Promise.all(
      enrolled.map(async (e) => {
        const closedSessions = await db
          .select({ id: classSessions.id })
          .from(classSessions)
          .where(and(eq(classSessions.groupSubjectId, e.groupSubjectId), eq(classSessions.status, 'closed')));

        let attended = 0;
        const totalSessions = closedSessions.length;
        for (const s of closedSessions) {
          const [att] = await db.select({ count: count() }).from(attendances)
            .where(and(eq(attendances.classSessionId, s.id), eq(attendances.studentId, studentId),
              eq(attendances.status, 'present')));
          const [justified] = await db.select({ count: count() }).from(attendances)
            .where(and(eq(attendances.classSessionId, s.id), eq(attendances.studentId, studentId),
              eq(attendances.status, 'justified')));
          attended += Number(att.count) + Number(justified.count);
        }

        const attendanceRate = totalSessions > 0 ? Math.round((attended / totalSessions) * 100) : 100;
        const status =
          attendanceRate < thresholds.attendanceCritical ? 'critical'
          : attendanceRate < thresholds.attendanceRisk ? 'risk'
          : attendanceRate < thresholds.attendanceWarning ? 'warning'
          : 'ok';

        return { ...e, totalSessions, attended, attendanceRate, status };
      })
    );

    const [pendingCount] = await db
      .select({ count: count() })
      .from(justifications)
      .innerJoin(attendances, eq(justifications.attendanceId, attendances.id))
      .where(and(eq(attendances.studentId, studentId), eq(justifications.status, 'pending')));

    const recentAttendances = await db
      .select()
      .from(attendances)
      .where(eq(attendances.studentId, studentId))
      .orderBy(desc(attendances.createdAt))
      .limit(5);

    return ok({
      enrolledSubjects,
      pendingJustifications: Number(pendingCount.count),
      recentAttendances,
    });
  } catch (e) {
    if (e instanceof Response) return e;
    return fail('Error interno del servidor.', 500);
  }
}
