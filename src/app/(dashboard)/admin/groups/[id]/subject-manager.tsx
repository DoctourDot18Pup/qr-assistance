"use client";

import { useState, useTransition } from "react";
import { Plus, X } from "lucide-react";
import { assignSubject, removeSubject, enrollStudent, removeStudent } from "./actions";

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

interface EnrolledStudent {
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
  assigned:          AssignedSubject[];
  availableSubjects: AvailableSubject[];
  teachers:          Teacher[];
  enrolled:          EnrolledStudent[];
  availableStudents: AvailableStudent[];
}

// ── Botón quitar materia ──────────────────────────────────────────────────────
function RemoveSubjectBtn({ gsId, groupId }: { gsId: number; groupId: number }) {
  const [confirm, setConfirm] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");

  function handleConfirm() {
    setError("");
    startTransition(async () => {
      const res = await removeSubject(gsId, groupId);
      if (!res.ok) { setError(res.message ?? "Error."); setConfirm(false); }
    });
  }

  if (confirm) {
    return (
      <div className="flex items-center gap-1.5">
        <button onClick={handleConfirm} disabled={pending}
          className="h-6 px-2.5 text-[11px] font-semibold bg-[#7A1A1A] text-white rounded hover:bg-[#6b1717] transition-colors disabled:opacity-50">
          {pending ? "…" : "Confirmar"}
        </button>
        <button onClick={() => { setConfirm(false); setError(""); }} disabled={pending}
          className="h-6 px-2 text-[11px] text-[#6B6457] hover:text-[#0A0A0A] disabled:opacity-50">
          Cancelar
        </button>
        {error && <p className="text-[10px] text-[#7A1A1A]">{error}</p>}
      </div>
    );
  }

  return (
    <button onClick={() => setConfirm(true)}
      className="h-6 px-2.5 text-[11px] font-semibold border border-[#7A1A1A] text-[#7A1A1A] rounded hover:bg-[#FEF2F2] transition-colors">
      Quitar
    </button>
  );
}

// ── Fila de alumno en modal ───────────────────────────────────────────────────
function EnrolledRow({
  groupId, student, onRemoved,
}: {
  groupId: number;
  student: EnrolledStudent;
  onRemoved: (id: number) => void;
}) {
  const [confirm, setConfirm] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleRemove() {
    startTransition(async () => {
      const res = await removeStudent(groupId, student.studentId);
      if (res.ok) onRemoved(student.studentId);
      else setConfirm(false);
    });
  }

  return (
    <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#F0EBE0] last:border-0">
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="w-6 h-6 rounded-full bg-[#E8E0CC] border border-[#D8CFB8] flex items-center justify-center text-[9px] font-semibold text-[#1B3A2D] shrink-0">
          {student.name.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase()}
        </div>
        <span className="text-[13px] font-semibold text-[#0A0A0A] truncate">{student.name}</span>
        <span className="text-[11px] text-[#6B6457] shrink-0">{student.enrollmentNumber ?? "—"}</span>
      </div>
      {confirm ? (
        <div className="flex items-center gap-1 shrink-0 ml-2">
          <button onClick={handleRemove} disabled={pending}
            className="h-6 px-2 text-[10px] font-semibold bg-[#7A1A1A] text-white rounded disabled:opacity-50">
            {pending ? "…" : "Quitar"}
          </button>
          <button onClick={() => setConfirm(false)} disabled={pending}
            className="h-6 px-2 text-[10px] text-[#6B6457] hover:text-[#0A0A0A]">
            No
          </button>
        </div>
      ) : (
        <button onClick={() => setConfirm(true)}
          className="shrink-0 ml-2 h-6 px-2 text-[10px] font-semibold border border-[#7A1A1A] text-[#7A1A1A] rounded hover:bg-[#FEF2F2] transition-colors">
          Quitar
        </button>
      )}
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────
export function SubjectManager({
  groupId, assigned, availableSubjects, teachers, enrolled, availableStudents,
}: Props) {
  // Estado: modal de materias
  const [openSubject, setOpenSubject] = useState(false);
  const [subjectId, setSubjectId] = useState("");
  const [teacherId, setTeacherId] = useState("");
  const [subjectError, setSubjectError] = useState("");
  const [subjectPending, startSubjectTransition] = useTransition();

  // Estado: modal de alumnos
  const [openStudents, setOpenStudents] = useState(false);
  const [enrolledList, setEnrolledList] = useState<EnrolledStudent[]>(enrolled);
  const [removeSearch, setRemoveSearch] = useState("");
  const [addSearch, setAddSearch] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [addError, setAddError] = useState("");
  const [addPending, startAddTransition] = useTransition();

  const unassignedSubjects = availableSubjects.filter(
    s => !assigned.some(a => a.subjectCode === s.code)
  );
  const enrolledIds = new Set(enrolledList.map(e => e.studentId));
  const available = availableStudents.filter(s => !enrolledIds.has(s.id));

  const filteredEnrolled = enrolledList.filter(s => {
    const q = removeSearch.toLowerCase();
    return s.name.toLowerCase().includes(q) || (s.enrollmentNumber ?? "").includes(q);
  });
  const filteredAvailable = available.filter(s => {
    const q = addSearch.toLowerCase();
    return s.name.toLowerCase().includes(q) || (s.enrollmentNumber ?? "").includes(q);
  });

  function handleSubjectSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!subjectId || !teacherId) { setSubjectError("Selecciona materia y docente."); return; }
    setSubjectError("");
    startSubjectTransition(async () => {
      const res = await assignSubject(groupId, Number(subjectId), Number(teacherId));
      if (!res.ok) { setSubjectError(res.message ?? "Error."); return; }
      setOpenSubject(false);
      setSubjectId("");
      setTeacherId("");
    });
  }

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedId) { setAddError("Selecciona un alumno."); return; }
    setAddError("");
    startAddTransition(async () => {
      const res = await enrollStudent(groupId, Number(selectedId));
      if (!res.ok) { setAddError(res.message ?? "Error."); return; }
      const newStudent = availableStudents.find(s => s.id === Number(selectedId))!;
      setEnrolledList(prev => [...prev, { studentId: newStudent.id, name: newStudent.name, enrollmentNumber: newStudent.enrollmentNumber }]
        .sort((a, b) => a.name.localeCompare(b.name)));
      setSelectedId("");
      setAddSearch("");
    });
  }

  function handleRemoved(studentId: number) {
    setEnrolledList(prev => prev.filter(s => s.studentId !== studentId));
  }

  return (
    <div className="bg-white border border-[#D8CFB8] rounded-[6px]">
      {/* Encabezado */}
      <div className="flex items-center justify-between px-[18px] py-4 border-b border-[#D8CFB8] flex-wrap gap-2">
        <span className="text-sm font-semibold text-[#0A0A0A]">Materias asignadas</span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setOpenStudents(true)}
            className="h-7 px-3 text-[12px] font-semibold border border-[#1B3A2D] text-[#1B3A2D] rounded hover:bg-[#F5F1EA] transition-colors"
          >
            Gestionar alumnos ({enrolledList.length})
          </button>
          <button
            onClick={() => setOpenSubject(true)}
            disabled={unassignedSubjects.length === 0}
            className="h-7 px-3 text-[12px] font-semibold bg-[#1B3A2D] text-white rounded hover:bg-[#163023] transition-colors flex items-center gap-1.5 disabled:opacity-40"
          >
            <Plus size={12} /> Asignar materia
          </button>
        </div>
      </div>

      {/* Tabla de materias */}
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
                    <RemoveSubjectBtn gsId={a.gsId} groupId={groupId} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Modal: asignar materia ─────────────────────────────────────────── */}
      {openSubject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/30" onClick={() => setOpenSubject(false)} />
          <div className="relative bg-white border border-[#D8CFB8] rounded-[6px] w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#D8CFB8]">
              <span className="text-sm font-semibold text-[#0A0A0A]">Asignar materia</span>
              <button onClick={() => setOpenSubject(false)} className="text-[#6B6457] hover:text-[#0A0A0A]">
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleSubjectSubmit} className="px-6 py-5 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#0A0A0A]">Materia</label>
                <select value={subjectId} onChange={e => setSubjectId(e.target.value)} required
                  className="w-full h-8 px-3 text-[13px] border border-[#D8CFB8] rounded bg-white focus:outline-none focus:ring-1 focus:ring-[#1B3A2D]">
                  <option value="">Seleccionar materia…</option>
                  {unassignedSubjects.map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#0A0A0A]">Docente</label>
                <select value={teacherId} onChange={e => setTeacherId(e.target.value)} required
                  className="w-full h-8 px-3 text-[13px] border border-[#D8CFB8] rounded bg-white focus:outline-none focus:ring-1 focus:ring-[#1B3A2D]">
                  <option value="">Seleccionar docente…</option>
                  {teachers.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
              {subjectError && <p className="text-xs text-[#7A1A1A] font-semibold">{subjectError}</p>}
              <div className="flex justify-end gap-2 pt-4 border-t border-[#D8CFB8]">
                <button type="button" onClick={() => setOpenSubject(false)}
                  className="h-8 px-4 text-[13px] font-semibold border border-[#1B3A2D] text-[#1B3A2D] rounded hover:bg-[#F5F1EA] transition-colors">
                  Cancelar
                </button>
                <button type="submit" disabled={subjectPending}
                  className="h-8 px-4 text-[13px] font-semibold bg-[#1B3A2D] text-white rounded hover:bg-[#163023] transition-colors disabled:opacity-50">
                  {subjectPending ? "Asignando…" : "Asignar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal: gestionar alumnos ───────────────────────────────────────── */}
      {openStudents && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/30" onClick={() => setOpenStudents(false)} />
          <div className="relative bg-white border border-[#D8CFB8] rounded-[6px] w-full max-w-lg flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#D8CFB8] shrink-0">
              <span className="text-sm font-semibold text-[#0A0A0A]">
                Alumnos del grupo
                <span className="ml-2 text-[#6B6457] font-normal text-xs">({enrolledList.length} inscritos)</span>
              </span>
              <button onClick={() => setOpenStudents(false)} className="text-[#6B6457] hover:text-[#0A0A0A]">
                <X size={16} />
              </button>
            </div>

            <div className="overflow-y-auto flex-1">
              {/* Inscritos */}
              <div className="px-6 pt-4 pb-2">
                <div className="text-xs font-semibold text-[#6B6457] uppercase tracking-wide mb-2">Inscritos</div>
                <input
                  value={removeSearch}
                  onChange={e => setRemoveSearch(e.target.value)}
                  placeholder="Buscar inscrito…"
                  className="w-full h-8 px-3 text-[13px] border border-[#D8CFB8] rounded bg-white focus:outline-none focus:ring-1 focus:ring-[#1B3A2D] mb-2"
                />
              </div>
              <div className="border-y border-[#D8CFB8] mx-6 rounded mb-4 max-h-48 overflow-y-auto">
                {enrolledList.length === 0 ? (
                  <div className="py-6 text-center text-xs text-[#6B6457]">Sin alumnos inscritos.</div>
                ) : filteredEnrolled.length === 0 ? (
                  <div className="py-4 text-center text-xs text-[#6B6457]">Sin resultados.</div>
                ) : (
                  filteredEnrolled.map(s => (
                    <EnrolledRow key={s.studentId} groupId={groupId} student={s} onRemoved={handleRemoved} />
                  ))
                )}
              </div>

              {/* Agregar alumno */}
              <form onSubmit={handleAdd} className="px-6 pb-6 space-y-3">
                <div className="text-xs font-semibold text-[#6B6457] uppercase tracking-wide">Agregar alumno</div>
                <input
                  value={addSearch}
                  onChange={e => { setAddSearch(e.target.value); setSelectedId(""); }}
                  placeholder="Buscar por nombre o matrícula…"
                  className="w-full h-8 px-3 text-[13px] border border-[#D8CFB8] rounded bg-white focus:outline-none focus:ring-1 focus:ring-[#1B3A2D]"
                />
                <div className="border border-[#D8CFB8] rounded max-h-40 overflow-y-auto">
                  {available.length === 0 ? (
                    <div className="py-4 text-center text-xs text-[#6B6457]">Todos los alumnos ya están inscritos.</div>
                  ) : filteredAvailable.length === 0 ? (
                    <div className="py-4 text-center text-xs text-[#6B6457]">Sin resultados.</div>
                  ) : (
                    filteredAvailable.map(s => (
                      <label key={s.id}
                        className={[
                          "flex items-center gap-3 px-4 py-2 cursor-pointer hover:bg-[#F5F1EA] transition-colors",
                          String(s.id) === selectedId ? "bg-[#F5F1EA]" : "",
                        ].join(" ")}
                      >
                        <input type="radio" name="addStudent" value={s.id}
                          checked={String(s.id) === selectedId}
                          onChange={() => setSelectedId(String(s.id))}
                          className="accent-[#1B3A2D]"
                        />
                        <span className="text-[13px] text-[#0A0A0A] flex-1">{s.name}</span>
                        <span className="text-[11px] text-[#6B6457]">{s.enrollmentNumber ?? "—"}</span>
                      </label>
                    ))
                  )}
                </div>
                {addError && <p className="text-xs text-[#7A1A1A] font-semibold">{addError}</p>}
                <div className="flex justify-end">
                  <button type="submit" disabled={addPending || !selectedId}
                    className="h-8 px-4 text-[13px] font-semibold bg-[#1B3A2D] text-white rounded hover:bg-[#163023] transition-colors disabled:opacity-50">
                    {addPending ? "Inscribiendo…" : "Inscribir"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
