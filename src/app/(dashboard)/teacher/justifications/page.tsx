import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import {
  justifications, attendances, classSessions,
  groupSubjects, groups, subjects, users,
} from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { Header } from "@/components/shell/header";
import { QrBadge } from "@/components/ui/qr-badge";
import { FileText, Check, X } from "lucide-react";
import { resolveJustification } from "./actions";

async function getJustifications(teacherId: number, statusFilter: string) {
  const rows = await db
    .select({
      id:           justifications.id,
      status:       justifications.status,
      description:  justifications.description,
      filePath:     justifications.filePath,
      createdAt:    justifications.createdAt,
      sessionDate:  classSessions.date,
      studentName:  users.name,
      subjectName:  subjects.name,
    })
    .from(justifications)
    .innerJoin(attendances,   eq(justifications.attendanceId, attendances.id))
    .innerJoin(classSessions, eq(attendances.classSessionId, classSessions.id))
    .innerJoin(groupSubjects, eq(classSessions.groupSubjectId, groupSubjects.id))
    .innerJoin(groups,   eq(groupSubjects.groupId,   groups.id))
    .innerJoin(subjects, eq(groupSubjects.subjectId, subjects.id))
    .innerJoin(users,    eq(attendances.studentId,   users.id))
    .where(eq(groupSubjects.teacherId, teacherId))
    .orderBy(desc(justifications.createdAt))
    .limit(100);

  if (statusFilter === "pending")  return rows.filter(r => r.status === "pending");
  if (statusFilter === "approved") return rows.filter(r => r.status === "approved");
  if (statusFilter === "rejected") return rows.filter(r => r.status === "rejected");
  return rows;
}

function statusBadge(status: string | null) {
  if (status === "approved") return <QrBadge tone="green">Aprobado</QrBadge>;
  if (status === "rejected") return <QrBadge tone="danger">Rechazado</QrBadge>;
  return <QrBadge tone="gold">Pendiente</QrBadge>;
}

export default async function TeacherJustificationsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const teacherId = Number(session.user.id);

  const params = await searchParams;
  const statusFilter = params.status ?? "pending";

  const list = await getJustifications(teacherId, statusFilter);
  const pending = list.filter(j => j.status === "pending").length;

  return (
    <div className="flex flex-col flex-1">
      <Header
        title="Justificantes"
        subtitle={`${pending} pendiente${pending !== 1 ? "s" : ""} de revisión`}
      />

      <div className="flex-1 px-4 md:px-7 py-4 md:py-6">
        {/* Filtros */}
        <form method="GET" className="flex gap-3 mb-4">
          {[
            { value: "pending",  label: "Solo pendientes" },
            { value: "all",      label: "Todos" },
            { value: "approved", label: "Aprobados" },
            { value: "rejected", label: "Rechazados" },
          ].map(opt => (
            <button
              key={opt.value}
              type="submit"
              name="status"
              value={opt.value}
              className={[
                "h-8 px-4 text-[13px] font-semibold rounded transition-colors",
                statusFilter === opt.value
                  ? "bg-[#1B3A2D] text-white"
                  : "border border-[#D8CFB8] text-[#6B6457] hover:bg-[#F5F1EA]",
              ].join(" ")}
            >
              {opt.label}
            </button>
          ))}
        </form>

        <div className="bg-white border border-[#D8CFB8] rounded-[6px]">
          {list.length === 0 ? (
            <div className="py-14 text-center text-[#6B6457] text-sm">
              No hay justificantes {statusFilter === "pending" ? "pendientes" : "en esta categoría"}.
            </div>
          ) : (
            <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-[#D8CFB8] text-[11px] font-semibold uppercase tracking-wide text-[#6B6457]">
                  <th className="text-left px-[18px] py-3 whitespace-nowrap">Estudiante</th>
                  <th className="text-left px-4 py-3 whitespace-nowrap">Materia</th>
                  <th className="text-left px-4 py-3 whitespace-nowrap">Sesión</th>
                  <th className="text-left px-4 py-3 whitespace-nowrap">Motivo</th>
                  <th className="text-left px-4 py-3 whitespace-nowrap">Adjunto</th>
                  <th className="text-left px-4 py-3 whitespace-nowrap">Estado</th>
                  <th className="px-4 py-3 w-36 whitespace-nowrap">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {list.map((j, i) => (
                  <tr key={j.id} className={i % 2 === 1 ? "bg-[#F5F1EA]" : ""}>
                    <td className="px-[18px] py-3 font-semibold text-[#0A0A0A]">{j.studentName}</td>
                    <td className="px-4 py-3 text-[#6B6457]">{j.subjectName}</td>
                    <td className="px-4 py-3 tabular text-[#6B6457] text-xs">
                      {j.sessionDate?.toLocaleDateString("es-MX", { day: "numeric", month: "short" }) ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-[#0A0A0A] max-w-[200px] truncate">
                      {j.description ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      {j.filePath ? (
                        <a
                          href={j.filePath}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-[#1B3A2D] underline text-xs"
                        >
                          <FileText size={12} /> Ver archivo
                        </a>
                      ) : (
                        <span className="text-[#6B6457]">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">{statusBadge(j.status)}</td>
                    <td className="px-4 py-3">
                      {j.status === "pending" ? (
                        <div className="flex gap-2">
                          <form action={async () => { "use server"; await resolveJustification(j.id, "approved"); }}>
                            <button type="submit" className="h-7 px-3 text-xs font-semibold bg-[#1B3A2D] text-white rounded hover:bg-[#163023] transition-colors flex items-center gap-1">
                              <Check size={11} /> Aprobar
                            </button>
                          </form>
                          <form action={async () => { "use server"; await resolveJustification(j.id, "rejected"); }}>
                            <button type="submit" className="h-7 px-3 text-xs font-semibold border border-[#1B3A2D] text-[#1B3A2D] rounded hover:bg-[#F5F1EA] transition-colors flex items-center gap-1">
                              <X size={11} /> Rechazar
                            </button>
                          </form>
                        </div>
                      ) : (
                        <span className="text-[#6B6457] text-xs">—</span>
                      )}
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
