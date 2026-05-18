"use client";

import { useState, useTransition, useRef } from "react";
import { FileText, ChevronDown, ChevronUp, X } from "lucide-react";
import { submitJustification } from "./actions";

interface Props {
  attendanceId: number;
}

export function SubmitJustificationForm({ attendanceId }: Props) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [pending, startTransition] = useTransition();
  const [preview, setPreview] = useState<{ name: string; url: string | null } | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) { setPreview(null); return; }
    const isImage = file.type.startsWith("image/");
    setPreview({
      name: file.name,
      url: isImage ? URL.createObjectURL(file) : null,
    });
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await submitJustification(fd);
      if (!res.ok) { setError(res.message ?? "Error al enviar."); return; }
      setSuccess(true);
      setOpen(false);
      setPreview(null);
      formRef.current?.reset();
    });
  }

  if (success) {
    return <span className="text-xs text-[#2F6A4B] font-semibold">Justificante enviado ✓</span>;
  }

  return (
    <div>
      <button
        onClick={() => setOpen(o => !o)}
        className="h-7 px-3 text-xs font-semibold border border-[#1B3A2D] text-[#1B3A2D] rounded hover:bg-[#F5F1EA] transition-colors flex items-center gap-1"
      >
        <FileText size={11} /> Justificar
        {open ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
      </button>

      {open && (
        <form
          ref={formRef}
          onSubmit={handleSubmit}
          className="mt-3 p-3 bg-[#F5F1EA] border border-[#D8CFB8] rounded space-y-2"
        >
          <input type="hidden" name="attendanceId" value={attendanceId} />

          <div>
            <label className="text-[11px] font-semibold text-[#0A0A0A] block mb-1">Motivo</label>
            <textarea
              name="description"
              rows={2}
              placeholder="Describe brevemente el motivo de tu inasistencia…"
              className="w-full px-2 py-1.5 text-xs border border-[#D8CFB8] rounded bg-white focus:outline-none focus:ring-1 focus:ring-[#1B3A2D] resize-none"
            />
          </div>

          <div>
            <label className="text-[11px] font-semibold text-[#0A0A0A] block mb-1">
              Documento adjunto <span className="text-[#6B6457] font-normal">(opcional)</span>
            </label>
            <input
              name="file"
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={handleFileChange}
              className="text-xs text-[#6B6457] file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-[#1B3A2D] file:text-white hover:file:bg-[#163023]"
            />
            {preview && (
              <div className="mt-2 flex items-start gap-2 p-2 bg-white border border-[#D8CFB8] rounded">
                {preview.url ? (
                  <img src={preview.url} alt="Vista previa" className="w-16 h-16 object-cover rounded border border-[#D8CFB8]" />
                ) : (
                  <div className="w-16 h-16 flex items-center justify-center bg-[#F5F1EA] rounded border border-[#D8CFB8]">
                    <FileText size={24} className="text-[#6B6457]" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-semibold text-[#0A0A0A] truncate">{preview.name}</p>
                  <p className="text-[10px] text-[#6B6457] mt-0.5">Listo para enviar</p>
                </div>
                <button
                  type="button"
                  onClick={() => { setPreview(null); if (formRef.current) { const input = formRef.current.querySelector<HTMLInputElement>('input[type="file"]'); if (input) input.value = ""; } }}
                  className="text-[#6B6457] hover:text-[#0A0A0A]"
                >
                  <X size={13} />
                </button>
              </div>
            )}
          </div>

          {error && <p className="text-xs text-[#7A1A1A] font-semibold">{error}</p>}

          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              disabled={pending}
              className="h-7 px-3 text-xs font-semibold bg-[#1B3A2D] text-white rounded hover:bg-[#163023] transition-colors disabled:opacity-50"
            >
              {pending ? "Enviando…" : "Enviar justificante"}
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="h-7 px-3 text-xs font-semibold border border-[#D8CFB8] text-[#6B6457] rounded hover:bg-white transition-colors"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
