import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import {
  groupSubjects, groups, subjects, periods,
  groupStudents, users, attendances, classSessions,
} from "@/lib/db/schema";
import { eq, and, count, sql } from "drizzle-orm";
import { Header } from "@/components/shell/header";
import { QrBadge, attendanceTone } from "@/components/ui/qr-badge";
import Link from "next/link";

async function getTeacherGroups(teacherId: number) {
  return db
    .select({
      gsId:        groupSubjects.id,
      groupId:     groups.id,
      groupName:   groups.name,
      subjectName: subjects.name,
      periodName:  periods.name,
    })
    .from(groupSubjects)
    .innerJoin(groups,   eq(groupSubjects.groupId,   groups.id))
    .innerJoin(subjects, eq(groupSubjects.subjectId, subjects.id))
    .innerJoin(periods,  eq(groups.periodId,         periods.id))
    .where(and(eq(groupSubjects.teacherId, teacherId), eq(periods.active, true)));
}

async function getGroupStudents(groupId: number) {
  return db
    .select({
      id:               users.id,
      name:             users.name,
      enrollmentNumber: users.enrollmentNumber,
    })
    .from(groupStudents)
    .innerJoin(users, eq(groupStudents.studentId, users.id))
    .where(eq(groupStudents.groupId, groupId))
    .orderBy(users.name);
}

async function getAttendanceStats(groupSubjectId: number, studentIds: number[]) {
  if (studentIds.length === 0) return {};

  // Total sesiones del grupo-materia
  const [totalSessions] = await db
    .select({ n: count() })
    .from(classSessions)
    .where(eq(classSessions.groupSubjectId, groupSubjectId));

  const total = Number(totalSessions.n);
  if (total === 0) return {};

  // Asistencias por estudiante
  const stats = await db
    .select({
      studentId: attendances.studentId,
      status:    attendances.status,
      n:         count(),
    })
    .from(attendances)
    .innerJoin(classSessions, eq(attendances.classSessionId, classSessions.id))
    .where(eq(classSessions.groupSubjectId, groupSubjectId))
    .groupBy(attendances.studentId, attendances.status);

  const result: Record<number, { present: number; absent: number; justified: number; total: number }> = {};
  for (const sid of studentIds) {
    result[sid] = { present: 0, absent: 0, justified: 0, total };
  }
  for (const s of stats) {
    if (!result[s.studentId]) continue;
    if (s.status === "present")   result[s.studentId].present   = Number(s.n);
    if (s.status === "absent")    result[s.studentId].absent    = Number(s.n);
    if (s.status === "justified") result[s.studentId].justified = Number(s.n);
  }
  return result;
}

export default async function TeacherGroupsPage({
  searchParams,
}: {
  searchParams: Promise<{ gsId?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const teacherId = Number(session.user.id);

  const params = await searchParams;
  const myGroups = await getTeacherGroups(teacherId);

  // Grupo seleccionado para el detalle (por defecto el primero)
  const selectedGs = myGroups.find(g => String(g.gsId) === params.gsId) ?? myGroups[0];

  let students: Awaited<ReturnType<typeof getGroupStudents>> = [];
  let attendanceStats: Record<number, { present: number; absent: number; justified: number; total: number }> = {};

  if (selectedGs) {
    students = await getGroupStudents(selectedGs.groupId);
    attendanceStats = await getAttendanceStats(selectedGs.gsId, students.map(s => s.id));
  }

  return (
    <div className="flex flex-col flex-1">
      <Header
        title="Mis grupos"
        subtitle={`${myGroups.length} grupo${myGroups.length !== 1 ? "s" : ""} asignado${myGroups.length !== 1 ? "s" : ""} en el período activo`}
      />

      <div className="flex-1 px-4 md:px-7 py-4 md:py-6 space-y-[18px]">
        {/* Cards de grupos */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-[14px]">
          {myGroups.map((g) => (
            <div key={g.gsId} className="bg-white border border-[#D8CFB8] rounded-[6px] p-[18px]">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <QrBadge tone="dark">{g.groupName}</QrBadge>
                  <div className="text-[15px] font-semibold mt-2 text-[#0A0A0A]">{g.subjectName}</div>
                  <div className="text-xs text-[#6B6457] mt-0.5">Período {g.periodName}</div>
                </div>
                <div className="text-right">
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-[#6B6457]">Asistencia</div>
                  <div className="text-2xl font-semibold text-[#6B6457] tabular mt-0.5">—</div>
                </div>
              </div>
              <div className="flex items-center gap-4 pt-3 border-t border-[#D8CFB8]">
                <div>
                  <div className="text-[10.5px] font-semibold uppercase tracking-wide text-[#6B6457]">Estudiantes</div>
                  <div className="text-sm font-semibold mt-0.5">—</div>
                </div>
                <div className="ml-auto flex items-center gap-2">
                  <Link
                    href={`/teacher/groups/${g.groupId}/import`}
                    className="h-7 px-3 text-xs font-semibold border border-[#1B3A2D] text-[#1B3A2D] rounded hover:bg-[#F5F1EA] transition-colors inline-flex items-center"
                  >
                    Importar
                  </Link>
                  <Link
                    href={`/teacher/groups?gsId=${g.gsId}`}
                    className="h-7 px-3 text-xs font-semibold bg-[#1B3A2D] text-white rounded hover:bg-[#163023] transition-colors inline-flex items-center"
                  >
                    Ver detalle
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Detalle del grupo seleccionado */}
        {selectedGs && (
          <div className="bg-white border border-[#D8CFB8] rounded-[6px]">
            <div className="px-[18px] py-4 border-b border-[#D8CFB8]">
              <span className="text-sm font-semibold text-[#0A0A0A]">
                {selectedGs.groupName} · {selectedGs.subjectName} · Detalle de estudiantes
              </span>
            </div>

            {students.length === 0 ? (
              <div className="py-10 text-center text-[#6B6457] text-sm">
                No hay estudiantes inscritos en este grupo.
              </div>
            ) : (
              <div className="overflow-x-auto">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="border-b border-[#D8CFB8] text-[11px] font-semibold uppercase tracking-wide text-[#6B6457]">
                    <th className="text-left px-[18px] py-3">Matrícula</th>
                    <th className="text-left px-4 py-3">Estudiante</th>
                    <th className="text-left px-4 py-3">Presentes</th>
                    <th className="text-left px-4 py-3">Ausentes</th>
                    <th className="text-left px-4 py-3">Justificadas</th>
                    <th className="text-left px-4 py-3">Asistencia</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((s, i) => {
                    const st = attendanceStats[s.id];
                    const pct = st && st.total > 0
                      ? Math.round(((st.present + st.justified) / st.total) * 100)
                      : null;
                    return (
                      <tr key={s.id} className={i % 2 === 1 ? "bg-[#F5F1EA]" : ""}>
                        <td className="px-[18px] py-3 tabular text-[#6B6457]">
                          {s.enrollmentNumber ?? "—"}
                        </td>
                        <td className="px-4 py-3 font-semibold text-[#0A0A0A]">{s.name}</td>
                        <td className="px-4 py-3 tabular text-[#0A0A0A]">{st?.present ?? "—"}</td>
                        <td className="px-4 py-3 tabular text-[#0A0A0A]">{st?.absent ?? "—"}</td>
                        <td className="px-4 py-3 tabular text-[#0A0A0A]">{st?.justified ?? "—"}</td>
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
            )}
          </div>
        )}
      </div>
    </div>
  );
}
