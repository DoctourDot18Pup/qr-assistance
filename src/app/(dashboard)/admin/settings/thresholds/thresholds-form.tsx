"use client";

import { useState, useTransition } from "react";
import { AlertTriangle, AlertOctagon, ShieldAlert, RotateCcw } from "lucide-react";
import { saveThresholds } from "./actions";

const DEFAULTS = { warning: 85, critical: 75, risk: 70 };

interface Props {
  initial: { warning: number; critical: number; risk: number };
}

const rows = [
  {
    key: "warning" as const,
    icon: AlertTriangle,
    iconColor: "#B8965A",
    badgeClass: "bg-[#B8965A] text-white",
    label: "Advertencia",
    description: "Notificación informativa al estudiante cuando su asistencia baja de este umbral.",
  },
  {
    key: "critical" as const,
    icon: AlertOctagon,
    iconColor: "#7A1A1A",
    badgeClass: "bg-[#7A1A1A] text-white",
    label: "Crítico",
    description: "Alerta visible para docente y coordinador + correo automático al estudiante.",
  },
  {
    key: "risk" as const,
    icon: ShieldAlert,
    iconColor: "#7A1A1A",
    badgeClass: "bg-[#0A0A0A] text-white",
    label: "Riesgo de reprobación",
    description: "Bloquea acceso a sesiones futuras hasta entregar justificantes pendientes. Notifica al tutor académico.",
  },
];

export function ThresholdsForm({ initial }: Props) {
  const [values, setValues] = useState(initial);
  const [success, setSuccess] = useState("");
  const [error, setError]     = useState("");
  const [pending, startTransition] = useTransition();

  function handleChange(key: keyof typeof values, raw: string) {
    const n = parseInt(raw, 10);
    setValues((v) => ({ ...v, [key]: isNaN(n) ? 0 : n }));
  }

  function handleReset() {
    setValues(DEFAULTS);
    setSuccess("");
    setError("");
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setSuccess("");
    setError("");
    startTransition(async () => {
      const res = await saveThresholds(fd);
      if (res.ok) setSuccess(res.message);
      else setError(res.message);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-[18px]">
      <div className="bg-white border border-[#D8CFB8] rounded-[6px]">
        <div className="px-[18px] py-4 border-b border-[#D8CFB8]">
          <span className="text-sm font-semibold text-[#0A0A0A]">
            Umbrales de alerta de asistencia
          </span>
        </div>

        <div className="divide-y divide-[#D8CFB8]">
          {rows.map(({ key, icon: Icon, iconColor, badgeClass, label, description }) => (
            <div key={key} className="flex items-center gap-4 px-[18px] py-5">
              <div
                className="w-8 h-8 rounded flex items-center justify-center shrink-0"
                style={{ background: `${iconColor}18` }}
              >
                <Icon size={16} style={{ color: iconColor }} strokeWidth={1.75} />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold ${badgeClass}`}
                  >
                    {label}
                  </span>
                </div>
                <p className="text-xs text-[#6B6457] leading-relaxed">{description}</p>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <input
                  type="number"
                  name={key}
                  value={values[key]}
                  onChange={(e) => handleChange(key, e.target.value)}
                  min={0}
                  max={100}
                  required
                  className="w-[72px] h-8 px-2 text-right text-[13px] font-semibold tabular border border-[#D8CFB8] rounded bg-white focus:outline-none focus:ring-1 focus:ring-[#1B3A2D]"
                />
                <span className="text-[13px] font-semibold text-[#6B6457]">%</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Nota legal */}
      <div className="flex gap-2 border border-[#D8CFB8] bg-[#F5F1EA] rounded p-3 text-xs text-[#6B6457]">
        <ShieldAlert size={14} className="shrink-0 mt-0.5 text-[#6B6457]" />
        <span>
          Los cambios se aplican a todos los grupos activos del período en curso.
          Los umbrales históricos de períodos anteriores no se modifican.
        </span>
      </div>

      {success && (
        <p className="text-xs text-[#2F6A4B] font-semibold">{success}</p>
      )}
      {error && (
        <p className="text-xs text-[#7A1A1A] font-semibold">{error}</p>
      )}

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleReset}
          className="h-8 px-4 text-[13px] font-semibold border border-[#1B3A2D] text-[#1B3A2D] rounded hover:bg-[#F5F1EA] transition-colors flex items-center gap-1.5"
        >
          <RotateCcw size={13} /> Restablecer
        </button>
        <button
          type="submit"
          disabled={pending}
          className="h-8 px-4 text-[13px] font-semibold bg-[#1B3A2D] text-white rounded hover:bg-[#163023] transition-colors disabled:opacity-50"
        >
          {pending ? "Guardando…" : "Guardar cambios"}
        </button>
      </div>
    </form>
  );
}
