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
import { Paperclip } from "lucide-react";

function justBadge(status: string | null) {
  if (status === "approved") return <QrBadge tone="green">Aprobado</QrBadge>;
  if (status === "rejected") return <QrBadge tone="danger">Rechazado</QrBadge>;
  if (status === "pending")  return <QrBadge tone="gold">Pendiente</QrBadge>;
  return <QrBadge tone="gray">Sin justificante</QrBadge>;
}

export default async function StudentJustificationsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const studentId = Number(session.user.id);

  const absentRows = await db
    .select({
      attId:       attendances.id,
      attStatus:   attendances.status,
      sessionDate: classSessions.date,
      subjectName: subjects.name,
    })
    .from(attendances)
    .innerJoin(classSessions, eq(attendances.classSessionId, classSessions.id))
    .innerJoin(groupSubjects, eq(classSessions.groupSubjectId, groupSubjects.id))
    .innerJoin(subjects,      eq(groupSubjects.subjectId,      subjects.id))
    .where(and(
      eq(attendances.studentId, studentId),
      inArray(attendances.status, ["absent", "justified"]),
      eq(classSessions.status, "closed"),
    ))
    .orderBy(classSessions.date);

  const attIds = absentRows.map(r => r.attId);

  const justMap: Record<number, {
    id: number;
    status: string | null;
    description: string | null;
    filePath: string | null;
    rejectionReason: string | null;
  }> = {};

  if (attIds.length > 0) {
    const justs = await db
      .select({
        id:              justifications.id,
        attendanceId:    justifications.attendanceId,
        status:          justifications.status,
        description:     justifications.description,
        filePath:        justifications.filePath,
        rejectionReason: justifications.rejectionReason,
      })
      .from(justifications)
      .where(inArray(justifications.attendanceId, attIds));

    for (const j of justs) justMap[j.attendanceId] = j;
  }

  function formatDate(d: Date | string | null) {
    if (!d) return "—";
    const dt = d instanceof Date ? d : new Date(d);
    return dt.toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric", timeZone: "America/Mexico_City" });
  }

  // Sessions the student can still justify
  const formSessions = absentRows
    .filter(r => r.attStatus === "absent" && (!justMap[r.attId] || justMap[r.attId].status === "rejected"))
    .map(r => ({
      attId: r.attId,
      label: `${r.subjectName} · ${formatDate(r.sessionDate)}`,
    }));

  const allJusts = Object.values(justMap);
  const totalSent  = allJusts.length;
  const pendingCount = allJusts.filter(j => j.status === "pending").length;

  return (
    <div className="flex flex-col flex-1">
      <Header
        title="Mis justificantes"
        subtitle={
          totalSent > 0
            ? `${totalSent} enviado${totalSent !== 1 ? "s" : ""} · ${pendingCount} pendiente${pendingCount !== 1 ? "s" : ""}`
            : "Sin justificantes enviados"
        }
      />

      <div className="flex-1 px-4 md:px-7 py-4 md:py-6 space-y-[18px]">
        {/* Form + Lineamientos */}
        <div className="grid grid-cols-1 md:grid-cols-[1fr_340px] gap-[14px] items-start">
          {/* Form */}
          <div className="bg-white border border-[#D8CFB8] rounded-[6px] p-[18px]">
            <div className="text-sm font-semibold text-[#0A0A0A] mb-4">Enviar justificante</div>
            <SubmitJustificationForm sessions={formSessions} />
          </div>

          {/* Lineamientos */}
          <div className="bg-[#F5F1EA] border border-[#D8CFB8] rounded-[6px] p-[18px]">
            <div className="text-sm font-semibold text-[#0A0A0A] mb-3">Lineamientos</div>
            <ul className="space-y-2.5 text-[12px] text-[#6B6457]">
              {[
                "Solo puedes justificar faltas de sesiones ya cerradas por el docente.",
                "Adjunta un comprobante oficial si es posible (constancia médica, justificante institucional, etc.).",
                "El docente revisará y aprobará o rechazará tu justificante.",
                "Un justificante aprobado cambia tu estado de Ausente a Justificado.",
                "No puedes enviar más de un justificante por sesión.",
                "Los justificantes rechazados pueden volver a enviarse.",
              ].map((line, i) => (
                <li key={i} className="flex gap-2">
                  <span className="shrink-0 text-[#1B3A2D] font-bold">·</span>
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Historial */}
        <div className="bg-white border border-[#D8CFB8] rounded-[6px]">
          <div className="flex items-center justify-between px-[18px] py-4 border-b border-[#D8CFB8] gap-3 flex-wrap">
            <span className="text-sm font-semibold text-[#0A0A0A]">Historial de faltas</span>
            {totalSent > 0 && (
              <QrBadge tone="gold">
                {totalSent} enviado{totalSent !== 1 ? "s" : ""} · {pendingCount} pendiente{pendingCount !== 1 ? "s" : ""}
              </QrBadge>
            )}
          </div>

          {absentRows.length === 0 ? (
            <div className="py-12 text-center text-[#6B6457] text-sm">
              No tienes faltas registradas. ¡Excelente asistencia!
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="border-b border-[#D8CFB8] text-[11px] font-semibold uppercase tracking-wide text-[#6B6457]">
                    <th className="text-left px-[18px] py-3 whitespace-nowrap">Sesión ausente</th>
                    <th className="text-left px-4 py-3 whitespace-nowrap">Materia</th>
                    <th className="text-left px-4 py-3 whitespace-nowrap">Motivo</th>
                    <th className="text-left px-4 py-3 whitespace-nowrap">Adjunto</th>
                    <th className="text-left px-4 py-3 whitespace-nowrap">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {absentRows.map((row, i) => {
                    const j = justMap[row.attId];
                    const effectiveStatus = row.attStatus === "justified"
                      ? "approved"
                      : j?.status ?? null;

                    return (
                      <tr key={row.attId} className={i % 2 === 1 ? "bg-[#F5F1EA]" : ""}>
                        <td className="px-[18px] py-3 tabular text-[#6B6457] text-xs whitespace-nowrap">
                          {formatDate(row.sessionDate)}
                        </td>
                        <td className="px-4 py-3 font-semibold text-[#0A0A0A]">{row.subjectName}</td>
                        <td className="px-4 py-3 text-[#6B6457] max-w-[200px]">
                          {j?.description
                            ? <span className="line-clamp-2">{j.description}</span>
                            : <span>—</span>}
                        </td>
                        <td className="px-4 py-3">
                          {j?.filePath
                            ? <Paperclip size={14} className="text-[#1B3A2D]" />
                            : <span className="text-[#6B6457]">—</span>}
                        </td>
                        <td className="px-4 py-3">
                          {justBadge(effectiveStatus)}
                          {j?.status === "rejected" && j.rejectionReason && (
                            <div className="text-[10.5px] text-[#7A1A1A] mt-0.5">{j.rejectionReason}</div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
