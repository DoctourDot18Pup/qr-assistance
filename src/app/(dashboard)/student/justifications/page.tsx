import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import {
  attendances, classSessions, groupSubjects, subjects, justifications,
} from "@/lib/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { Header } from "@/components/shell/header";
import { QrBadge } from "@/components/ui/qr-badge";
import { SubmitJustificationForm } from "./submit-form";

function justBadge(status: string | null) {
  if (status === "approved") return <QrBadge tone="green">Aprobado</QrBadge>;
  if (status === "rejected") return <QrBadge tone="danger">Rechazado</QrBadge>;
  if (status === "pending")  return <QrBadge tone="gold">Pendiente</QrBadge>;
  return null;
}

export default async function StudentJustificationsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const studentId = Number(session.user.id);

  // Faltas del estudiante (sesiones cerradas)
  const absentRows = await db
    .select({
      attId:       attendances.id,
      attStatus:   attendances.status,
      sessionDate: classSessions.date,
      gsId:        classSessions.groupSubjectId,
      subjectName: subjects.name,
    })
    .from(attendances)
    .innerJoin(classSessions, eq(attendances.classSessionId, classSessions.id))
    .innerJoin(groupSubjects, eq(classSessions.groupSubjectId, groupSubjects.id))
    .innerJoin(subjects, eq(groupSubjects.subjectId, subjects.id))
    .where(and(
      eq(attendances.studentId, studentId),
      inArray(attendances.status, ["absent", "justified"]),
      eq(classSessions.status, "closed"),
    ))
    .orderBy(classSessions.date);

  const attIds = absentRows.map(r => r.attId);

  // Justificantes existentes para esas faltas
  const justMap: Record<number, { id: number; status: string | null; description: string | null; rejectionReason: string | null }> = {};
  if (attIds.length > 0) {
    const justs = await db
      .select({
        id:              justifications.id,
        attendanceId:    justifications.attendanceId,
        status:          justifications.status,
        description:     justifications.description,
        rejectionReason: justifications.rejectionReason,
      })
      .from(justifications)
      .where(inArray(justifications.attendanceId, attIds));

    for (const j of justs) justMap[j.attendanceId] = j;
  }

  // Count pending absences (no justification or rejected)
  const pending = absentRows.filter(r => {
    const j = justMap[r.attId];
    return r.attStatus === "absent" && (!j || j.status === "rejected");
  }).length;

  return (
    <div className="flex flex-col flex-1">
      <Header
        title="Mis justificantes"
        subtitle={`${pending} falta${pending !== 1 ? "s" : ""} pendiente${pending !== 1 ? "s" : ""} de justificar`}
      />

      <div className="flex-1 px-4 md:px-7 py-4 md:py-6">
        {absentRows.length === 0 ? (
          <div className="bg-white border border-[#D8CFB8] rounded-[6px] py-14 text-center text-[#6B6457] text-sm">
            No tienes faltas registradas. ¡Excelente asistencia!
          </div>
        ) : (
          <div className="bg-white border border-[#D8CFB8] rounded-[6px]">
            <div className="px-[18px] py-4 border-b border-[#D8CFB8]">
              <span className="text-sm font-semibold text-[#0A0A0A]">Registro de faltas</span>
            </div>
            <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-[#D8CFB8] text-[11px] font-semibold uppercase tracking-wide text-[#6B6457]">
                  <th className="text-left px-[18px] py-3 whitespace-nowrap">Materia</th>
                  <th className="text-left px-4 py-3 whitespace-nowrap">Fecha de sesión</th>
                  <th className="text-left px-4 py-3 whitespace-nowrap">Estado</th>
                  <th className="text-left px-4 py-3 whitespace-nowrap">Justificante</th>
                  <th className="px-4 py-3 w-40 whitespace-nowrap">Acción</th>
                </tr>
              </thead>
              <tbody>
                {absentRows.map((row, i) => {
                  const j = justMap[row.attId];
                  const isJustified = row.attStatus === "justified";
                  return (
                    <tr key={row.attId} className={i % 2 === 1 ? "bg-[#F5F1EA]" : ""}>
                      <td className="px-[18px] py-3 font-semibold text-[#0A0A0A]">{row.subjectName}</td>
                      <td className="px-4 py-3 tabular text-[#6B6457] text-xs">
                        {row.sessionDate?.toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" }) ?? "—"}
                      </td>
                      <td className="px-4 py-3">
                        {isJustified
                          ? <QrBadge tone="green">Justificada</QrBadge>
                          : <QrBadge tone="danger">Falta</QrBadge>}
                      </td>
                      <td className="px-4 py-3">
                        {j ? (
                          <div className="flex flex-col gap-1">
                            {justBadge(j.status)}
                            {j.status === "rejected" && j.rejectionReason && (
                              <span className="text-[10.5px] text-[#7A1A1A]">{j.rejectionReason}</span>
                            )}
                          </div>
                        ) : isJustified ? (
                          <QrBadge tone="green">Aprobado</QrBadge>
                        ) : (
                          <span className="text-[#6B6457] text-xs">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {!isJustified && (!j || j.status === "rejected") ? (
                          <SubmitJustificationForm attendanceId={row.attId} />
                        ) : (
                          <span className="text-[#6B6457] text-xs">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
