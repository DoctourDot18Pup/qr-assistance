import { requireRole } from '@/lib/auth-helpers';
import { db } from '@/lib/db';
import { groupSubjects, classSessions, subjects, groups, attendances, justifications } from '@/lib/db/schema';
import { eq, and, gte, lte, count } from 'drizzle-orm';
import { ok, fail } from '@/lib/utils';

export async function GET() {
  try {
    const authSession = await requireRole(['teacher']);
    const teacherId = Number((authSession.user as { id: string }).id);

    const myGroups = await db
      .select({
        id: groupSubjects.id,
        subjectId: groupSubjects.subjectId,
        groupId: groupSubjects.groupId,
        subject: { id: subjects.id, name: subjects.name, code: subjects.code },
        group: { id: groups.id, name: groups.name },
      })
      .from(groupSubjects)
      .innerJoin(subjects, eq(groupSubjects.subjectId, subjects.id))
      .innerJoin(groups, eq(groupSubjects.groupId, groups.id))
      .where(eq(groupSubjects.teacherId, teacherId));

    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 7);

    const gsIds = myGroups.map((g) => g.id);

    let sessionsThisWeek = 0;
    let activeSession = null;
    let pendingJustifications = 0;
    const attendanceSummary: {
      groupSubjectId: number;
      subjectName: string;
      groupName: string;
      totalSessions: number;
      avgAttendanceRate: number;
    }[] = [];

    if (gsIds.length > 0) {
      for (const gsId of gsIds) {
        const [weekCount] = await db
          .select({ count: count() })
          .from(classSessions)
          .where(and(eq(classSessions.groupSubjectId, gsId), gte(classSessions.date, startOfWeek), lte(classSessions.date, endOfWeek)));
        sessionsThisWeek += Number(weekCount.count);

        if (!activeSession) {
          const [active] = await db
            .select()
            .from(classSessions)
            .where(and(eq(classSessions.groupSubjectId, gsId), eq(classSessions.status, 'active')))
            .limit(1);
          if (active) activeSession = active;
        }

        const closedSessions = await db
          .select({ id: classSessions.id })
          .from(classSessions)
          .where(and(eq(classSessions.groupSubjectId, gsId), eq(classSessions.status, 'closed')));

        const gsInfo = myGroups.find((g) => g.id === gsId)!;
        let avgRate = 0;
        if (closedSessions.length > 0) {
          const sessionIds = closedSessions.map((s) => s.id);
          let totalPresent = 0;
          let totalRecords = 0;
          for (const sId of sessionIds) {
            const [total] = await db.select({ count: count() }).from(attendances).where(eq(attendances.classSessionId, sId));
            const [present] = await db.select({ count: count() }).from(attendances)
              .where(and(eq(attendances.classSessionId, sId), eq(attendances.status, 'present')));
            totalRecords += Number(total.count);
            totalPresent += Number(present.count);
          }
          if (totalRecords > 0) avgRate = Math.round((totalPresent / totalRecords) * 100);
        }

        attendanceSummary.push({
          groupSubjectId: gsId,
          subjectName: gsInfo.subject.name,
          groupName: gsInfo.group.name,
          totalSessions: closedSessions.length,
          avgAttendanceRate: avgRate,
        });
      }

      const sessionIds = (await db.select({ id: classSessions.id }).from(classSessions)
        .where(eq(classSessions.groupSubjectId, gsIds[0]))).map((s) => s.id);

      const [pendingCount] = await db
        .select({ count: count() })
        .from(justifications)
        .where(eq(justifications.status, 'pending'));
      pendingJustifications = Number(pendingCount.count);
    }

    return ok({ myGroups, sessionsThisWeek, activeSession, pendingJustifications, attendanceSummary });
  } catch (e) {
    if (e instanceof Response) return e;
    return fail('Error interno del servidor.', 500);
  }
}
