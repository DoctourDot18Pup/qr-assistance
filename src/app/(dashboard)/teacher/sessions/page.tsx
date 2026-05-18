import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import {
  classSessions, groupSubjects, groups, subjects, periods, attendances, groupStudents,
} from "@/lib/db/schema";
import { eq, and, count, desc } from "drizzle-orm";
import { Header } from "@/components/shell/header";
import { QrBadge } from "@/components/ui/qr-badge";
import { NewSessionButton } from "./new-session-button";
import Link from "next/link";

async function getTeacherSessions(teacherId: number) {
  const rows = await db
    .select({
      id:          classSessions.id,
      date:        classSessions.date,
      closedAt:    classSessions.closedAt,
      status:      classSessions.status,
      groupName:   groups.name,
      subjectName: subjects.name,
    })
    .from(classSessions)
    .innerJoin(groupSubjects, eq(classSessions.groupSubjectId, groupSubjects.id))
    .innerJoin(groups,   eq(groupSubjects.groupId,   groups.id))
    .innerJoin(subjects, eq(groupSubjects.subjectId, subjects.id))
    .where(eq(groupSubjects.teacherId, teacherId))
    .orderBy(desc(classSessions.date))
    .limit(50);

  // Conteo de presentes por sesión
  const presentes: Record<number, number> = {};
  const totalStudents: Record<number, number> = {};

  for (const r of rows) {
    const [p] = await db
      .select({ n: count() })
      .from(attendances)
      .where(and(eq(attendances.classSessionId, r.id), eq(attendances.status, "present")));
    presentes[r.id] = Number(p.n);
  }

  // Total de estudiantes por sesión (via groupSubject → group)
  const gsData = await db
    .select({ sessionId: classSessions.id, groupId: groups.id })
    .from(classSessions)
    .innerJoin(groupSubjects, eq(classSessions.groupSubjectId, groupSubjects.id))
    .innerJoin(groups, eq(groupSubjects.groupId, groups.id))
    .where(eq(groupSubjects.teacherId, teacherId));

  for (const d of gsData) {
    if (totalStudents[d.sessionId] !== undefined) continue;
    const [t] = await db
      .select({ n: count() })
      .from(groupStudents)
      .where(eq(groupStudents.groupId, d.groupId));
    totalStudents[d.sessionId] = Number(t.n);
  }

  return rows.map(r => ({
    ...r,
    presentes: presentes[r.id] ?? 0,
    total: totalStudents[r.id] ?? 0,
  }));
}

async function getTeacherGroups(teacherId: number) {
  return db
    .select({
      gsId:        groupSubjects.id,
      groupName:   groups.name,
      subjectName: subjects.name,
    })
    .from(groupSubjects)
    .innerJoin(groups,   eq(groupSubjects.groupId,   groups.id))
    .innerJoin(subjects, eq(groupSubjects.subjectId, subjects.id))
    .innerJoin(periods,  eq(groups.periodId,         periods.id))
    .where(and(eq(groupSubjects.teacherId, teacherId), eq(periods.active, true)));
}

function statusBadge(status: string | null) {
  if (status === "active")  return <QrBadge tone="gold">Activa</QrBadge>;
  if (status === "closed")  return <QrBadge tone="gray">Cerrada</QrBadge>;
  return <QrBadge tone="cream">Programada</QrBadge>;
}

function duration(start: Date | null, end: Date | null) {
  if (!start || !end) return "—";
  const mins = Math.round((end.getTime() - start.getTime()) / 60000);
  return `${mins} min`;
}

export default async function TeacherSessionsPage({
  searchParams,
}: {
  searchParams: Promise<{ gsId?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const teacherId = Number(session.user.id);

  const params = await searchParams;
  const defaultGsId = params.gsId ? Number(params.gsId) : undefined;

  const [sessionList, myGroups] = await Promise.all([
    getTeacherSessions(teacherId),
    getTeacherGroups(teacherId),
  ]);

  return (
    <div className="flex flex-col flex-1">
      <Header
        title="Sesiones"
        subtitle="Historial de sesiones impartidas y activas"
        actions={<NewSessionButton groups={myGroups} defaultGsId={defaultGsId} />}
      />

      <div className="flex-1 px-4 md:px-7 py-4 md:py-6">
        <div className="bg-white border border-[#D8CFB8] rounded-[6px]">
          {sessionList.length === 0 ? (
            <div className="py-14 text-center text-[#6B6457] text-sm">
              Aún no has impartido sesiones. Crea una para comenzar.
            </div>
          ) : (
            <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-[#D8CFB8] text-[11px] font-semibold uppercase tracking-wide text-[#6B6457]">
                  <th className="text-left px-[18px] py-3 whitespace-nowrap">Fecha</th>
                  <th className="text-left px-4 py-3 whitespace-nowrap">Grupo</th>
                  <th className="text-left px-4 py-3 whitespace-nowrap">Materia</th>
                  <th className="text-left px-4 py-3 whitespace-nowrap">Duración</th>
                  <th className="text-left px-4 py-3 whitespace-nowrap">Presentes / Total</th>
                  <th className="text-left px-4 py-3 whitespace-nowrap">Estado</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {sessionList.map((s, i) => (
                  <tr key={s.id} className={i % 2 === 1 ? "bg-[#F5F1EA]" : ""}>
                    <td className="px-[18px] py-3 tabular text-[#6B6457] text-xs">
                      {s.date?.toLocaleDateString("es-MX", { day:"numeric", month:"short", year:"numeric" }) ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      <QrBadge tone="dark">{s.groupName}</QrBadge>
                    </td>
                    <td className="px-4 py-3 text-[#0A0A0A]">{s.subjectName}</td>
                    <td className="px-4 py-3 tabular text-[#6B6457]">
                      {duration(s.date, s.closedAt)}
                    </td>
                    <td className="px-4 py-3 tabular font-semibold text-[#0A0A0A]">
                      {s.presentes} / {s.total}
                    </td>
                    <td className="px-4 py-3">{statusBadge(s.status)}</td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/teacher/sessions/${s.id}`}
                        className="h-7 px-3 text-xs font-semibold border border-[#1B3A2D] text-[#1B3A2D] rounded hover:bg-[#F5F1EA] transition-colors inline-flex items-center"
                      >
                        {s.status === "active" ? "Abrir" : "Ver"}
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
