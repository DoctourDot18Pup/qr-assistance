import { db } from '@/lib/db';
import { groups, groupSubjects, groupStudents, careers, periods, subjects, users } from '@/lib/db/schema';
import { eq, count, and } from 'drizzle-orm';
import type { NewGroup } from '@/lib/db/schema';

export async function getAllGroups() {
  return db
    .select({
      id: groups.id,
      name: groups.name,
      createdAt: groups.createdAt,
      career: { id: careers.id, name: careers.name, code: careers.code },
      period: { id: periods.id, name: periods.name, active: periods.active },
    })
    .from(groups)
    .leftJoin(careers, eq(groups.careerId, careers.id))
    .leftJoin(periods, eq(groups.periodId, periods.id))
    .orderBy(groups.name);
}

export async function getGroupById(id: number) {
  const [group] = await db
    .select({
      id: groups.id,
      name: groups.name,
      careerId: groups.careerId,
      periodId: groups.periodId,
      createdAt: groups.createdAt,
      career: { id: careers.id, name: careers.name, code: careers.code },
      period: { id: periods.id, name: periods.name },
    })
    .from(groups)
    .leftJoin(careers, eq(groups.careerId, careers.id))
    .leftJoin(periods, eq(groups.periodId, periods.id))
    .where(eq(groups.id, id))
    .limit(1);

  if (!group) return null;

  const groupSubjectsList = await db
    .select({
      id: groupSubjects.id,
      subjectId: groupSubjects.subjectId,
      teacherId: groupSubjects.teacherId,
      subject: { id: subjects.id, name: subjects.name, code: subjects.code },
      teacher: { id: users.id, name: users.name, email: users.email },
    })
    .from(groupSubjects)
    .leftJoin(subjects, eq(groupSubjects.subjectId, subjects.id))
    .leftJoin(users, eq(groupSubjects.teacherId, users.id))
    .where(eq(groupSubjects.groupId, id));

  const studentsList = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      enrollmentNumber: users.enrollmentNumber,
    })
    .from(groupStudents)
    .innerJoin(users, eq(groupStudents.studentId, users.id))
    .where(eq(groupStudents.groupId, id));

  return { ...group, groupSubjects: groupSubjectsList, students: studentsList };
}

export async function createGroup(data: NewGroup) {
  const [group] = await db.insert(groups).values(data).returning();
  return group;
}

export async function updateGroup(id: number, data: Partial<NewGroup>) {
  const [group] = await db
    .update(groups)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(groups.id, id))
    .returning();
  return group ?? null;
}

export async function deleteGroup(id: number) {
  await db.delete(groups).where(eq(groups.id, id));
}

export async function addSubjectToGroup(groupId: number, subjectId: number, teacherId: number) {
  const [gs] = await db
    .insert(groupSubjects)
    .values({ groupId, subjectId, teacherId })
    .returning();
  return gs;
}

export async function removeSubjectFromGroup(gsId: number) {
  await db.delete(groupSubjects).where(eq(groupSubjects.id, gsId));
}

export async function addStudentToGroup(groupId: number, studentId: number) {
  const [gs] = await db
    .insert(groupStudents)
    .values({ groupId, studentId })
    .returning();
  return gs;
}

export async function removeStudentFromGroup(groupId: number, studentId: number) {
  await db
    .delete(groupStudents)
    .where(and(eq(groupStudents.groupId, groupId), eq(groupStudents.studentId, studentId)));
}

export async function getGroupSubjectById(gsId: number) {
  const [gs] = await db
    .select()
    .from(groupSubjects)
    .where(eq(groupSubjects.id, gsId))
    .limit(1);
  return gs ?? null;
}

export async function groupSubjectHasSessions(gsId: number) {
  const { classSessions } = await import('@/lib/db/schema');
  const [row] = await db
    .select({ count: count() })
    .from(classSessions)
    .where(eq(classSessions.groupSubjectId, gsId));
  return Number(row.count) > 0;
}
