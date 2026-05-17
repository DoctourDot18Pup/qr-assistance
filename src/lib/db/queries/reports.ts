import { db } from '@/lib/db';
import { classSessions, attendances, groupSubjects, subjects, groups, users, groupStudents } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

export async function getReportData(groupSubjectId: number) {
  const [gs] = await db
    .select({
      id: groupSubjects.id,
      subject: { id: subjects.id, name: subjects.name },
      group: { id: groups.id, name: groups.name },
      teacher: { id: users.id, name: users.name },
    })
    .from(groupSubjects)
    .innerJoin(subjects, eq(groupSubjects.subjectId, subjects.id))
    .innerJoin(groups, eq(groupSubjects.groupId, groups.id))
    .innerJoin(users, eq(groupSubjects.teacherId, users.id))
    .where(eq(groupSubjects.id, groupSubjectId))
    .limit(1);

  if (!gs) return null;

  const sessions = await db
    .select({ id: classSessions.id, date: classSessions.date, status: classSessions.status })
    .from(classSessions)
    .where(and(eq(classSessions.groupSubjectId, groupSubjectId), eq(classSessions.status, 'closed')))
    .orderBy(classSessions.date);

  const studentRows = await db
    .select({ id: users.id, name: users.name, email: users.email, enrollmentNumber: users.enrollmentNumber })
    .from(groupStudents)
    .innerJoin(users, eq(groupStudents.studentId, users.id))
    .where(eq(groupStudents.groupId, gs.group.id))
    .orderBy(users.name);

  const allAttendances = await db
    .select({ classSessionId: attendances.classSessionId, studentId: attendances.studentId, status: attendances.status })
    .from(attendances)
    .where(eq(attendances.classSessionId, sessions.length > 0 ? sessions[0].id : -1));

  // Build attendance map
  const attMap: Record<number, Record<number, string>> = {};
  for (const s of sessions) {
    const atts = await db
      .select({ studentId: attendances.studentId, status: attendances.status })
      .from(attendances)
      .where(eq(attendances.classSessionId, s.id));
    attMap[s.id] = {};
    for (const a of atts) attMap[s.id][a.studentId] = a.status;
  }

  const students = studentRows.map((st) => {
    const attsBySession: Record<number, string> = {};
    let attended = 0;
    for (const s of sessions) {
      const status = attMap[s.id]?.[st.id] ?? 'absent';
      attsBySession[s.id] = status;
      if (status === 'present' || status === 'justified') attended++;
    }
    const rate = sessions.length > 0 ? Math.round((attended / sessions.length) * 100) : 100;
    return { ...st, attsBySession, attended, rate };
  });

  const avgRate = students.length > 0
    ? Math.round(students.reduce((acc, s) => acc + s.rate, 0) / students.length)
    : 0;

  return { gs, sessions, students, avgRate };
}
