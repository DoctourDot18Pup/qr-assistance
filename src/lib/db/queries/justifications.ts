import { db } from '@/lib/db';
import { justifications, attendances, classSessions, groupSubjects, groupStudents, subjects, groups, users } from '@/lib/db/schema';
import { eq, and, inArray } from 'drizzle-orm';

export async function getJustificationsForAdmin() {
  return db
    .select({
      id: justifications.id,
      status: justifications.status,
      description: justifications.description,
      filePath: justifications.filePath,
      rejectionReason: justifications.rejectionReason,
      createdAt: justifications.createdAt,
      reviewedAt: justifications.reviewedAt,
      attendance: { id: attendances.id, status: attendances.status, classSessionId: attendances.classSessionId },
      student: { id: users.id, name: users.name, email: users.email },
    })
    .from(justifications)
    .innerJoin(attendances, eq(justifications.attendanceId, attendances.id))
    .innerJoin(users, eq(attendances.studentId, users.id))
    .orderBy(justifications.createdAt);
}

export async function getJustificationsForTeacher(teacherId: number) {
  const teacherGsIds = await db
    .select({ id: groupSubjects.id })
    .from(groupSubjects)
    .where(eq(groupSubjects.teacherId, teacherId));

  if (teacherGsIds.length === 0) return [];

  const sessionIds = await db
    .select({ id: classSessions.id })
    .from(classSessions)
    .where(inArray(classSessions.groupSubjectId, teacherGsIds.map((g) => g.id)));

  if (sessionIds.length === 0) return [];

  return db
    .select({
      id: justifications.id,
      status: justifications.status,
      description: justifications.description,
      filePath: justifications.filePath,
      rejectionReason: justifications.rejectionReason,
      createdAt: justifications.createdAt,
      attendance: { id: attendances.id, status: attendances.status },
      student: { id: users.id, name: users.name, email: users.email },
    })
    .from(justifications)
    .innerJoin(attendances, eq(justifications.attendanceId, attendances.id))
    .innerJoin(users, eq(attendances.studentId, users.id))
    .where(inArray(attendances.classSessionId, sessionIds.map((s) => s.id)))
    .orderBy(justifications.createdAt);
}

export async function getJustificationsForStudent(studentId: number) {
  return db
    .select({
      id: justifications.id,
      status: justifications.status,
      description: justifications.description,
      filePath: justifications.filePath,
      rejectionReason: justifications.rejectionReason,
      createdAt: justifications.createdAt,
      attendance: { id: attendances.id, status: attendances.status, classSessionId: attendances.classSessionId },
    })
    .from(justifications)
    .innerJoin(attendances, eq(justifications.attendanceId, attendances.id))
    .where(eq(attendances.studentId, studentId))
    .orderBy(justifications.createdAt);
}

export async function getJustificationById(id: number) {
  const [j] = await db
    .select()
    .from(justifications)
    .where(eq(justifications.id, id))
    .limit(1);
  return j ?? null;
}

export async function createJustification(data: {
  attendanceId: number;
  description?: string;
  filePath?: string;
}) {
  const [j] = await db.insert(justifications).values(data).returning();
  return j;
}

export async function approveJustification(id: number, reviewedBy: number) {
  const [j] = await db
    .update(justifications)
    .set({ status: 'approved', reviewedBy, reviewedAt: new Date(), updatedAt: new Date() })
    .where(eq(justifications.id, id))
    .returning();

  if (j) {
    await db
      .update(attendances)
      .set({ status: 'justified', updatedAt: new Date() })
      .where(eq(attendances.id, j.attendanceId));
  }
  return j ?? null;
}

export async function rejectJustification(id: number, reviewedBy: number, rejectionReason: string) {
  const [j] = await db
    .update(justifications)
    .set({ status: 'rejected', reviewedBy, reviewedAt: new Date(), rejectionReason, updatedAt: new Date() })
    .where(eq(justifications.id, id))
    .returning();
  return j ?? null;
}
