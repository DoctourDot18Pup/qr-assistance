"use client";

import { useState, useTransition } from "react";
import { Plus, X, Check, Trash2 } from "lucide-react";
import { Label } from "@/components/ui/label";
import { createPeriod, setActivePeriod, deletePeriod } from "./actions";

export function NewPeriodButton() {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await createPeriod(fd);
      if (!res.ok) { setError(res.message ?? "Error."); return; }
      setOpen(false);
    });
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="h-8 px-4 text-[13px] font-semibold bg-[#1B3A2D] text-white rounded hover:bg-[#163023] transition-colors flex items-center gap-1.5"
      >
        <Plus size={14} /> Nuevo período
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/30" onClick={() => setOpen(false)} />
          <div className="relative bg-white border border-[#D8CFB8] rounded-[6px] w-full max-w-sm">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#D8CFB8]">
              <span className="text-sm font-semibold text-[#0A0A0A]">Nuevo período académico</span>
              <button onClick={() => setOpen(false)} className="text-[#6B6457] hover:text-[#0A0A0A]"><X size={16} /></button>
            </div>
            <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-[#0A0A0A]">Nombre del período</Label>
                <input
                  name="name"
                  required
                  placeholder="Ej. 2026-2"
                  className="w-full h-8 px-3 text-[13px] border border-[#D8CFB8] rounded bg-white focus:outline-none focus:ring-1 focus:ring-[#1B3A2D]"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-[#0A0A0A]">Fecha de inicio</Label>
                  <input
                    name="startDate"
                    type="date"
                    required
                    className="w-full h-8 px-3 text-[13px] border border-[#D8CFB8] rounded bg-white focus:outline-none focus:ring-1 focus:ring-[#1B3A2D]"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-[#0A0A0A]">Fecha de fin</Label>
                  <input
                    name="endDate"
                    type="date"
                    required
                    className="w-full h-8 px-3 text-[13px] border border-[#D8CFB8] rounded bg-white focus:outline-none focus:ring-1 focus:ring-[#1B3A2D]"
                  />
                </div>
              </div>
              {error && <p className="text-xs text-[#7A1A1A] font-semibold">{error}</p>}
              <div className="flex justify-end gap-2 pt-4 border-t border-[#D8CFB8]">
                <button type="button" onClick={() => setOpen(false)}
                  className="h-8 px-4 text-[13px] font-semibold border border-[#1B3A2D] text-[#1B3A2D] rounded hover:bg-[#F5F1EA] transition-colors">
                  Cancelar
                </button>
                <button type="submit" disabled={pending}
                  className="h-8 px-4 text-[13px] font-semibold bg-[#1B3A2D] text-white rounded hover:bg-[#163023] transition-colors disabled:opacity-50">
                  {pending ? "Creando…" : "Crear período"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

export function PeriodRowActions({ periodId, isActive }: { periodId: number; isActive: boolean }) {
  const [activePending, startActive] = useTransition();
  const [deletePending, startDelete] = useTransition();

  return (
    <div className="flex gap-2 justify-end">
      {!isActive && (
        <button
          onClick={() => startActive(async () => { await setActivePeriod(periodId); })}
          disabled={activePending}
          className="h-7 px-3 text-xs font-semibold bg-[#1B3A2D] text-white rounded hover:bg-[#163023] transition-colors flex items-center gap-1 disabled:opacity-50"
        >
          <Check size={11} /> {activePending ? "Activando…" : "Activar"}
        </button>
      )}
      {!isActive && (
        <button
          onClick={() => {
            if (!confirm("¿Eliminar este período? Esta acción no se puede deshacer.")) return;
            startDelete(async () => { await deletePeriod(periodId); });
          }}
          disabled={deletePending}
          className="h-7 px-3 text-xs font-semibold border border-[#D8CFB8] text-[#6B6457] rounded hover:bg-[#F5F1EA] transition-colors flex items-center gap-1 disabled:opacity-50"
        >
          <Trash2 size={11} /> {deletePending ? "…" : "Eliminar"}
        </button>
      )}
      {isActive && (
        <span className="text-xs text-[#2F6A4B] font-semibold">Período activo</span>
      )}
    </div>
  );
}
