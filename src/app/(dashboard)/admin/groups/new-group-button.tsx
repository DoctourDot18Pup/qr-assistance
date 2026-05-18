"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createGroup } from "./actions";

interface Props {
  careers: { id: number; name: string }[];
  periods: { id: number; name: string }[];
}

export function NewGroupButton({ careers, periods }: Props) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setError("");
    startTransition(async () => {
      const res = await createGroup(fd);
      if (!res.ok) { setError(res.message); return; }
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="h-8 px-4 text-[13px] font-semibold bg-[#1B3A2D] text-white rounded hover:bg-[#163023] transition-colors flex items-center gap-1.5"
      >
        <Plus size={14} /> Nuevo grupo
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/30" onClick={() => setOpen(false)} />
          <div className="relative bg-white border border-[#D8CFB8] rounded-[6px] w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#D8CFB8]">
              <span className="text-sm font-semibold text-[#0A0A0A]">Nuevo grupo</span>
              <button onClick={() => setOpen(false)} className="text-[#6B6457] hover:text-[#0A0A0A]">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-[#0A0A0A]">Nombre del grupo</Label>
                <Input
                  name="name"
                  required
                  placeholder="Ej. ISC-5A"
                  className="h-8 text-[13px] border-[#D8CFB8] rounded focus-visible:ring-[#1B3A2D]"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-[#0A0A0A]">Carrera</Label>
                <select
                  name="careerId"
                  required
                  className="w-full h-8 px-3 text-[13px] border border-[#D8CFB8] rounded bg-white focus:outline-none focus:ring-1 focus:ring-[#1B3A2D]"
                >
                  <option value="">Seleccionar carrera…</option>
                  {careers.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-[#0A0A0A]">Período</Label>
                <select
                  name="periodId"
                  required
                  className="w-full h-8 px-3 text-[13px] border border-[#D8CFB8] rounded bg-white focus:outline-none focus:ring-1 focus:ring-[#1B3A2D]"
                >
                  <option value="">Seleccionar período…</option>
                  {periods.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
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
                  {pending ? "Creando…" : "Crear grupo"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
