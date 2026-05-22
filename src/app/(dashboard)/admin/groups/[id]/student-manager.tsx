"use client";

import { useState, useTransition } from "react";
import { Plus, X } from "lucide-react";
import { enrollStudent, removeStudent } from "./actions";

interface Student {
  studentId:        number;
  name:             string;
  enrollmentNumber: string | null;
}

interface AvailableStudent {
  id:               number;
  name:             string;
  enrollmentNumber: string | null;
}

interface Props {
  groupId:           number;
  enrolled:          Student[];
  availableStudents: AvailableStudent[];
}

function RemoveButton({ groupId, studentId }: { groupId: number; studentId: number }) {
  const [confirm, setConfirm] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");

  function handleConfirm() {
    setError("");
    startTransition(async () => {
      const res = await removeStudent(groupId, studentId);
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

export function StudentManager({ groupId, enrolled, availableStudents }: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [modalSearch, setModalSearch] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");

  const enrolledIds = new Set(enrolled.map(e => e.studentId));
  const available = availableStudents.filter(s => !enrolledIds.has(s.id));

  const filtered = enrolled.filter(s => {
    const q = search.toLowerCase();
    return (
      s.name.toLowerCase().includes(q) ||
      (s.enrollmentNumber ?? "").toLowerCase().includes(q)
    );
  });

  const modalFiltered = available.filter(s => {
    const q = modalSearch.toLowerCase();
    return (
      s.name.toLowerCase().includes(q) ||
      (s.enrollmentNumber ?? "").toLowerCase().includes(q)
    );
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedId) { setError("Selecciona un alumno."); return; }
    setError("");
    startTransition(async () => {
      const res = await enrollStudent(groupId, Number(selectedId));
      if (!res.ok) { setError(res.message ?? "Error."); return; }
      setOpen(false);
      setSelectedId("");
      setModalSearch("");
    });
  }

  return (
    <div className="bg-white border border-[#D8CFB8] rounded-[6px]">
      <div className="flex items-center justify-between px-[18px] py-4 border-b border-[#D8CFB8]">
        <span className="text-sm font-semibold text-[#0A0A0A]">
          Alumnos inscritos
          <span className="ml-2 text-[#6B6457] font-normal text-xs">({enrolled.length})</span>
        </span>
        <button
          onClick={() => setOpen(true)}
          disabled={available.length === 0}
          className="h-7 px-3 text-[12px] font-semibold bg-[#1B3A2D] text-white rounded hover:bg-[#163023] transition-colors flex items-center gap-1.5 disabled:opacity-40"
        >
          <Plus size={12} /> Inscribir alumno
        </button>
      </div>

      {enrolled.length > 0 && (
        <div className="px-[18px] py-3 border-b border-[#D8CFB8]">
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nombre o matrícula…"
            className="w-full max-w-xs h-8 px-3 text-[13px] border border-[#D8CFB8] rounded bg-white focus:outline-none focus:ring-1 focus:ring-[#1B3A2D]"
          />
        </div>
      )}

      {enrolled.length === 0 ? (
        <div className="py-10 text-center text-[#6B6457] text-sm">
          Sin alumnos inscritos. Usa el botón para agregar.
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-8 text-center text-[#6B6457] text-sm">
          Sin resultados para esa búsqueda.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-[#D8CFB8] text-[11px] font-semibold uppercase tracking-wide text-[#6B6457]">
                <th className="text-left px-[18px] py-3">Alumno</th>
                <th className="text-left px-4 py-3">Matrícula</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((s, i) => (
                <tr key={s.studentId} className={i % 2 === 1 ? "bg-[#F5F1EA]" : ""}>
                  <td className="px-[18px] py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-[#E8E0CC] border border-[#D8CFB8] flex items-center justify-center text-[10px] font-semibold text-[#1B3A2D] shrink-0">
                        {s.name.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase()}
                      </div>
                      <span className="font-semibold text-[#0A0A0A]">{s.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 tabular text-[#6B6457]">{s.enrollmentNumber ?? "—"}</td>
                  <td className="px-4 py-3 text-right">
                    <RemoveButton groupId={groupId} studentId={s.studentId} />
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
              <span className="text-sm font-semibold text-[#0A0A0A]">Inscribir alumno</span>
              <button onClick={() => setOpen(false)} className="text-[#6B6457] hover:text-[#0A0A0A]">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#0A0A0A]">Buscar alumno</label>
                <input
                  value={modalSearch}
                  onChange={e => { setModalSearch(e.target.value); setSelectedId(""); }}
                  placeholder="Nombre o matrícula…"
                  className="w-full h-8 px-3 text-[13px] border border-[#D8CFB8] rounded bg-white focus:outline-none focus:ring-1 focus:ring-[#1B3A2D]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#0A0A0A]">Alumno</label>
                <div className="border border-[#D8CFB8] rounded max-h-48 overflow-y-auto">
                  {modalFiltered.length === 0 ? (
                    <div className="py-6 text-center text-xs text-[#6B6457]">Sin resultados.</div>
                  ) : (
                    modalFiltered.map(s => (
                      <label
                        key={s.id}
                        className={[
                          "flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-[#F5F1EA] transition-colors",
                          String(s.id) === selectedId ? "bg-[#F5F1EA]" : "",
                        ].join(" ")}
                      >
                        <input
                          type="radio"
                          name="studentId"
                          value={s.id}
                          checked={String(s.id) === selectedId}
                          onChange={() => setSelectedId(String(s.id))}
                          className="accent-[#1B3A2D]"
                        />
                        <span className="text-[13px] text-[#0A0A0A]">{s.name}</span>
                        <span className="text-[11px] text-[#6B6457] ml-auto">{s.enrollmentNumber ?? "—"}</span>
                      </label>
                    ))
                  )}
                </div>
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
                  disabled={pending || !selectedId}
                  className="h-8 px-4 text-[13px] font-semibold bg-[#1B3A2D] text-white rounded hover:bg-[#163023] transition-colors disabled:opacity-50"
                >
                  {pending ? "Inscribiendo…" : "Inscribir"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
