"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, X } from "lucide-react";
import { Label } from "@/components/ui/label";
import { createSession } from "./actions";

interface Props {
  groups: { gsId: number; groupName: string; subjectName: string }[];
  defaultGsId?: number;
}

export function NewSessionButton({ groups, defaultGsId }: Props) {
  const [open, setOpen] = useState(!!defaultGsId);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setError("");
    startTransition(async () => {
      const res = await createSession(fd);
      if (!res.ok) { setError(res.message ?? "Error al crear la sesión."); return; }
      setOpen(false);
      router.push(`/teacher/sessions/${res.sessionId}`);
    });
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="h-8 px-4 text-[13px] font-semibold bg-[#1B3A2D] text-white rounded hover:bg-[#163023] transition-colors flex items-center gap-1.5"
      >
        <Plus size={14} /> Nueva sesión
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/30" onClick={() => setOpen(false)} />
          <div className="relative bg-white border border-[#D8CFB8] rounded-[6px] w-full max-w-sm">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#D8CFB8]">
              <span className="text-sm font-semibold text-[#0A0A0A]">Nueva sesión</span>
              <button onClick={() => setOpen(false)} className="text-[#6B6457] hover:text-[#0A0A0A]">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-[#0A0A0A]">Grupo y materia</Label>
                <select
                  name="gsId"
                  required
                  defaultValue={defaultGsId ?? ""}
                  className="w-full h-8 px-3 text-[13px] border border-[#D8CFB8] rounded bg-white focus:outline-none focus:ring-1 focus:ring-[#1B3A2D]"
                >
                  <option value="">Seleccionar…</option>
                  {groups.map((g) => (
                    <option key={g.gsId} value={g.gsId}>
                      {g.groupName} · {g.subjectName}
                    </option>
                  ))}
                </select>
              </div>

              {error && <p className="text-xs text-[#7A1A1A] font-semibold">{error}</p>}

              <div className="flex justify-end gap-2 pt-4 border-t border-[#D8CFB8]">
                <button type="button" onClick={() => setOpen(false)}
                  className="h-8 px-4 text-[13px] font-semibold border border-[#1B3A2D] text-[#1B3A2D] rounded hover:bg-[#F5F1EA] transition-colors">
                  Cancelar
                </button>
                <button type="submit" disabled={pending}
                  className="h-8 px-4 text-[13px] font-semibold bg-[#1B3A2D] text-white rounded hover:bg-[#163023] transition-colors disabled:opacity-50">
                  {pending ? "Abriendo…" : "Abrir sesión"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
