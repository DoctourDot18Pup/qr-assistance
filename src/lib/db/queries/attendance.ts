import { db } from '@/lib/db';
import { attendances, classSessions, groupSubjects, groupStudents, subjects, groups, users } from '@/lib/db/schema';
import { eq, and, inArray } from 'drizzle-orm';

export async function getAttendanceBySessionAndStudent(sessionId: number, studentId: number) {
  const [att] = await db
    .select()
    .from(attendances)
    .where(and(eq(attendances.classSessionId, sessionId), eq(attendances.studentId, studentId)))
    .limit(1);
  return att ?? null;
}

export async function markPresent(sessionId: number, studentId: number, method: string, lat?: string, lon?: string) {
  const [att] = await db
    .update(attendances)
    .set({ status: 'present', method, latitude: lat, longitude: lon, registeredAt: new Date(), updatedAt: new Date() })
    .where(and(eq(attendances.classSessionId, sessionId), eq(attendances.studentId, studentId)))
    .returning();
  return att ?? null;
}

export async function setAttendanceStatus(sessionId: number, studentId: number, status: string) {
  const [att] = await db
    .update(attendances)
    .set({ status, updatedAt: new Date() })
    .where(and(eq(attendances.classSessionId, sessionId), eq(attendances.studentId, studentId)))
    .returning();
  return att ?? null;
}

export async function getAttendancesBySession(sessionId: number) {
  return db
    .select({
      id: attendances.id,
      status: attendances.status,
      method: attendances.method,
      registeredAt: attendances.registeredAt,
      student: {
        id: users.id,
        name: users.name,
        email: users.email,
        enrollmentNumber: users.enrollmentNumber,
      },
    })
    .from(attendances)
    .innerJoin(users, eq(attendances.studentId, users.id))
    .where(eq(attendances.classSessionId, sessionId))
    .orderBy(users.name);
}

export async function getStudentAttendanceHistory(studentId: number, groupSubjectId?: number) {
  const rows = await db
    .select({
      id: attendances.id,
      status: attendances.status,
      method: attendances.method,
      registeredAt: attendances.registeredAt,
      sessionDate: classSessions.date,
      sessionStatus: classSessions.status,
      groupSubjectId: classSessions.groupSubjectId,
      subjectName: subjects.name,
      groupName: groups.name,
    })
    .from(attendances)
    .innerJoin(classSessions, eq(attendances.classSessionId, classSessions.id))
    .innerJoin(groupSubjects, eq(classSessions.groupSubjectId, groupSubjects.id))
    .innerJoin(subjects, eq(groupSubjects.subjectId, subjects.id))
    .innerJoin(groups, eq(groupSubjects.groupId, groups.id))
    .where(
      and(
        eq(attendances.studentId, studentId),
        groupSubjectId ? eq(classSessions.groupSubjectId, groupSubjectId) : undefined
      )
    )
    .orderBy(classSessions.date);

  // Calculate rate per subject
  const rateMap: Record<number, { total: number; attended: number }> = {};
  for (const row of rows) {
    if (!rateMap[row.groupSubjectId]) rateMap[row.groupSubjectId] = { total: 0, attended: 0 };
    if (row.sessionStatus === 'closed') {
      rateMap[row.groupSubjectId].total++;
      if (row.status === 'present' || row.status === 'justified') rateMap[row.groupSubjectId].attended++;
    }
  }

  return { rows, rateMap };
}

export async function getAttendanceById(id: number) {
  const [att] = await db.select().from(attendances).where(eq(attendances.id, id)).limit(1);
  return att ?? null;
}
