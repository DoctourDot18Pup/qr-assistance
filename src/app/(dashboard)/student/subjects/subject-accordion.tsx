"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { QrBadge, attendanceTone } from "@/components/ui/qr-badge";

type SessionItem = { date: string; status: string | null };

type SubjectItem = {
  gsId: number;
  groupName: string;
  subjectName: string;
  teacherName: string;
  pct: number | null;
  sessions: SessionItem[];
};

function statusBadge(status: string | null) {
  if (status === "present")   return <QrBadge tone="green">Presente</QrBadge>;
  if (status === "justified") return <QrBadge tone="gold">Justificado</QrBadge>;
  return <QrBadge tone="danger">Ausente</QrBadge>;
}

export function SubjectAccordionList({ subjects }: { subjects: SubjectItem[] }) {
  const [open, setOpen] = useState<Record<number, boolean>>({});

  function toggle(gsId: number) {
    setOpen(prev => ({ ...prev, [gsId]: !prev[gsId] }));
  }

  return (
    <div className="space-y-2">
      {subjects.map(sub => (
        <div key={sub.gsId} className="bg-white border border-[#D8CFB8] rounded-[6px] overflow-hidden">
          <button
            type="button"
            onClick={() => toggle(sub.gsId)}
            className="w-full flex items-center gap-3 px-[18px] py-4 text-left hover:bg-[#F5F1EA] transition-colors"
          >
            <QrBadge tone="dark">{sub.groupName}</QrBadge>
            <div className="flex-1 min-w-0">
              <div className="text-[14px] font-semibold text-[#0A0A0A] truncate">{sub.subjectName}</div>
              <div className="text-xs text-[#6B6457] mt-0.5">{sub.teacherName}</div>
            </div>
            {sub.pct !== null
              ? <QrBadge tone={attendanceTone(sub.pct)}>{sub.pct}% asistencia</QrBadge>
              : <QrBadge tone="gray">Sin sesiones</QrBadge>}
            {open[sub.gsId]
              ? <ChevronUp size={16} className="text-[#6B6457] shrink-0" />
              : <ChevronDown size={16} className="text-[#6B6457] shrink-0" />}
          </button>

          {open[sub.gsId] && (
            <div className="border-t border-[#D8CFB8]">
              {sub.sessions.length === 0 ? (
                <div className="px-[18px] py-6 text-sm text-[#6B6457] text-center">
                  Sin sesiones cerradas aún.
                </div>
              ) : (
                <table className="w-full text-[13px]">
                  <thead>
                    <tr className="border-b border-[#D8CFB8] text-[11px] font-semibold uppercase tracking-wide text-[#6B6457]">
                      <th className="text-left px-[18px] py-3 whitespace-nowrap">Fecha</th>
                      <th className="text-left px-4 py-3 whitespace-nowrap">Hora</th>
                      <th className="text-left px-4 py-3 whitespace-nowrap">Estado de asistencia</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sub.sessions.map((sess, i) => {
                      const d = new Date(sess.date);
                      return (
                        <tr key={i} className={i % 2 === 1 ? "bg-[#F5F1EA]" : ""}>
                          <td className="px-[18px] py-3 text-[#6B6457]">
                            {d.toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" })}
                          </td>
                          <td className="px-4 py-3 tabular text-[#6B6457]">
                            {d.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })}
                          </td>
                          <td className="px-4 py-3">{statusBadge(sess.status)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
