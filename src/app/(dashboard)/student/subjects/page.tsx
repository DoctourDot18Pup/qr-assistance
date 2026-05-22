import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import {
  groupStudents, groups, groupSubjects, subjects, periods, users,
  attendances, classSessions,
} from "@/lib/db/schema";
import { eq, and, count, inArray } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { Header } from "@/components/shell/header";
import { SubjectAccordionList } from "./subject-accordion";

export default async function StudentSubjectsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const studentId = Number(session.user.id);

  const teacher = alias(users, "teacher");

  const mySubjects = await db
    .select({
      gsId:        groupSubjects.id,
      groupName:   groups.name,
      subjectName: subjects.name,
      teacherName: teacher.name,
    })
    .from(groupStudents)
    .innerJoin(groupSubjects, eq(groupStudents.groupSubjectId, groupSubjects.id))
    .innerJoin(groups,       eq(groupSubjects.groupId,         groups.id))
    .innerJoin(subjects,     eq(groupSubjects.subjectId,       subjects.id))
    .innerJoin(periods,      eq(groups.periodId,               periods.id))
    .innerJoin(teacher,      eq(groupSubjects.teacherId,       teacher.id))
    .where(and(
      eq(groupStudents.studentId, studentId),
      eq(periods.active, true),
    ))
    .orderBy(subjects.name);

  const gsIds = mySubjects.map(s => s.gsId);

  // Per-subject attendance percentage (for badge in accordion header)
  const statsMap: Record<number, { total: number; attended: number }> = {};
  for (const s of mySubjects) statsMap[s.gsId] = { total: 0, attended: 0 };

  // Per-session rows for accordion body
  const sessionsByGs: Record<number, { date: string; status: string | null }[]> = {};
  for (const s of mySubjects) sessionsByGs[s.gsId] = [];

  if (gsIds.length > 0) {
    const [statsRows, sessionRows] = await Promise.all([
      db
        .select({
          gsId:   classSessions.groupSubjectId,
          status: attendances.status,
          n:      count(),
        })
        .from(attendances)
        .innerJoin(classSessions, eq(attendances.classSessionId, classSessions.id))
        .where(and(
          eq(attendances.studentId, studentId),
          eq(classSessions.status, "closed"),
          inArray(classSessions.groupSubjectId, gsIds),
        ))
        .groupBy(classSessions.groupSubjectId, attendances.status),

      db
        .select({
          gsId:   classSessions.groupSubjectId,
          date:   classSessions.date,
          status: attendances.status,
        })
        .from(classSessions)
        .leftJoin(
          attendances,
          and(
            eq(attendances.classSessionId, classSessions.id),
            eq(attendances.studentId, studentId),
          ),
        )
        .where(and(
          inArray(classSessions.groupSubjectId, gsIds),
          eq(classSessions.status, "closed"),
        ))
        .orderBy(classSessions.date),
    ]);

    for (const s of statsRows) {
      if (!statsMap[s.gsId]) continue;
      statsMap[s.gsId].total += Number(s.n);
      if (s.status === "present" || s.status === "justified")
        statsMap[s.gsId].attended += Number(s.n);
    }

    for (const row of sessionRows) {
      if (!sessionsByGs[row.gsId]) continue;
      const d = row.date instanceof Date
        ? row.date.toISOString()
        : String(row.date);
      sessionsByGs[row.gsId].push({ date: d, status: row.status ?? null });
    }
  }

  const subjectList = mySubjects.map(sub => {
    const st = statsMap[sub.gsId];
    const pct = st.total > 0 ? Math.round((st.attended / st.total) * 100) : null;
    return {
      gsId:        sub.gsId,
      groupName:   sub.groupName,
      subjectName: sub.subjectName,
      teacherName: sub.teacherName ?? "—",
      pct,
      sessions:    sessionsByGs[sub.gsId] ?? [],
    };
  });

  return (
    <div className="flex flex-col flex-1">
      <Header
        title="Mis materias"
        subtitle="Asistencia por sesión · solo sesiones cerradas"
      />

      <div className="flex-1 px-4 md:px-7 py-4 md:py-6">
        {subjectList.length === 0 ? (
          <div className="bg-white border border-[#D8CFB8] rounded-[6px] py-14 text-center text-[#6B6457] text-sm">
            No tienes materias registradas en el período activo.
          </div>
        ) : (
          <SubjectAccordionList subjects={subjectList} />
        )}
      </div>
    </div>
  );
}
