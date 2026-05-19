"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import { QrBadge, attendanceTone } from "@/components/ui/qr-badge";

type Student = { id: number; name: string; enrollmentNumber: string | null };
type AttStat = { present: number; absent: number; justified: number; total: number };

export function StudentSearchTable({
  title,
  students,
  attendanceStats,
}: {
  title: string;
  students: Student[];
  attendanceStats: Record<number, AttStat>;
}) {
  const [q, setQ] = useState("");

  const filtered = q.trim()
    ? students.filter(s =>
        s.name.toLowerCase().includes(q.toLowerCase()) ||
        (s.enrollmentNumber ?? "").includes(q)
      )
    : students;

  return (
    <div className="bg-white border border-[#D8CFB8] rounded-[6px]">
      <div className="flex items-center justify-between px-[18px] py-4 border-b border-[#D8CFB8] gap-4 flex-wrap">
        <span className="text-sm font-semibold text-[#0A0A0A] shrink-0">{title}</span>
        <div className="relative">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#6B6457] pointer-events-none" />
          <input
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Buscar estudiante"
            className="h-8 w-48 pl-8 pr-3 text-[13px] border border-[#D8CFB8] rounded bg-white focus:outline-none focus:ring-1 focus:ring-[#1B3A2D]"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="py-10 text-center text-[#6B6457] text-sm">
          {q ? `Sin resultados para "${q}".` : "No hay estudiantes inscritos en este grupo."}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-[#D8CFB8] text-[11px] font-semibold uppercase tracking-wide text-[#6B6457]">
                <th className="text-left px-[18px] py-3 whitespace-nowrap">Matrícula</th>
                <th className="text-left px-4 py-3 whitespace-nowrap">Estudiante</th>
                <th className="text-left px-4 py-3 whitespace-nowrap">Presentes</th>
                <th className="text-left px-4 py-3 whitespace-nowrap">Ausentes</th>
                <th className="text-left px-4 py-3 whitespace-nowrap">Justificadas</th>
                <th className="text-left px-4 py-3 whitespace-nowrap">Asistencia</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s, i) => {
                const st = attendanceStats[s.id];
                const pct = st && st.total > 0
                  ? Math.round(((st.present + st.justified) / st.total) * 100)
                  : null;
                return (
                  <tr key={s.id} className={i % 2 === 1 ? "bg-[#F5F1EA]" : ""}>
                    <td className="px-[18px] py-3 tabular text-[#6B6457]">{s.enrollmentNumber ?? "—"}</td>
                    <td className="px-4 py-3 font-semibold text-[#0A0A0A]">{s.name}</td>
                    <td className="px-4 py-3 tabular text-[#0A0A0A]">{st?.present ?? "—"}</td>
                    <td className="px-4 py-3 tabular text-[#0A0A0A]">{st?.absent ?? "—"}</td>
                    <td className="px-4 py-3 tabular text-[#0A0A0A]">{st?.justified ?? "—"}</td>
                    <td className="px-4 py-3">
                      {pct !== null
                        ? <QrBadge tone={attendanceTone(pct)}>{pct}%</QrBadge>
                        : <span className="text-[#6B6457]">—</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
