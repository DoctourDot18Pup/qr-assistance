"use client";

import { useState, useTransition } from "react";
import { Plus, X } from "lucide-react";
import { assignSubject, removeSubject } from "./actions";

interface AssignedSubject {
  gsId:        number;
  subjectName: string;
  subjectCode: string;
  teacherName: string;
}

interface AvailableSubject {
  id:   number;
  name: string;
  code: string;
}

interface Teacher {
  id:   number;
  name: string;
}

interface Props {
  groupId:           number;
  assigned:          AssignedSubject[];
  availableSubjects: AvailableSubject[];
  teachers:          Teacher[];
}

function RemoveButton({ gsId, groupId }: { gsId: number; groupId: number }) {
  const [confirm, setConfirm] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");

  function handleConfirm() {
    setError("");
    startTransition(async () => {
      const res = await removeSubject(gsId, groupId);
      if (!res.ok) { setError(res.message ?? "Error al quitar."); setConfirm(false); }
    });
  }

  if (confirm) {
    return (
      <div className="flex items-center gap-1.5">
        <button
          onClick={handleConfirm}
          disabled={pending}
          className="h-6 px-2.5 text-[11px] font-semibold bg-[#7A1A1A] text-white rounded hover:bg-[#6b1717] transition-colors disabled:opacity-50"
        >
          {pending ? "…" : "Confirmar"}
        </button>
        <button
          onClick={() => { setConfirm(false); setError(""); }}
          disabled={pending}
          className="h-6 px-2 text-[11px] text-[#6B6457] hover:text-[#0A0A0A] disabled:opacity-50"
        >
          Cancelar
        </button>
        {error && <p className="text-[10px] text-[#7A1A1A]">{error}</p>}
      </div>
    );
  }

  return (
    <button
      onClick={() => setConfirm(true)}
      className="h-6 px-2.5 text-[11px] font-semibold border border-[#7A1A1A] text-[#7A1A1A] rounded hover:bg-[#FEF2F2] transition-colors"
    >
      Quitar
    </button>
  );
}

export function SubjectManager({ groupId, assigned, availableSubjects, teachers }: Props) {
  const [open, setOpen] = useState(false);
  const [subjectId, setSubjectId] = useState("");
  const [teacherId, setTeacherId] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");

  const assignedIds = new Set(assigned.map(a => a.gsId));
  const unassigned = availableSubjects.filter(s =>
    !assigned.some(a => a.subjectCode === s.code)
  );

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!subjectId || !teacherId) { setError("Selecciona materia y docente."); return; }
    setError("");
    startTransition(async () => {
      const res = await assignSubject(groupId, Number(subjectId), Number(teacherId));
      if (!res.ok) { setError(res.message ?? "Error."); return; }
      setOpen(false);
      setSubjectId("");
      setTeacherId("");
    });
  }

  return (
    <div className="bg-white border border-[#D8CFB8] rounded-[6px]">
      <div className="flex items-center justify-between px-[18px] py-4 border-b border-[#D8CFB8]">
        <span className="text-sm font-semibold text-[#0A0A0A]">Materias asignadas</span>
        <button
          onClick={() => setOpen(true)}
          disabled={unassigned.length === 0}
          className="h-7 px-3 text-[12px] font-semibold bg-[#1B3A2D] text-white rounded hover:bg-[#163023] transition-colors flex items-center gap-1.5 disabled:opacity-40"
        >
          <Plus size={12} /> Asignar materia
        </button>
      </div>

      {assigned.length === 0 ? (
        <div className="py-10 text-center text-[#6B6457] text-sm">
          Sin materias asignadas. Usa el botón para agregar.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-[#D8CFB8] text-[11px] font-semibold uppercase tracking-wide text-[#6B6457]">
                <th className="text-left px-[18px] py-3">Materia</th>
                <th className="text-left px-4 py-3">Código</th>
                <th className="text-left px-4 py-3">Docente</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {assigned.map((a, i) => (
                <tr key={a.gsId} className={i % 2 === 1 ? "bg-[#F5F1EA]" : ""}>
                  <td className="px-[18px] py-3 font-semibold text-[#0A0A0A]">{a.subjectName}</td>
                  <td className="px-4 py-3 tabular text-[#6B6457]">{a.subjectCode}</td>
                  <td className="px-4 py-3 text-[#6B6457]">{a.teacherName}</td>
                  <td className="px-4 py-3 text-right">
                    <RemoveButton gsId={a.gsId} groupId={groupId} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/30" onClick={() => setOpen(false)} />
          <div className="relative bg-white border border-[#D8CFB8] rounded-[6px] w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#D8CFB8]">
              <span className="text-sm font-semibold text-[#0A0A0A]">Asignar materia</span>
              <button onClick={() => setOpen(false)} className="text-[#6B6457] hover:text-[#0A0A0A]">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#0A0A0A]">Materia</label>
                <select
                  value={subjectId}
                  onChange={e => setSubjectId(e.target.value)}
                  required
                  className="w-full h-8 px-3 text-[13px] border border-[#D8CFB8] rounded bg-white focus:outline-none focus:ring-1 focus:ring-[#1B3A2D]"
                >
                  <option value="">Seleccionar materia…</option>
                  {unassigned.map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#0A0A0A]">Docente</label>
                <select
                  value={teacherId}
                  onChange={e => setTeacherId(e.target.value)}
                  required
                  className="w-full h-8 px-3 text-[13px] border border-[#D8CFB8] rounded bg-white focus:outline-none focus:ring-1 focus:ring-[#1B3A2D]"
                >
                  <option value="">Seleccionar docente…</option>
                  {teachers.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>

              {error && <p className="text-xs text-[#7A1A1A] font-semibold">{error}</p>}

              <div className="flex justify-end gap-2 pt-4 border-t border-[#D8CFB8]">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="h-8 px-4 text-[13px] font-semibold border border-[#1B3A2D] text-[#1B3A2D] rounded hover:bg-[#F5F1EA] transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={pending}
                  className="h-8 px-4 text-[13px] font-semibold bg-[#1B3A2D] text-white rounded hover:bg-[#163023] transition-colors disabled:opacity-50"
                >
                  {pending ? "Asignando…" : "Asignar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
