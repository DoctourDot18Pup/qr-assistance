"use client";

import { useEffect, useRef, useState } from "react";
import { CheckCircle, AlertCircle, RefreshCw, Loader2 } from "lucide-react";

type ScanState = "scanning" | "loading" | "success" | "error";

export function QrScannerClient() {
  const [state, setState] = useState<ScanState>("scanning");
  const [message, setMessage] = useState("");
  const scannerRef = useRef<{ stop: () => Promise<void>; clear?: () => void } | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    let started = false;

    async function startScanner() {
      const { Html5Qrcode } = await import("html5-qrcode");
      const scanner = new Html5Qrcode("qr-reader-container");
      scannerRef.current = scanner;

      try {
        await scanner.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 260, height: 260 } },
          async (decodedText: string) => {
            if (!mountedRef.current || started) return;
            started = true;
            await scanner.stop().catch(() => {});

            if (!mountedRef.current) return;
            setState("loading");

            try {
              const res = await fetch("/api/attendance/qr", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ qrToken: decodedText }),
                credentials: "include",
              });
              const data = await res.json();
              if (!mountedRef.current) return;
              if (data.success) {
                setState("success");
                setMessage("¡Asistencia registrada correctamente!");
              } else {
                setState("error");
                setMessage(data.message || "No se pudo registrar la asistencia.");
              }
            } catch {
              if (mountedRef.current) {
                setState("error");
                setMessage("Error al conectar con el servidor.");
              }
            }
          },
          () => {}
        );
      } catch {
        if (mountedRef.current) {
          setState("error");
          setMessage("No se pudo acceder a la cámara. Verifica los permisos del navegador.");
        }
      }
    }

    startScanner();

    return () => {
      mountedRef.current = false;
      const s = scannerRef.current;
      if (s) s.stop().catch(() => {}).finally(() => { s.clear?.(); });
    };
  }, []);

  if (state === "success") {
    return (
      <div className="flex flex-col items-center justify-center gap-5 py-16">
        <div className="w-16 h-16 rounded-full bg-[#E8F5EF] flex items-center justify-center">
          <CheckCircle size={36} className="text-[#2F6A4B]" strokeWidth={1.5} />
        </div>
        <div className="text-center">
          <div className="text-base font-semibold text-[#0A0A0A]">{message}</div>
          <div className="text-sm text-[#6B6457] mt-1">Tu asistencia ha sido guardada.</div>
        </div>
        <a
          href="/student"
          className="h-8 px-4 text-[13px] font-semibold bg-[#1B3A2D] text-white rounded hover:bg-[#163023] transition-colors"
        >
          Volver al inicio
        </a>
      </div>
    );
  }

  if (state === "error") {
    return (
      <div className="flex flex-col items-center justify-center gap-5 py-16">
        <div className="w-16 h-16 rounded-full bg-[#FDECEA] flex items-center justify-center">
          <AlertCircle size={36} className="text-[#7A1A1A]" strokeWidth={1.5} />
        </div>
        <div className="text-center">
          <div className="text-base font-semibold text-[#0A0A0A]">No se pudo registrar</div>
          <div className="text-sm text-[#6B6457] mt-1 max-w-xs">{message}</div>
        </div>
        <button
          onClick={() => window.location.reload()}
          className="h-8 px-4 text-[13px] font-semibold border border-[#1B3A2D] text-[#1B3A2D] rounded hover:bg-[#F5F1EA] transition-colors flex items-center gap-1.5"
        >
          <RefreshCw size={13} /> Reintentar
        </button>
      </div>
    );
  }

  if (state === "loading") {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-16">
        <Loader2 size={32} className="text-[#1B3A2D] animate-spin" />
        <div className="text-sm text-[#6B6457]">Registrando asistencia…</div>
      </div>
    );
  }

  // scanning state
  return (
    <div className="flex flex-col items-center gap-5 py-6">
      <div className="p-3 bg-white border-[3px] border-[#B8965A] rounded-lg">
        <div id="qr-reader-container" style={{ width: 300 }} />
      </div>
      <div className="text-center text-sm text-[#6B6457] max-w-xs">
        Apunta la cámara al código QR que proyecta tu docente en clase.
      </div>
    </div>
  );
}
