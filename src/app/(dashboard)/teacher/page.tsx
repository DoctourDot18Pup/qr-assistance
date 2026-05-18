import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import {
  groupSubjects, groups, subjects, periods,
  groupStudents, classSessions, attendances,
} from "@/lib/db/schema";
import { eq, and, count, gte, lt, sql, inArray } from "drizzle-orm";
import { Header } from "@/components/shell/header";
import { QrBadge, attendanceTone } from "@/components/ui/qr-badge";
import { LayoutGrid, CalendarCheck, TrendingUp, QrCode } from "lucide-react";
import Link from "next/link";

function startOfToday() { const d = new Date(); d.setHours(0,0,0,0); return d; }
function startOfTomorrow() { const d = new Date(); d.setDate(d.getDate()+1); d.setHours(0,0,0,0); return d; }

async function getTeacherData(teacherId: number) {
  const today    = startOfToday();
  const tomorrow = startOfTomorrow();

  const myGroups = await db
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

  if (myGroups.length === 0) {
    return { myGroups: [], studentsPerGroup: {}, gsAvgMap: {}, overallAvg: null, kpis: { groups: 0, sessionsToday: 0, nextHour: null } };
  }

  const gsIds    = myGroups.map(g => g.gsId);
  const groupIds = [...new Set(myGroups.map(g => g.groupId))];

  const [todaySessions] = await db
    .select({ n: count() })
    .from(classSessions)
    .where(and(
      sql`${classSessions.groupSubjectId} = ANY(ARRAY[${sql.join(gsIds.map(id => sql`${id}`), sql`, `)}]::int[])`,
      gte(classSessions.date, today),
      lt(classSessions.date, tomorrow),
    ));

  const nextSession = await db
    .select({ date: classSessions.date })
    .from(classSessions)
    .where(and(
      sql`${classSessions.groupSubjectId} = ANY(ARRAY[${sql.join(gsIds.map(id => sql`${id}`), sql`, `)}]::int[])`,
      gte(classSessions.date, new Date()),
      lt(classSessions.date, tomorrow),
      eq(classSessions.status, "active"),
    ))
    .orderBy(classSessions.date)
    .limit(1);

  const studentCounts = await db
    .select({ groupId: groupStudents.groupId, n: count() })
    .from(groupStudents)
    .where(inArray(groupStudents.groupId, groupIds))
    .groupBy(groupStudents.groupId);

  const studentsPerGroup: Record<number, number> = {};
  for (const sc of studentCounts) studentsPerGroup[sc.groupId] = Number(sc.n);

  // Attendance stats per group-subject for cards + overall average
  const attRows = await db
    .select({
      gsId:   classSessions.groupSubjectId,
      status: attendances.status,
      n:      count(),
    })
    .from(attendances)
    .innerJoin(classSessions, eq(attendances.classSessionId, classSessions.id))
    .where(inArray(classSessions.groupSubjectId, gsIds))
    .groupBy(classSessions.groupSubjectId, attendances.status);

  const totalMap:   Record<number, number> = {};
  const presentMap: Record<number, number> = {};
  let overallPresent = 0, overallTotal = 0;

  for (const r of attRows) {
    totalMap[r.gsId]   = (totalMap[r.gsId] ?? 0)   + Number(r.n);
    overallTotal       += Number(r.n);
    if (r.status === "present" || r.status === "justified") {
      presentMap[r.gsId] = (presentMap[r.gsId] ?? 0) + Number(r.n);
      overallPresent     += Number(r.n);
    }
  }

  const gsAvgMap: Record<number, number | null> = {};
  for (const gsId of gsIds) {
    const t = totalMap[gsId] ?? 0;
    gsAvgMap[gsId] = t > 0 ? Math.round(((presentMap[gsId] ?? 0) / t) * 100) : null;
  }

  const overallAvg = overallTotal > 0 ? Math.round((overallPresent / overallTotal) * 100) : null;

  const nextHour = nextSession[0]?.date
    ? nextSession[0].date.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })
    : null;

  return {
    myGroups,
    studentsPerGroup,
    gsAvgMap,
    overallAvg,
    kpis: {
      groups:        myGroups.length,
      sessionsToday: Number(todaySessions.n),
      nextHour,
    },
  };
}

export default async function TeacherHomePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const teacherId = Number(session.user.id);
  const teacherName = session.user.name?.split(" ")[0] ?? "Docente";

  const { myGroups, studentsPerGroup, gsAvgMap, overallAvg, kpis } = await getTeacherData(teacherId);

  const today    = new Date().toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long" });
  const subtitle = `${today} · ${kpis.groups} grupo${kpis.groups !== 1 ? "s" : ""} activo${kpis.groups !== 1 ? "s" : ""}`;

  return (
    <div className="flex flex-col flex-1">
      <Header
        title={`Buen día, ${teacherName}`}
        subtitle={subtitle}
        actions={
          <Link
            href="/teacher/sessions"
            className="h-8 px-4 text-[13px] font-semibold bg-[#1B3A2D] text-white rounded hover:bg-[#163023] transition-colors flex items-center gap-1.5"
          >
            <CalendarCheck size={14} /> Abrir nueva sesión
          </Link>
        }
      />

      <div className="flex-1 px-4 md:px-7 py-4 md:py-6 space-y-[18px]">
        {/* KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-[14px]">
          <div className="bg-white border border-[#D8CFB8] rounded-[6px] p-[18px] flex items-start gap-4">
            <div className="w-9 h-9 rounded bg-[#F5F1EA] flex items-center justify-center shrink-0">
              <LayoutGrid size={18} className="text-[#1B3A2D]" strokeWidth={1.75} />
            </div>
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wide text-[#6B6457] mb-1">Grupos asignados</div>
              <div className="text-3xl font-semibold text-[#0A0A0A] tabular leading-none">{kpis.groups}</div>
              <div className="text-xs text-[#6B6457] mt-1">Período activo</div>
            </div>
          </div>

          <div className="bg-white border border-[#D8CFB8] rounded-[6px] p-[18px] flex items-start gap-4">
            <div className="w-9 h-9 rounded bg-[#F5F1EA] flex items-center justify-center shrink-0">
              <CalendarCheck size={18} className="text-[#1B3A2D]" strokeWidth={1.75} />
            </div>
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wide text-[#6B6457] mb-1">Sesiones hoy</div>
              <div className="text-3xl font-semibold text-[#0A0A0A] tabular leading-none">{kpis.sessionsToday}</div>
              <div className="text-xs text-[#6B6457] mt-1">
                {kpis.nextHour ? `Próxima a las ${kpis.nextHour}` : "Sin sesiones activas"}
              </div>
            </div>
          </div>

          <div className="bg-white border border-[#D8CFB8] rounded-[6px] p-[18px] flex items-start gap-4">
            <div className="w-9 h-9 rounded bg-[#F5F1EA] flex items-center justify-center shrink-0">
              <TrendingUp size={18} className="text-[#1B3A2D]" strokeWidth={1.75} />
            </div>
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wide text-[#6B6457] mb-1">Asistencia promedio</div>
              {overallAvg !== null
                ? <div className="mt-1"><QrBadge tone={attendanceTone(overallAvg)} className="text-sm px-2.5 py-1">{overallAvg}%</QrBadge></div>
                : <div className="text-3xl font-semibold text-[#6B6457] tabular leading-none">—</div>}
              <div className="text-xs text-[#6B6457] mt-1">Todos tus grupos</div>
            </div>
          </div>
        </div>

        {/* Grid de grupos */}
        <div className="bg-white border border-[#D8CFB8] rounded-[6px]">
          <div className="flex items-center justify-between px-[18px] py-4 border-b border-[#D8CFB8]">
            <span className="text-sm font-semibold text-[#0A0A0A]">Mis grupos</span>
            <Link href="/teacher/groups" className="text-xs text-[#1B3A2D] hover:underline font-semibold">
              Ver todos →
            </Link>
          </div>

          {myGroups.length === 0 ? (
            <div className="py-14 text-center text-[#6B6457] text-sm">
              No tienes grupos asignados en el período activo.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2">
              {myGroups.slice(0, 4).map((g, i) => {
                const studentCount = studentsPerGroup[g.groupId] ?? 0;
                const avg          = gsAvgMap[g.gsId];
                const isLast       = i >= myGroups.slice(0, 4).length - 2;
                return (
                  <div
                    key={g.gsId}
                    className={[
                      "p-[18px] flex justify-between items-center gap-4",
                      i % 2 === 0 ? "border-r border-[#D8CFB8]" : "",
                      !isLast ? "border-b border-[#D8CFB8]" : "",
                    ].join(" ")}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1.5">
                        <QrBadge tone="dark">{g.groupName}</QrBadge>
                        <QrBadge tone="cream">{studentCount} estudiante{studentCount !== 1 ? "s" : ""}</QrBadge>
                      </div>
                      <div className="text-[13.5px] font-semibold text-[#0A0A0A] truncate">{g.subjectName}</div>
                      <div className="text-[11.5px] text-[#6B6457] mt-0.5 flex items-center gap-1.5">
                        Asistencia promedio{" "}
                        {avg !== null
                          ? <QrBadge tone={attendanceTone(avg)}>{avg}%</QrBadge>
                          : <span>—</span>}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <Link
                        href={`/teacher/sessions?gsId=${g.gsId}`}
                        className="h-7 px-3 text-xs font-semibold bg-[#1B3A2D] text-white rounded hover:bg-[#163023] transition-colors flex items-center gap-1"
                      >
                        <QrCode size={12} /> Abrir sesión
                      </Link>
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
