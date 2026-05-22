"use client";

import { useState, useTransition } from "react";
import { User, Check } from "lucide-react";
import { markManualAttendance } from "../actions";

export function ManualMarkButton({
  sessionId,
  studentId,
  studentName,
}: {
  sessionId: number;
  studentId: number;
  studentName: string;
}) {
  const [pending, startTransition] = useTransition();
  const [done, setDone] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [error, setError] = useState("");

  function handleFirst() {
    setConfirm(true);
  }

  function handleConfirm() {
    setError("");
    startTransition(async () => {
      const res = await markManualAttendance(sessionId, studentId);
      if (!res.ok) {
        setError(res.message ?? "Error al registrar.");
        setConfirm(false);
        return;
      }
      setDone(true);
    });
  }

  if (done) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-[#2F6A4B] font-semibold">
        <Check size={11} /> Registrado
      </span>
    );
  }

  if (confirm) {
    return (
      <div className="flex items-center gap-1.5">
        <button
          onClick={handleConfirm}
          disabled={pending}
          className="h-6 px-2.5 text-[11px] font-semibold bg-[#1B3A2D] text-white rounded hover:bg-[#163023] transition-colors inline-flex items-center gap-1 disabled:opacity-50"
        >
          <User size={10} /> {pending ? "…" : "Confirmar"}
        </button>
        <button
          onClick={() => setConfirm(false)}
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
      onClick={handleFirst}
      title={`Marcar a ${studentName} como presente manualmente`}
      className="h-6 px-2.5 text-[11px] font-semibold border border-[#1B3A2D] text-[#1B3A2D] rounded hover:bg-[#F5F1EA] transition-colors inline-flex items-center gap-1"
    >
      <User size={10} /> Marcar presente
    </button>
  );
}
