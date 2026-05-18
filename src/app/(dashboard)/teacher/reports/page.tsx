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
import { Download } from "lucide-react";
import Link from "next/link";

async function getTeacherGroups(teacherId: number) {
  return db
    .select({
      gsId:        groupSubjects.id,
      groupId:     groups.id,
      groupName:   groups.name,
      subjectName: subjects.name,
      periodName:  periods.name,
      periodId:    groups.periodId,
    })
    .from(groupSubjects)
    .innerJoin(groups,   eq(groupSubjects.groupId,   groups.id))
    .innerJoin(subjects, eq(groupSubjects.subjectId, subjects.id))
    .innerJoin(periods,  eq(groups.periodId,         periods.id))
    .where(eq(groupSubjects.teacherId, teacherId))
    .orderBy(periods.active, groups.name);
}

async function getReportData(gsId: number) {
  // Total sesiones
  const [totalSessions] = await db
    .select({ n: count() })
    .from(classSessions)
    .where(eq(classSessions.groupSubjectId, gsId));

  const total = Number(totalSessions.n);

  // Estudiantes del grupo
  const [gs] = await db
    .select({ groupId: groupSubjects.groupId })
    .from(groupSubjects)
    .where(eq(groupSubjects.id, gsId))
    .limit(1);

  if (!gs) return { rows: [], total, groupAvg: 0 };

  const studentList = await db
    .select({ id: users.id, name: users.name, enrollmentNumber: users.enrollmentNumber })
    .from(groupStudents)
    .innerJoin(users, eq(groupStudents.studentId, users.id))
    .where(eq(groupStudents.groupId, gs.groupId))
    .orderBy(users.name);

  // Stats por estudiante
  const stats = await db
    .select({
      studentId: attendances.studentId,
      status:    attendances.status,
      n:         count(),
    })
    .from(attendances)
    .innerJoin(classSessions, eq(attendances.classSessionId, classSessions.id))
    .where(eq(classSessions.groupSubjectId, gsId))
    .groupBy(attendances.studentId, attendances.status);

  const statsMap: Record<number, { present: number; absent: number; justified: number }> = {};
  for (const s of studentList) statsMap[s.id] = { present: 0, absent: 0, justified: 0 };
  for (const s of stats) {
    if (!statsMap[s.studentId]) continue;
    if (s.status === "present")   statsMap[s.studentId].present   = Number(s.n);
    if (s.status === "absent")    statsMap[s.studentId].absent    = Number(s.n);
    if (s.status === "justified") statsMap[s.studentId].justified = Number(s.n);
  }

  const rows = studentList.map(s => {
    const st = statsMap[s.id];
    const attended = st.present + st.justified;
    const pct = total > 0 ? Math.round((attended / total) * 100) : null;
    return { ...s, ...st, pct };
  });

  const groupAvg = rows.length > 0 && rows.some(r => r.pct !== null)
    ? Math.round(rows.filter(r => r.pct !== null).reduce((acc, r) => acc + r.pct!, 0) / rows.filter(r => r.pct !== null).length)
    : null;

  return { rows, total, groupAvg };
}

export default async function TeacherReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ gsId?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const teacherId = Number(session.user.id);

  const params = await searchParams;
  const myGroups = await getTeacherGroups(teacherId);

  const selectedGs = myGroups.find(g => String(g.gsId) === params.gsId) ?? myGroups[0];
  const report = selectedGs ? await getReportData(selectedGs.gsId) : null;

  return (
    <div className="flex flex-col flex-1">
      <Header
        title="Reportes de asistencia"
        subtitle="Genera reportes consolidados por grupo y período"
      />

      <div className="flex-1 px-4 md:px-7 py-4 md:py-6 space-y-[18px]">
        {/* Filtros */}
        <div className="bg-white border border-[#D8CFB8] rounded-[6px] p-[18px]">
          <div className="text-sm font-semibold text-[#0A0A0A] mb-4">Filtros</div>
          <form method="GET" className="grid grid-cols-4 gap-3 items-end">
            <div className="col-span-3 space-y-1.5">
              <label className="text-[11.5px] font-semibold text-[#0A0A0A]">Grupo · Materia · Período</label>
              <select
                name="gsId"
                defaultValue={String(selectedGs?.gsId ?? "")}
                className="w-full h-8 px-3 text-[13px] border border-[#D8CFB8] rounded bg-white focus:outline-none focus:ring-1 focus:ring-[#1B3A2D]"
              >
                {myGroups.map(g => (
                  <option key={g.gsId} value={g.gsId}>
                    {g.groupName} · {g.subjectName} · {g.periodName}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="submit"
              className="h-8 px-4 text-[13px] font-semibold bg-[#1B3A2D] text-white rounded hover:bg-[#163023] transition-colors"
            >
              Ver reporte
            </button>
          </form>
          {selectedGs && (
            <div className="flex gap-2 mt-4 pt-4 border-t border-[#D8CFB8]">
              <a
                href={`/api/reports/pdf?gsId=${selectedGs.gsId}`}
                className="h-8 px-4 text-[13px] font-semibold bg-[#1B3A2D] text-white rounded hover:bg-[#163023] transition-colors flex items-center gap-1.5"
              >
                <Download size={13} /> Descargar PDF
              </a>
            </div>
          )}
        </div>

        {/* Tabla de resumen */}
        {report && selectedGs && (
          <div className="bg-white border border-[#D8CFB8] rounded-[6px]">
            <div className="flex items-center justify-between px-[18px] py-4 border-b border-[#D8CFB8]">
              <span className="text-sm font-semibold text-[#0A0A0A]">
                {selectedGs.groupName} · {selectedGs.subjectName} · Resumen del período
              </span>
              <QrBadge tone="cream">{report.total} sesiones impartidas</QrBadge>
            </div>

            {report.rows.length === 0 ? (
              <div className="py-10 text-center text-[#6B6457] text-sm">
                No hay estudiantes en este grupo.
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                <table className="w-full text-[13px]">
                  <thead>
                    <tr className="border-b border-[#D8CFB8] text-[11px] font-semibold uppercase tracking-wide text-[#6B6457]">
                      <th className="text-left px-[18px] py-3 whitespace-nowrap">Estudiante</th>
                      <th className="text-left px-4 py-3 whitespace-nowrap">Matrícula</th>
                      <th className="text-right px-4 py-3 whitespace-nowrap">Presentes</th>
                      <th className="text-right px-4 py-3 whitespace-nowrap">Ausentes</th>
                      <th className="text-right px-4 py-3 whitespace-nowrap">Justificados</th>
                      <th className="text-left px-4 py-3 whitespace-nowrap">Asistencia</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.rows.map((r, i) => (
                      <tr key={r.id} className={i % 2 === 1 ? "bg-[#F5F1EA]" : ""}>
                        <td className="px-[18px] py-3 font-semibold text-[#0A0A0A]">{r.name}</td>
                        <td className="px-4 py-3 tabular text-[#6B6457]">{r.enrollmentNumber ?? "—"}</td>
                        <td className="px-4 py-3 tabular text-[#0A0A0A] text-right">{r.present}</td>
                        <td className="px-4 py-3 tabular text-[#0A0A0A] text-right">{r.absent}</td>
                        <td className="px-4 py-3 tabular text-[#0A0A0A] text-right">{r.justified}</td>
                        <td className="px-4 py-3">
                          {r.pct !== null
                            ? <QrBadge tone={attendanceTone(r.pct)}>{r.pct}%</QrBadge>
                            : <span className="text-[#6B6457]">—</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </div>
                <div className="flex justify-between items-center px-[18px] py-3 border-t border-[#D8CFB8] text-xs">
                  <span className="text-[#6B6457]">Promedio del grupo</span>
                  <span className="font-semibold text-[#0A0A0A]">
                    {report.groupAvg !== null ? `${report.groupAvg}%` : "—"}
                  </span>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
