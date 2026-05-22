import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import {
  groupStudents, groups, groupSubjects, subjects, periods, users,
  attendances, classSessions, justifications,
} from "@/lib/db/schema";
import { eq, and, count, inArray, gte } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { Header } from "@/components/shell/header";
import { QrBadge, attendanceTone } from "@/components/ui/qr-badge";
import { QrCode, TrendingUp, CalendarDays, FileText } from "lucide-react";
import Link from "next/link";

async function getStudentData(studentId: number) {
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
    .innerJoin(groups,        eq(groupSubjects.groupId,        groups.id))
    .innerJoin(subjects,      eq(groupSubjects.subjectId,      subjects.id))
    .innerJoin(periods,       eq(groups.periodId,              periods.id))
    .innerJoin(teacher,       eq(groupSubjects.teacherId,      teacher.id))
    .where(and(eq(groupStudents.studentId, studentId), eq(periods.active, true)));

  if (mySubjects.length === 0) {
    return { mySubjects: [], statsMap: {}, avgAttendance: null, totalSessions: 0, thisWeekSessions: 0, justApproved: 0, justPending: 0 };
  }

  const gsIds = mySubjects.map(s => s.gsId);

  // Get Monday of current week (00:00 local)
  const now = new Date();
  const dow = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - (dow === 0 ? 6 : dow - 1));
  monday.setHours(0, 0, 0, 0);

  const [attendanceStats, weekRow, justStats] = await Promise.all([
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
      .select({ n: count() })
      .from(classSessions)
      .innerJoin(attendances, eq(attendances.classSessionId, classSessions.id))
      .where(and(
        eq(attendances.studentId, studentId),
        eq(classSessions.status, "closed"),
        inArray(classSessions.groupSubjectId, gsIds),
        gte(classSessions.date, monday),
      )),

    db
      .select({ status: justifications.status, n: count() })
      .from(justifications)
      .innerJoin(attendances, eq(justifications.attendanceId, attendances.id))
      .where(eq(attendances.studentId, studentId))
      .groupBy(justifications.status),
  ]);

  const statsMap: Record<number, { total: number; attended: number; absent: number }> = {};
  for (const s of mySubjects) statsMap[s.gsId] = { total: 0, attended: 0, absent: 0 };
  for (const s of attendanceStats) {
    if (!statsMap[s.gsId]) continue;
    statsMap[s.gsId].total += Number(s.n);
    if (s.status === "present" || s.status === "justified") statsMap[s.gsId].attended += Number(s.n);
    if (s.status === "absent") statsMap[s.gsId].absent += Number(s.n);
  }

  const withData = Object.values(statsMap).filter(s => s.total > 0);
  const avgAttendance = withData.length > 0
    ? Math.round(withData.reduce((acc, s) => acc + (s.attended / s.total) * 100, 0) / withData.length)
    : null;

  const totalSessions = Object.values(statsMap).reduce((acc, s) => acc + s.total, 0);
  const thisWeekSessions = Number(weekRow[0]?.n ?? 0);

  let justApproved = 0, justPending = 0;
  for (const js of justStats) {
    if (js.status === "approved") justApproved = Number(js.n);
    if (js.status === "pending")  justPending  = Number(js.n);
  }

  return { mySubjects, statsMap, avgAttendance, totalSessions, thisWeekSessions, justApproved, justPending };
}

export default async function StudentHomePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const studentId = Number(session.user.id);
  const studentName = session.user.name?.split(" ")[0] ?? "Estudiante";

  const {
    mySubjects,
    statsMap,
    avgAttendance,
    totalSessions,
    thisWeekSessions,
    justApproved,
    justPending,
  } = await getStudentData(studentId);

  const today = new Date().toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long", timeZone: "America/Mexico_City" });
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
          {/* Asistencia General */}
          <div className="bg-white border border-[#D8CFB8] rounded-[6px] p-[18px] flex items-start gap-4">
            <div className="w-9 h-9 rounded bg-[#F5F1EA] flex items-center justify-center shrink-0">
              <TrendingUp size={18} className="text-[#1B3A2D]" strokeWidth={1.75} />
            </div>
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wide text-[#6B6457] mb-1">
                Asistencia general
              </div>
              <div
                className={`text-3xl font-semibold tabular leading-none ${
                  avgAttendance === null
                    ? "text-[#6B6457]"
                    : avgAttendance >= 85
                    ? "text-[#2F6A4B]"
                    : avgAttendance >= 70
                    ? "text-[#92620E]"
                    : "text-[#7A1A1A]"
                }`}
              >
                {avgAttendance !== null ? `${avgAttendance}%` : "—"}
              </div>
              <div className="text-xs text-[#6B6457] mt-1">
                {avgAttendance !== null ? "Promedio · sesiones cerradas" : "Sin sesiones registradas"}
              </div>
            </div>
          </div>

          {/* Sesiones Registradas */}
          <div className="bg-white border border-[#D8CFB8] rounded-[6px] p-[18px] flex items-start gap-4">
            <div className="w-9 h-9 rounded bg-[#F5F1EA] flex items-center justify-center shrink-0">
              <CalendarDays size={18} className="text-[#1B3A2D]" strokeWidth={1.75} />
            </div>
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wide text-[#6B6457] mb-1">
                Sesiones registradas
              </div>
              <div className="text-3xl font-semibold text-[#0A0A0A] tabular leading-none">{totalSessions}</div>
              <div className="text-xs text-[#6B6457] mt-1">
                esta semana: {thisWeekSessions}
              </div>
            </div>
          </div>

          {/* Justificantes */}
          <div className="bg-white border border-[#D8CFB8] rounded-[6px] p-[18px] flex items-start gap-4">
            <div className="w-9 h-9 rounded bg-[#F5F1EA] flex items-center justify-center shrink-0">
              <FileText size={18} className="text-[#1B3A2D]" strokeWidth={1.75} />
            </div>
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wide text-[#6B6457] mb-1">
                Justificantes
              </div>
              <div className="text-3xl font-semibold text-[#0A0A0A] tabular leading-none">
                {justApproved + justPending}
              </div>
              <div className="text-xs text-[#6B6457] mt-1">
                {justApproved} aprobado{justApproved !== 1 ? "s" : ""} · {justPending} pendiente{justPending !== 1 ? "s" : ""}
              </div>
            </div>
          </div>
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-px bg-[#D8CFB8]">
              {mySubjects.map(sub => {
                const stats = statsMap[sub.gsId];
                const pct = stats.total > 0 ? Math.round((stats.attended / stats.total) * 100) : null;
                const alertTone = pct !== null && pct < 85 ? (pct < 70 ? "danger" : "gold") : null;

                return (
                  <div key={sub.gsId} className="bg-white px-[18px] py-4">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="min-w-0 flex-1">
                        <div className="text-[13.5px] font-semibold text-[#0A0A0A] truncate">
                          {sub.subjectName}
                        </div>
                        <div className="text-[11.5px] text-[#6B6457] mt-0.5">
                          {sub.teacherName} · Grupo {sub.groupName}
                        </div>
                      </div>
                      {alertTone && (
                        <QrBadge tone={alertTone} className="shrink-0">
                          {alertTone === "danger" ? "En riesgo" : "Atención"}
                        </QrBadge>
                      )}
                    </div>

                    {pct !== null ? (
                      <div>
                        <div className="h-1.5 bg-[#F5F1EA] rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              pct >= 85 ? "bg-[#2F6A4B]" : pct >= 70 ? "bg-[#C49A16]" : "bg-[#B91C1C]"
                            }`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-[11px] text-[#6B6457]">
                            {stats.attended}/{stats.total} sesiones
                          </span>
                          <span
                            className={`text-[11px] font-semibold ${
                              pct >= 85 ? "text-[#2F6A4B]" : pct >= 70 ? "text-[#92620E]" : "text-[#7A1A1A]"
                            }`}
                          >
                            {pct}%
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="text-[11px] text-[#6B6457] mt-1">Sin sesiones registradas</div>
                    )}
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
