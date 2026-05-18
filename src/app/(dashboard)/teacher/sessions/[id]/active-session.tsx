"use client";

import { useState, useEffect, useCallback, useTransition } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw, Check, Clock, X } from "lucide-react";
import { closeSession } from "../actions";
import QRCode from "qrcode";

interface Attendee {
  id: number;
  name: string;
  enrollmentNumber: string | null;
  registeredAt: string | null;
}

interface Props {
  sessionId: number;
  groupName: string;
  subjectName: string;
  startedAt: string;
  initialStatus: string;
}

function getInitials(name: string) {
  return name.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase();
}

function formatHour(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" });
}

export function ActiveSession({ sessionId, groupName, subjectName, startedAt, initialStatus }: Props) {
  const router = useRouter();
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [total, setTotal] = useState(0);
  const [sessionStatus, setSessionStatus] = useState(initialStatus);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [expireLabel, setExpireLabel] = useState("");
  const [elapsed, setElapsed] = useState(0);
  const [closing, startClose] = useTransition();
  const [closeError, setCloseError] = useState("");

  // Cronómetro de duración de sesión
  useEffect(() => {
    const start = new Date(startedAt).getTime();
    const iv = setInterval(() => {
      setElapsed(Math.floor((Date.now() - start) / 60000));
    }, 10000);
    setElapsed(Math.floor((Date.now() - start) / 60000));
    return () => clearInterval(iv);
  }, [startedAt]);

  // Cargar QR token y generar imagen
  const loadQr = useCallback(async () => {
    try {
      const res = await fetch(`/api/sessions/${sessionId}/qr`, { credentials: "include" });
      const data = await res.json();
      const token = data.data?.token;
      if (data.success && token) {
        const dataUrl = await QRCode.toDataURL(token, {
          width: 280,
          margin: 2,
          color: { dark: "#1B3A2D", light: "#FFFFFF" },
        });
        setQrDataUrl(dataUrl);
        const exp = new Date(Date.now() + 5 * 60 * 1000);
        setExpireLabel(exp.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" }));
      }
    } catch { /* silencioso */ }
  }, [sessionId]);

  // Cargar QR al montar y cada 4.5 min
  useEffect(() => {
    if (sessionStatus !== "active") return;
    loadQr();
    const iv = setInterval(loadQr, 4.5 * 60 * 1000);
    return () => clearInterval(iv);
  }, [loadQr, sessionStatus]);

  // Polling de asistentes cada 3 s
  useEffect(() => {
    if (sessionStatus !== "active") return;
    const poll = async () => {
      try {
        const res = await fetch(`/api/sessions/${sessionId}/attendees`, { credentials: "include" });
        const data = await res.json();
        if (data.success) {
          setAttendees(data.present);
          setTotal(data.total);
          if (data.status !== "active") setSessionStatus(data.status);
        }
      } catch { /* silencioso */ }
    };
    poll();
    const iv = setInterval(poll, 3000);
    return () => clearInterval(iv);
  }, [sessionId, sessionStatus]);

  function handleClose() {
    setCloseError("");
    startClose(async () => {
      const res = await closeSession(sessionId);
      if (!res.ok) { setCloseError(res.message ?? "Error al cerrar."); return; }
      router.push("/teacher/sessions");
    });
  }

  const isClosed = sessionStatus === "closed";

  return (
    <div className="flex flex-col md:grid gap-[18px] flex-1 px-4 md:px-7 py-4 md:py-6" style={{ gridTemplateColumns: "1.1fr 1fr" }}>
      {/* ── Panel QR ─────────────────────────────────────────────── */}
      <div className="bg-white border border-[#D8CFB8] rounded-[6px] p-6 flex flex-col">
        <div className="text-[13px] font-semibold text-[#0A0A0A] mb-4">Código QR de asistencia</div>

        <div className="flex-1 flex flex-col items-center justify-center gap-5">
          {isClosed ? (
            <div className="text-center text-[#6B6457] text-sm py-12">
              Sesión cerrada. Los estudiantes ya no pueden registrar asistencia.
            </div>
          ) : (
            <>
              <div className="p-3 bg-white border-[3px] border-[#B8965A] rounded-lg">
                {qrDataUrl
                  ? <img src={qrDataUrl} alt="QR de asistencia" width={280} height={280} />
                  : <div className="w-[280px] h-[280px] flex items-center justify-center text-xs text-[#6B6457]">Generando…</div>
                }
              </div>
              <div className="text-center">
                <div className="text-[13px] font-semibold text-[#0A0A0A]">Válido por 5 minutos</div>
                {expireLabel && (
                  <div className="text-xs text-[#6B6457] mt-1 flex items-center justify-center gap-1.5">
                    <Clock size={11} /> Expira a las {expireLabel}
                  </div>
                )}
              </div>
              <button
                onClick={loadQr}
                className="h-8 px-4 text-[13px] font-semibold border border-[#1B3A2D] text-[#1B3A2D] rounded hover:bg-[#F5F1EA] transition-colors flex items-center gap-1.5"
              >
                <RefreshCw size={13} /> Regenerar QR
              </button>
            </>
          )}
        </div>

        <div className="pt-4 mt-4 border-t border-[#D8CFB8] text-xs text-[#6B6457]">
          Proyecta este código en pantalla para que los estudiantes lo escaneen.
        </div>
      </div>

      {/* ── Panel asistencia en vivo ──────────────────────────────── */}
      <div className="bg-white border border-[#D8CFB8] rounded-[6px] flex flex-col min-h-0">
        <div className="flex items-start justify-between px-[18px] py-4 border-b border-[#D8CFB8]">
          <div>
            <div className="text-[13px] font-semibold text-[#0A0A0A]">Asistencia en vivo</div>
            {!isClosed && (
              <div className="text-[11.5px] text-[#6B6457] mt-0.5">Actualizando cada 3 segundos</div>
            )}
          </div>
          <div className="text-right">
            <div className="text-2xl font-semibold text-[#1B3A2D] tabular leading-none">
              {attendees.length}{" "}
              <span className="text-[#6B6457] text-lg">/ {total}</span>
            </div>
            <div className="text-[11px] text-[#6B6457] mt-1">presentes</div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {attendees.length === 0 ? (
            <div className="py-10 text-center text-[#6B6457] text-sm">
              Esperando escaneos…
            </div>
          ) : (
            attendees.map((a, i) => (
              <div
                key={a.id}
                className={`flex items-center gap-3 px-[18px] py-2.5 border-b border-[#D8CFB8] ${i % 2 === 0 ? "" : "bg-[#F5F1EA]"}`}
              >
                <div className="w-7 h-7 rounded-full bg-[#E8E0CC] border border-[#D8CFB8] flex items-center justify-center text-[10.5px] font-semibold text-[#1B3A2D] shrink-0">
                  {getInitials(a.name)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[12.5px] font-semibold text-[#0A0A0A] truncate">{a.name}</div>
                  <div className="text-[10.5px] text-[#6B6457]">{a.enrollmentNumber ?? "—"}</div>
                </div>
                <div className="text-[11.5px] text-[#6B6457] flex items-center gap-1 tabular shrink-0">
                  <Check size={11} className="text-[#2F6A4B]" />
                  {formatHour(a.registeredAt)}
                </div>
              </div>
            ))
          )}
        </div>

        <div className="flex items-center justify-between gap-2 px-[18px] py-3 border-t border-[#D8CFB8]">
          {closeError && <p className="text-xs text-[#7A1A1A] font-semibold">{closeError}</p>}
          <div className="flex gap-2 ml-auto">
            {!isClosed && (
              <button
                onClick={handleClose}
                disabled={closing}
                className="h-8 px-4 text-[13px] font-semibold bg-[#7A1A1A] text-white rounded hover:bg-[#5a1212] transition-colors flex items-center gap-1.5 disabled:opacity-50"
              >
                <X size={13} /> {closing ? "Cerrando…" : "Cerrar sesión"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
