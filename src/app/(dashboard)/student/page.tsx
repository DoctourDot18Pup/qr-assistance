import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import {
  groupStudents, groups, groupSubjects, subjects, periods,
  attendances, classSessions,
} from "@/lib/db/schema";
import { eq, and, count, inArray } from "drizzle-orm";
import { Header } from "@/components/shell/header";
import { QrBadge, attendanceTone } from "@/components/ui/qr-badge";
import { BookOpen, QrCode, FileText, TrendingUp } from "lucide-react";
import Link from "next/link";

async function getStudentData(studentId: number) {
  const mySubjects = await db
    .select({
      gsId: groupSubjects.id,
      groupName: groups.name,
      subjectName: subjects.name,
    })
    .from(groupStudents)
    .innerJoin(groups, eq(groupStudents.groupId, groups.id))
    .innerJoin(groupSubjects, eq(groupSubjects.groupId, groups.id))
    .innerJoin(subjects, eq(groupSubjects.subjectId, subjects.id))
    .innerJoin(periods, eq(groups.periodId, periods.id))
    .where(and(eq(groupStudents.studentId, studentId), eq(periods.active, true)));

  if (mySubjects.length === 0) return { mySubjects: [], statsMap: {}, pendingAbsences: 0, avgAttendance: null };

  const gsIds = mySubjects.map(s => s.gsId);

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

  const statsMap: Record<number, { total: number; attended: number; absent: number }> = {};
  for (const s of mySubjects) statsMap[s.gsId] = { total: 0, attended: 0, absent: 0 };
  for (const s of attendanceStats) {
    if (!statsMap[s.gsId]) continue;
    statsMap[s.gsId].total += Number(s.n);
    if (s.status === "present" || s.status === "justified") statsMap[s.gsId].attended += Number(s.n);
    if (s.status === "absent") statsMap[s.gsId].absent += Number(s.n);
  }

  const allStats = Object.values(statsMap);
  const withData = allStats.filter(s => s.total > 0);
  const avgAttendance = withData.length > 0
    ? Math.round(withData.reduce((acc, s) => acc + (s.attended / s.total) * 100, 0) / withData.length)
    : null;

  const [pendingRow] = await db
    .select({ n: count() })
    .from(attendances)
    .innerJoin(classSessions, eq(attendances.classSessionId, classSessions.id))
    .where(and(
      eq(attendances.studentId, studentId),
      eq(attendances.status, "absent"),
      inArray(classSessions.groupSubjectId, gsIds),
    ));

  return { mySubjects, statsMap, pendingAbsences: Number(pendingRow.n), avgAttendance };
}

export default async function StudentHomePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const studentId = Number(session.user.id);
  const studentName = session.user.name?.split(" ")[0] ?? "Estudiante";

  const { mySubjects, statsMap, pendingAbsences, avgAttendance } = await getStudentData(studentId);

  const today = new Date().toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long" });
  const subtitle = `${today} · ${mySubjects.length} materia${mySubjects.length !== 1 ? "s" : ""} activa${mySubjects.length !== 1 ? "s" : ""}`;

  return (
    <div className="flex flex-col flex-1">
      <Header
        title={`Buen día, ${studentName}`}
        subtitle={subtitle}
        actions={
          <Link
            href="/student/scan"
            className="h-8 px-4 text-[13px] font-semibold bg-[#1B3A2D] text-white rounded hover:bg-[#163023] transition-colors flex items-center gap-1.5"
          >
            <QrCode size={14} /> Escanear QR
          </Link>
        }
      />

      <div className="flex-1 px-4 md:px-7 py-4 md:py-6 space-y-[18px]">
        {/* KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-[14px]">
          {[
            { icon: BookOpen,   label: "Materias activas",     value: mySubjects.length,           hint: "Período actual" },
            { icon: TrendingUp, label: "Asistencia promedio",  value: avgAttendance !== null ? `${avgAttendance}%` : "—", hint: "Sesiones cerradas" },
            { icon: FileText,   label: "Faltas sin justificar", value: pendingAbsences,             hint: pendingAbsences > 0 ? "Pendientes de envío" : "¡Sin faltas pendientes!" },
          ].map(({ icon: Icon, label, value, hint }) => (
            <div key={label} className="bg-white border border-[#D8CFB8] rounded-[6px] p-[18px] flex items-start gap-4">
              <div className="w-9 h-9 rounded bg-[#F5F1EA] flex items-center justify-center shrink-0">
                <Icon size={18} className="text-[#1B3A2D]" strokeWidth={1.75} />
              </div>
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-wide text-[#6B6457] mb-1">{label}</div>
                <div className="text-3xl font-semibold text-[#0A0A0A] tabular leading-none">{value}</div>
                <div className="text-xs text-[#6B6457] mt-1">{hint}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Materias */}
        <div className="bg-white border border-[#D8CFB8] rounded-[6px]">
          <div className="flex items-center justify-between px-[18px] py-4 border-b border-[#D8CFB8]">
            <span className="text-sm font-semibold text-[#0A0A0A]">Mis materias</span>
            <Link href="/student/subjects" className="text-xs text-[#1B3A2D] hover:underline font-semibold">
              Ver detalle →
            </Link>
          </div>

          {mySubjects.length === 0 ? (
            <div className="py-14 text-center text-[#6B6457] text-sm">
              No tienes materias asignadas en el período activo.
            </div>
          ) : (
            <div className="divide-y divide-[#D8CFB8]">
              {mySubjects.map(sub => {
                const stats = statsMap[sub.gsId];
                const pct = stats.total > 0 ? Math.round((stats.attended / stats.total) * 100) : null;
                return (
                  <div key={sub.gsId} className="flex items-center justify-between px-[18px] py-3.5 gap-4">
                    <div className="min-w-0">
                      <div className="text-[13.5px] font-semibold text-[#0A0A0A] truncate">{sub.subjectName}</div>
                      <div className="text-[11.5px] text-[#6B6457] mt-0.5">
                        Grupo {sub.groupName} · {stats.attended}/{stats.total} sesiones
                      </div>
                    </div>
                    <div className="shrink-0">
                      {pct !== null
                        ? <QrBadge tone={attendanceTone(pct)}>{pct}%</QrBadge>
                        : <QrBadge tone="cream">Sin sesiones</QrBadge>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
