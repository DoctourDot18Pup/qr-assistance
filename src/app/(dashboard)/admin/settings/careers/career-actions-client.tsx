"use client";

import { useState, useTransition } from "react";
import { Plus, X, Pencil, PowerOff, Power } from "lucide-react";
import { Label } from "@/components/ui/label";
import { createCareer, updateCareer, toggleCareerActive } from "./actions";

export function NewCareerButton() {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await createCareer(fd);
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
        <Plus size={14} /> Nueva carrera
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/30" onClick={() => setOpen(false)} />
          <div className="relative bg-white border border-[#D8CFB8] rounded-[6px] w-full max-w-sm">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#D8CFB8]">
              <span className="text-sm font-semibold text-[#0A0A0A]">Nueva carrera</span>
              <button onClick={() => setOpen(false)} className="text-[#6B6457] hover:text-[#0A0A0A]"><X size={16} /></button>
            </div>
            <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-[#0A0A0A]">Nombre de la carrera</Label>
                <input
                  name="name"
                  required
                  placeholder="Ej. Ingeniería en Sistemas Computacionales"
                  className="w-full h-8 px-3 text-[13px] border border-[#D8CFB8] rounded bg-white focus:outline-none focus:ring-1 focus:ring-[#1B3A2D]"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-[#0A0A0A]">Clave</Label>
                <input
                  name="code"
                  required
                  placeholder="Ej. ISC"
                  className="w-full h-8 px-3 text-[13px] border border-[#D8CFB8] rounded bg-white focus:outline-none focus:ring-1 focus:ring-[#1B3A2D] uppercase"
                />
              </div>
              {error && <p className="text-xs text-[#7A1A1A] font-semibold">{error}</p>}
              <div className="flex justify-end gap-2 pt-4 border-t border-[#D8CFB8]">
                <button type="button" onClick={() => setOpen(false)}
                  className="h-8 px-4 text-[13px] font-semibold border border-[#1B3A2D] text-[#1B3A2D] rounded hover:bg-[#F5F1EA] transition-colors">
                  Cancelar
                </button>
                <button type="submit" disabled={pending}
                  className="h-8 px-4 text-[13px] font-semibold bg-[#1B3A2D] text-white rounded hover:bg-[#163023] transition-colors disabled:opacity-50">
                  {pending ? "Guardando…" : "Crear carrera"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

export function EditCareerButton({ id, name }: { id: number; name: string }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await updateCareer(id, fd);
      if (!res.ok) { setError(res.message ?? "Error."); return; }
      setOpen(false);
    });
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="h-7 px-3 text-xs font-semibold border border-[#D8CFB8] text-[#6B6457] rounded hover:bg-[#F5F1EA] transition-colors flex items-center gap-1"
      >
        <Pencil size={11} /> Editar
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/30" onClick={() => setOpen(false)} />
          <div className="relative bg-white border border-[#D8CFB8] rounded-[6px] w-full max-w-sm">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#D8CFB8]">
              <span className="text-sm font-semibold text-[#0A0A0A]">Editar carrera</span>
              <button onClick={() => setOpen(false)} className="text-[#6B6457] hover:text-[#0A0A0A]"><X size={16} /></button>
            </div>
            <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-[#0A0A0A]">Nombre</Label>
                <input
                  name="name"
                  required
                  defaultValue={name}
                  className="w-full h-8 px-3 text-[13px] border border-[#D8CFB8] rounded bg-white focus:outline-none focus:ring-1 focus:ring-[#1B3A2D]"
                />
              </div>
              {error && <p className="text-xs text-[#7A1A1A] font-semibold">{error}</p>}
              <div className="flex justify-end gap-2 pt-4 border-t border-[#D8CFB8]">
                <button type="button" onClick={() => setOpen(false)}
                  className="h-8 px-4 text-[13px] font-semibold border border-[#1B3A2D] text-[#1B3A2D] rounded hover:bg-[#F5F1EA] transition-colors">
                  Cancelar
                </button>
                <button type="submit" disabled={pending}
                  className="h-8 px-4 text-[13px] font-semibold bg-[#1B3A2D] text-white rounded hover:bg-[#163023] transition-colors disabled:opacity-50">
                  {pending ? "Guardando…" : "Guardar cambios"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

export function ToggleCareerButton({ id, active }: { id: number; active: boolean }) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      disabled={pending}
      onClick={() => startTransition(async () => { await toggleCareerActive(id, !active); })}
      title={active ? "Desactivar" : "Activar"}
      className="h-7 px-3 text-xs font-semibold border border-[#D8CFB8] text-[#6B6457] rounded hover:bg-[#F5F1EA] transition-colors flex items-center gap-1 disabled:opacity-50"
    >
      {active ? <PowerOff size={11} /> : <Power size={11} />}
      {active ? "Desactivar" : "Activar"}
    </button>
  );
}
