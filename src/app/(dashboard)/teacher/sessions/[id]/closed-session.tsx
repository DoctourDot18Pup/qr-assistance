import { QrBadge, attendanceTone } from "@/components/ui/qr-badge";
import { Check, X, FileText, QrCode, User } from "lucide-react";
import Link from "next/link";

export interface RosterRow {
  studentId:        number;
  name:             string;
  enrollmentNumber: string | null;
  status:           string;
  method:           string | null;
  registeredAt:     string | null;
  justStatus:       string | null;
  justDescription:  string | null;
}

interface Stats {
  present:   number;
  justified: number;
  absent:    number;
  total:     number;
  pct:       number;
}

function statusBadge(status: string) {
  if (status === "present")   return <QrBadge tone="green">Presente</QrBadge>;
  if (status === "justified") return <QrBadge tone="gold">Justificado</QrBadge>;
  return <QrBadge tone="danger">Ausente</QrBadge>;
}

function methodIcon(method: string | null) {
  if (method === "qr")     return <span className="inline-flex items-center gap-1 text-[11px] text-[#6B6457]"><QrCode size={11} /> QR</span>;
  if (method === "manual") return <span className="inline-flex items-center gap-1 text-[11px] text-[#6B6457]"><User size={11} /> Manual</span>;
  return <span className="text-[#6B6457] text-[11px]">—</span>;
}

function justBadge(status: string | null) {
  if (status === "approved") return <QrBadge tone="green">Aprobado</QrBadge>;
  if (status === "rejected") return <QrBadge tone="danger">Rechazado</QrBadge>;
  if (status === "pending")  return <QrBadge tone="gold">Pendiente</QrBadge>;
  return null;
}

function formatTime(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

export function ClosedSession({ roster, stats }: { roster: RosterRow[]; stats: Stats }) {
  return (
    <div className="flex-1 px-4 md:px-7 py-4 md:py-6 space-y-[18px]">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-[14px]">
        {[
          { label: "Total alumnos",  value: stats.total,     color: "text-[#0A0A0A]" },
          { label: "Presentes",      value: stats.present,   color: "text-[#2F6A4B]" },
          { label: "Justificados",   value: stats.justified, color: "text-[#7A5A00]" },
          { label: "Ausentes",       value: stats.absent,    color: "text-[#7A1A1A]" },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white border border-[#D8CFB8] rounded-[6px] p-[18px]">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-[#6B6457] mb-1">{label}</div>
            <div className={`text-3xl font-semibold tabular leading-none ${color}`}>{value}</div>
          </div>
        ))}
      </div>

      {/* Tabla de asistencia */}
      <div className="bg-white border border-[#D8CFB8] rounded-[6px]">
        <div className="flex items-center justify-between px-[18px] py-4 border-b border-[#D8CFB8]">
          <span className="text-sm font-semibold text-[#0A0A0A]">Lista de asistencia</span>
          <QrBadge tone={attendanceTone(stats.pct)}>{stats.pct}% asistencia</QrBadge>
        </div>

        <div className="overflow-x-auto">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="border-b border-[#D8CFB8] text-[11px] font-semibold uppercase tracking-wide text-[#6B6457]">
              <th className="text-left px-[18px] py-3">Estudiante</th>
              <th className="text-left px-4 py-3">Matrícula</th>
              <th className="text-left px-4 py-3">Estado</th>
              <th className="text-left px-4 py-3">Método</th>
              <th className="text-left px-4 py-3">Hora de registro</th>
              <th className="text-left px-4 py-3">Justificante</th>
            </tr>
          </thead>
          <tbody>
            {roster.map((r, i) => (
              <tr key={r.studentId} className={i % 2 === 1 ? "bg-[#F5F1EA]" : ""}>
                <td className="px-[18px] py-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-[#E8E0CC] border border-[#D8CFB8] flex items-center justify-center text-[10px] font-semibold text-[#1B3A2D] shrink-0">
                      {r.name.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase()}
                    </div>
                    <span className="font-semibold text-[#0A0A0A]">{r.name}</span>
                  </div>
                </td>
                <td className="px-4 py-3 tabular text-[#6B6457]">{r.enrollmentNumber ?? "—"}</td>
                <td className="px-4 py-3">{statusBadge(r.status)}</td>
                <td className="px-4 py-3">{methodIcon(r.method)}</td>
                <td className="px-4 py-3 tabular text-[#6B6457] text-xs">
                  {r.status === "present" || r.status === "justified"
                    ? formatTime(r.registeredAt)
                    : <span className="text-[#7A1A1A]">No asistió</span>}
                </td>
                <td className="px-4 py-3">
                  {justBadge(r.justStatus)}
                  {r.justDescription && (
                    <div className="text-[11px] text-[#6B6457] mt-0.5 max-w-[180px] truncate" title={r.justDescription}>
                      {r.justDescription}
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-[18px] py-3 border-t border-[#D8CFB8]">
          <span className="text-xs text-[#6B6457]">
            {stats.present + stats.justified} de {stats.total} asistieron
          </span>
          <div className="flex flex-wrap items-center gap-3 text-[11px] text-[#6B6457]">
            <span className="flex items-center gap-1"><Check size={11} className="text-[#2F6A4B]" /> Presente: QR o manual</span>
            <span className="flex items-center gap-1"><FileText size={11} className="text-[#B8965A]" /> Justificado: falta aceptada</span>
            <span className="flex items-center gap-1"><X size={11} className="text-[#7A1A1A]" /> Ausente: no registró</span>
          </div>
        </div>
      </div>
    </div>
  );
}
