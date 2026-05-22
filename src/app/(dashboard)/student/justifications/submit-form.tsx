"use client";

import { useState, useTransition, useRef } from "react";
import { Upload, X, FileText } from "lucide-react";
import { submitJustification } from "./actions";
import { useRouter } from "next/navigation";

const MAX_FILE_BYTES = 4 * 1024 * 1024; // 4 MB

interface Session {
  attId: number;
  label: string;
}

export function SubmitJustificationForm({ sessions }: { sessions: Session[] }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  function pickFile(f: File) {
    if (f.size > MAX_FILE_BYTES) {
      setError("El archivo supera el límite de 4 MB. Usa un archivo más pequeño.");
      return;
    }
    setError("");
    setFile(f);
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) pickFile(dropped);
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (file && file.size > MAX_FILE_BYTES) {
      setError("El archivo supera el límite de 4 MB. Usa un archivo más pequeño.");
      return;
    }
    setError("");
    const fd = new FormData(e.currentTarget);
    if (file) fd.set("file", file);
    startTransition(async () => {
      const res = await submitJustification(fd);
      if (!res.ok) { setError(res.message ?? "Error al enviar."); return; }
      formRef.current?.reset();
      setFile(null);
      router.refresh();
    });
  }

  if (sessions.length === 0) {
    return (
      <div className="py-8 text-center text-[#6B6457] text-sm">
        No tienes faltas pendientes de justificar.
      </div>
    );
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="text-[11px] font-semibold uppercase tracking-wide text-[#6B6457] block mb-1.5">
          Sesión ausente
        </label>
        <select
          name="attendanceId"
          required
          className="w-full h-9 px-3 text-[13px] border border-[#D8CFB8] rounded bg-white focus:outline-none focus:ring-1 focus:ring-[#1B3A2D]"
        >
          <option value="">Selecciona una sesión…</option>
          {sessions.map(s => (
            <option key={s.attId} value={s.attId}>{s.label}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="text-[11px] font-semibold uppercase tracking-wide text-[#6B6457] block mb-1.5">
          Motivo
        </label>
        <textarea
          name="description"
          rows={4}
          placeholder="Describe brevemente el motivo de tu inasistencia…"
          className="w-full px-3 py-2 text-[13px] border border-[#D8CFB8] rounded bg-white focus:outline-none focus:ring-1 focus:ring-[#1B3A2D] resize-none"
        />
      </div>

      <div>
        <label className="text-[11px] font-semibold uppercase tracking-wide text-[#6B6457] block mb-1.5">
          Documento adjunto{" "}
          <span className="font-normal normal-case text-[#6B6457]">(opcional)</span>
        </label>
        <div
          onDragOver={e => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-[6px] p-6 text-center cursor-pointer transition-colors ${
            dragging
              ? "border-[#1B3A2D] bg-[#EEE9DF]"
              : "border-[#D8CFB8] hover:border-[#1B3A2D] hover:bg-[#F5F1EA]"
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
            onChange={e => { const f = e.target.files?.[0]; if (f) pickFile(f); }}
            className="hidden"
          />
          {file ? (
            <div className="flex items-center justify-center gap-2">
              <FileText size={16} className="text-[#1B3A2D] shrink-0" />
              <span className="text-[13px] font-semibold text-[#1B3A2D] truncate max-w-[200px]">
                {file.name}
              </span>
              <button
                type="button"
                onClick={e => {
                  e.stopPropagation();
                  setFile(null);
                  if (fileInputRef.current) fileInputRef.current.value = "";
                }}
                className="text-[#6B6457] hover:text-[#0A0A0A] shrink-0"
              >
                <X size={14} />
              </button>
            </div>
          ) : (
            <>
              <Upload size={20} className="text-[#6B6457] mx-auto mb-2" />
              <p className="text-[12px] text-[#6B6457]">
                Arrastra el archivo aquí o{" "}
                <span className="text-[#1B3A2D] font-semibold">seleccionar archivo</span>
              </p>
              <p className="text-[11px] text-[#6B6457] mt-1">PDF, JPG o PNG · máx. 4 MB</p>
            </>
          )}
        </div>
      </div>

      {error && <p className="text-xs text-[#7A1A1A] font-semibold">{error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="w-full h-9 text-[13px] font-semibold bg-[#1B3A2D] text-white rounded hover:bg-[#163023] transition-colors disabled:opacity-50"
      >
        {pending ? "Enviando…" : "Enviar justificante"}
      </button>
    </form>
  );
}
