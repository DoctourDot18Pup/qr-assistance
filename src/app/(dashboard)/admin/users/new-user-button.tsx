"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createUser } from "./actions";

export function NewUserButton() {
  const [open, setOpen] = useState(false);
  const [role, setRole] = useState("student");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setError("");
    startTransition(async () => {
      const res = await createUser(fd);
      if (!res.ok) { setError(res.message); return; }
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        className="h-8 px-4 text-[13px] font-semibold bg-[#1B3A2D] hover:bg-[#163023] text-white rounded border-0 flex items-center gap-1.5"
      >
        <Plus size={14} /> Nuevo usuario
      </Button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          {/* Overlay */}
          <div
            className="absolute inset-0 bg-black/30"
            onClick={() => setOpen(false)}
          />

          {/* Modal */}
          <div className="relative bg-white border border-[#D8CFB8] rounded-[6px] w-full max-w-lg shadow-none">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#D8CFB8]">
              <span className="text-sm font-semibold text-[#0A0A0A]">
                Nuevo usuario
              </span>
              <button
                onClick={() => setOpen(false)}
                className="text-[#6B6457] hover:text-[#0A0A0A] transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="px-6 py-5">
              <div className="grid grid-cols-2 gap-4">
                {/* Nombre completo — full width */}
                <div className="col-span-2 space-y-1.5">
                  <Label className="text-xs font-semibold text-[#0A0A0A]">
                    Nombre completo
                  </Label>
                  <Input
                    name="name"
                    required
                    placeholder="Ej. Ramón Núñez García"
                    className="h-8 text-[13px] border-[#D8CFB8] rounded focus-visible:ring-[#1B3A2D]"
                  />
                </div>

                {/* Correo */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-[#0A0A0A]">
                    Correo institucional
                  </Label>
                  <Input
                    name="email"
                    type="email"
                    required
                    placeholder="usuario@itcelaya.edu.mx"
                    className="h-8 text-[13px] border-[#D8CFB8] rounded focus-visible:ring-[#1B3A2D]"
                  />
                </div>

                {/* Contraseña */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-[#0A0A0A]">
                    Contraseña temporal
                  </Label>
                  <Input
                    name="password"
                    type="password"
                    required
                    minLength={6}
                    placeholder="Mínimo 6 caracteres"
                    className="h-8 text-[13px] border-[#D8CFB8] rounded focus-visible:ring-[#1B3A2D]"
                  />
                </div>

                {/* Rol */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-[#0A0A0A]">
                    Rol
                  </Label>
                  <select
                    name="role"
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    required
                    className="w-full h-8 px-3 text-[13px] border border-[#D8CFB8] rounded bg-white focus:outline-none focus:ring-1 focus:ring-[#1B3A2D]"
                  >
                    <option value="student">Estudiante</option>
                    <option value="teacher">Docente</option>
                    <option value="admin">Administrador</option>
                  </select>
                </div>

                {/* Matrícula — solo para estudiantes */}
                {role === "student" && (
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-[#0A0A0A]">
                      Matrícula
                    </Label>
                    <Input
                      name="enrollmentNumber"
                      placeholder="Ej. L20030287"
                      className="h-8 text-[13px] border-[#D8CFB8] rounded focus-visible:ring-[#1B3A2D]"
                    />
                  </div>
                )}

                {/* Teléfono */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-[#0A0A0A]">
                    Teléfono <span className="text-[#6B6457] font-normal">(opcional)</span>
                  </Label>
                  <Input
                    name="phone"
                    type="tel"
                    placeholder="461 000 0000"
                    className="h-8 text-[13px] border-[#D8CFB8] rounded focus-visible:ring-[#1B3A2D]"
                  />
                </div>
              </div>

              {error && (
                <p className="mt-3 text-xs text-[#7A1A1A] font-semibold">{error}</p>
              )}

              {/* Footer */}
              <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-[#D8CFB8]">
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
                  {pending ? "Creando…" : "Crear usuario"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
