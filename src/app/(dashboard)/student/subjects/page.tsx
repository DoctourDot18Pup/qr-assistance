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
import { QrBadge, attendanceTone } from "@/components/ui/qr-badge";

export default async function StudentSubjectsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const studentId = Number(session.user.id);

  const teacher = alias(users, "teacher");

  const mySubjects = await db
    .select({
      gsId: groupSubjects.id,
      groupName: groups.name,
      subjectName: subjects.name,
      teacherName: teacher.name,
      periodName: periods.name,
    })
    .from(groupStudents)
    .innerJoin(groups, eq(groupStudents.groupId, groups.id))
    .innerJoin(groupSubjects, eq(groupSubjects.groupId, groups.id))
    .innerJoin(subjects, eq(groupSubjects.subjectId, subjects.id))
    .innerJoin(periods, eq(groups.periodId, periods.id))
    .innerJoin(teacher, eq(groupSubjects.teacherId, teacher.id))
    .where(eq(groupStudents.studentId, studentId))
    .orderBy(periods.active, subjects.name);

  const gsIds = mySubjects.map(s => s.gsId);

  const statsMap: Record<number, { total: number; attended: number; absent: number; justified: number }> = {};
  for (const s of mySubjects) statsMap[s.gsId] = { total: 0, attended: 0, absent: 0, justified: 0 };

  if (gsIds.length > 0) {
    const attendanceStats = await db
      .select({
        gsId: classSessions.groupSubjectId,
        status: attendances.status,
        n: count(),
      })
      .from(attendances)
      .innerJoin(classSessions, eq(attendances.classSessionId, classSessions.id))
      .where(and(
        eq(attendances.studentId, studentId),
        eq(classSessions.status, "closed"),
        inArray(classSessions.groupSubjectId, gsIds),
      ))
      .groupBy(classSessions.groupSubjectId, attendances.status);

    for (const s of attendanceStats) {
      if (!statsMap[s.gsId]) continue;
      statsMap[s.gsId].total += Number(s.n);
      if (s.status === "present")   statsMap[s.gsId].attended  += Number(s.n);
      if (s.status === "absent")    statsMap[s.gsId].absent    += Number(s.n);
      if (s.status === "justified") { statsMap[s.gsId].attended += Number(s.n); statsMap[s.gsId].justified += Number(s.n); }
    }
  }

  return (
    <div className="flex flex-col flex-1">
      <Header
        title="Mis materias"
        subtitle="Historial de asistencia por materia"
      />

      <div className="flex-1 px-4 md:px-7 py-4 md:py-6">
        {mySubjects.length === 0 ? (
          <div className="bg-white border border-[#D8CFB8] rounded-[6px] py-14 text-center text-[#6B6457] text-sm">
            No tienes materias registradas.
          </div>
        ) : (
          <div className="bg-white border border-[#D8CFB8] rounded-[6px]">
            <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-[#D8CFB8] text-[11px] font-semibold uppercase tracking-wide text-[#6B6457]">
                  <th className="text-left px-[18px] py-3 whitespace-nowrap">Materia</th>
                  <th className="text-left px-4 py-3 whitespace-nowrap">Docente</th>
                  <th className="text-left px-4 py-3 whitespace-nowrap">Período</th>
                  <th className="text-right px-4 py-3 whitespace-nowrap">Presentes</th>
                  <th className="text-right px-4 py-3 whitespace-nowrap">Ausentes</th>
                  <th className="text-right px-4 py-3 whitespace-nowrap">Justificados</th>
                  <th className="text-left px-4 py-3 whitespace-nowrap">Asistencia</th>
                </tr>
              </thead>
              <tbody>
                {mySubjects.map((sub, i) => {
                  const st = statsMap[sub.gsId];
                  const pct = st.total > 0 ? Math.round((st.attended / st.total) * 100) : null;
                  return (
                    <tr key={sub.gsId} className={i % 2 === 1 ? "bg-[#F5F1EA]" : ""}>
                      <td className="px-[18px] py-3 font-semibold text-[#0A0A0A]">
                        {sub.subjectName}
                        <div className="text-[11px] font-normal text-[#6B6457]">Grupo {sub.groupName}</div>
                      </td>
                      <td className="px-4 py-3 text-[#6B6457]">{sub.teacherName}</td>
                      <td className="px-4 py-3 text-[#6B6457]">{sub.periodName}</td>
                      <td className="px-4 py-3 tabular text-right text-[#0A0A0A]">{st.attended - st.justified}</td>
                      <td className="px-4 py-3 tabular text-right text-[#0A0A0A]">{st.absent}</td>
                      <td className="px-4 py-3 tabular text-right text-[#0A0A0A]">{st.justified}</td>
                      <td className="px-4 py-3">
                        {pct !== null
                          ? <QrBadge tone={attendanceTone(pct)}>{pct}%</QrBadge>
                          : <span className="text-[#6B6457]">—</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            </div>
            <div className="px-[18px] py-3 border-t border-[#D8CFB8] text-xs text-[#6B6457]">
              Solo se contabilizan sesiones cerradas por el docente.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
