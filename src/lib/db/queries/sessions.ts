import { db } from '@/lib/db';
import { classSessions, groupSubjects, groupStudents, attendances, users, subjects, groups } from '@/lib/db/schema';
import { eq, and, inArray } from 'drizzle-orm';
import type { NewClassSession } from '@/lib/db/schema';

export async function getSessionsByTeacher(teacherId: number, filters: { status?: string; groupSubjectId?: number } = {}) {
  const conditions = [eq(groupSubjects.teacherId, teacherId)];
  if (filters.status) conditions.push(eq(classSessions.status, filters.status));
  if (filters.groupSubjectId) conditions.push(eq(classSessions.groupSubjectId, filters.groupSubjectId));

  return db
    .select({
      id: classSessions.id,
      date: classSessions.date,
      status: classSessions.status,
      toleranceMinutes: classSessions.toleranceMinutes,
      geoEnabled: classSessions.geoEnabled,
      closedAt: classSessions.closedAt,
      createdAt: classSessions.createdAt,
      groupSubjectId: classSessions.groupSubjectId,
      subject: { id: subjects.id, name: subjects.name },
      group: { id: groups.id, name: groups.name },
    })
    .from(classSessions)
    .innerJoin(groupSubjects, eq(classSessions.groupSubjectId, groupSubjects.id))
    .innerJoin(subjects, eq(groupSubjects.subjectId, subjects.id))
    .innerJoin(groups, eq(groupSubjects.groupId, groups.id))
    .where(and(...conditions))
    .orderBy(classSessions.date);
}

export async function getSessionById(id: number) {
  const [session] = await db
    .select()
    .from(classSessions)
    .where(eq(classSessions.id, id))
    .limit(1);
  return session ?? null;
}

export async function getSessionWithDetails(id: number) {
  const [session] = await db
    .select({
      id: classSessions.id,
      date: classSessions.date,
      status: classSessions.status,
      toleranceMinutes: classSessions.toleranceMinutes,
      latitude: classSessions.latitude,
      longitude: classSessions.longitude,
      geoRadius: classSessions.geoRadius,
      geoEnabled: classSessions.geoEnabled,
      closedAt: classSessions.closedAt,
      createdAt: classSessions.createdAt,
      groupSubjectId: classSessions.groupSubjectId,
      teacherId: groupSubjects.teacherId,
      subject: { id: subjects.id, name: subjects.name },
      group: { id: groups.id, name: groups.name },
    })
    .from(classSessions)
    .innerJoin(groupSubjects, eq(classSessions.groupSubjectId, groupSubjects.id))
    .innerJoin(subjects, eq(groupSubjects.subjectId, subjects.id))
    .innerJoin(groups, eq(groupSubjects.groupId, groups.id))
    .where(eq(classSessions.id, id))
    .limit(1);

  return session ?? null;
}

export async function createSession(data: NewClassSession) {
  const [session] = await db.insert(classSessions).values(data).returning();

  const students = await db
    .select({ studentId: groupStudents.studentId })
    .from(groupStudents)
    .innerJoin(groupSubjects, eq(groupStudents.groupId, groupSubjects.groupId))
    .where(eq(groupSubjects.id, data.groupSubjectId!));

  if (students.length > 0) {
    await db.insert(attendances).values(
      students.map((s) => ({
        classSessionId: session.id,
        studentId: s.studentId,
        status: 'absent' as const,
      }))
    );
  }

  return session;
}

export async function updateSession(id: number, data: Partial<NewClassSession>) {
  const [session] = await db
    .update(classSessions)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(classSessions.id, id))
    .returning();
  return session ?? null;
}

export async function closeSession(id: number) {
  const [session] = await db
    .update(classSessions)
    .set({ status: 'closed', closedAt: new Date(), updatedAt: new Date() })
    .where(eq(classSessions.id, id))
    .returning();
  return session ?? null;
}

export async function getGroupSubjectForTeacher(gsId: number, teacherId: number) {
  const [gs] = await db
    .select()
    .from(groupSubjects)
    .where(and(eq(groupSubjects.id, gsId), eq(groupSubjects.teacherId, teacherId)))
    .limit(1);
  return gs ?? null;
}
