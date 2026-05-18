import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { db } from "@/lib/db";
import {
  classSessions, groupSubjects, groups, subjects,
  groupStudents, attendances, justifications, users,
} from "@/lib/db/schema";
import { eq, inArray } from "drizzle-orm";
import { Header } from "@/components/shell/header";
import { QrBadge } from "@/components/ui/qr-badge";
import { ActiveSession } from "./active-session";
import { ClosedSession, RosterRow } from "./closed-session";

export default async function SessionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const authSession = await auth();
  if (!authSession?.user) redirect("/login");
  const teacherId = Number(authSession.user.id);

  const { id } = await params;
  const sessionId = Number(id);

  const [cs] = await db
    .select({
      id:           classSessions.id,
      date:         classSessions.date,
      closedAt:     classSessions.closedAt,
      status:       classSessions.status,
      groupId:      groups.id,
      groupName:    groups.name,
      subjectName:  subjects.name,
      teacherId:    groupSubjects.teacherId,
    })
    .from(classSessions)
    .innerJoin(groupSubjects, eq(classSessions.groupSubjectId, groupSubjects.id))
    .innerJoin(groups,   eq(groupSubjects.groupId,   groups.id))
    .innerJoin(subjects, eq(groupSubjects.subjectId, subjects.id))
    .where(eq(classSessions.id, sessionId))
    .limit(1);

  if (!cs || cs.teacherId !== teacherId) notFound();

  const startTime  = cs.date?.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" }) ?? "—";
  const closedTime = cs.closedAt?.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" });
  const durationMins = cs.date && cs.closedAt
    ? Math.round((cs.closedAt.getTime() - cs.date.getTime()) / 60000)
    : cs.date ? Math.floor((Date.now() - cs.date.getTime()) / 60000) : 0;

  // ── Sesión cerrada: roster completo ──────────────────────────────
  if (cs.status === "closed") {
    const students = await db
      .select({ studentId: users.id, name: users.name, enrollmentNumber: users.enrollmentNumber })
      .from(groupStudents)
      .innerJoin(users, eq(groupStudents.studentId, users.id))
      .where(eq(groupStudents.groupId, cs.groupId))
      .orderBy(users.name);

    const attRows = await db
      .select({
        attId:        attendances.id,
        studentId:    attendances.studentId,
        status:       attendances.status,
        method:       attendances.method,
        registeredAt: attendances.registeredAt,
      })
      .from(attendances)
      .where(eq(attendances.classSessionId, sessionId));

    const attMap: Record<number, typeof attRows[0]> = {};
    for (const a of attRows) attMap[a.studentId] = a;

    const justMap: Record<number, { status: string | null; description: string | null }> = {};
    const attIds = attRows.map(a => a.attId);
    if (attIds.length > 0) {
      const justs = await db
        .select({ attendanceId: justifications.attendanceId, status: justifications.status, description: justifications.description })
        .from(justifications)
        .where(inArray(justifications.attendanceId, attIds));
      for (const j of justs) justMap[j.attendanceId] = j;
    }

    const roster: RosterRow[] = students.map(s => {
      const att = attMap[s.studentId];
      return {
        studentId:        s.studentId,
        name:             s.name,
        enrollmentNumber: s.enrollmentNumber,
        status:           att?.status ?? "absent",
        method:           att?.method ?? null,
        registeredAt:     att?.registeredAt?.toISOString() ?? null,
        justStatus:       att ? (justMap[att.attId]?.status ?? null) : null,
        justDescription:  att ? (justMap[att.attId]?.description ?? null) : null,
      };
    });

    const present   = roster.filter(r => r.status === "present").length;
    const justified = roster.filter(r => r.status === "justified").length;
    const absent    = roster.filter(r => r.status === "absent").length;
    const total     = roster.length;
    const pct       = total > 0 ? Math.round(((present + justified) / total) * 100) : 0;

    return (
      <div className="flex flex-col flex-1">
        <Header
          title={`${cs.groupName} · ${cs.subjectName}`}
          subtitle={`${cs.date?.toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long" })} · ${startTime}${closedTime ? ` – ${closedTime}` : ""}`}
          actions={<QrBadge tone="gray">Cerrada · {durationMins} min</QrBadge>}
        />
        <ClosedSession
          roster={roster}
          stats={{ present, justified, absent, total, pct }}
        />
      </div>
    );
  }

  // ── Sesión activa ─────────────────────────────────────────────────
  return (
    <div className="flex flex-col flex-1">
      <Header
        title={`Sesión · ${cs.groupName} · ${cs.subjectName}`}
        subtitle={`Iniciada a las ${startTime}`}
        actions={<QrBadge tone="gold">Activa · {durationMins} min transcurridos</QrBadge>}
      />
      <ActiveSession
        sessionId={cs.id}
        groupName={cs.groupName}
        subjectName={cs.subjectName}
        startedAt={cs.date?.toISOString() ?? new Date().toISOString()}
        initialStatus="active"
      />
    </div>
  );
}
