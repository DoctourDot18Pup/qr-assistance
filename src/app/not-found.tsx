import Link from "next/link";
import { Home, AlertTriangle } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#E8E0CC] flex items-center justify-center px-4">
      <div className="bg-white border border-[#D8CFB8] rounded-[6px] w-full max-w-md p-10 text-center">
        <div className="w-14 h-14 rounded-full bg-[#F5F1EA] flex items-center justify-center mx-auto mb-5">
          <AlertTriangle size={26} className="text-[#B8965A]" strokeWidth={1.5} />
        </div>

        <div className="text-5xl font-semibold text-[#1B3A2D] tabular mb-2">404</div>
        <div className="text-base font-semibold text-[#0A0A0A] mb-1">Página no encontrada</div>
        <div className="text-sm text-[#6B6457] mb-8">
          La página que buscas no existe o no tienes acceso a ella.
        </div>

        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 h-9 px-5 text-[13px] font-semibold bg-[#1B3A2D] text-white rounded hover:bg-[#163023] transition-colors"
        >
          <Home size={14} /> Volver al inicio
        </Link>

        <div className="mt-8 pt-6 border-t border-[#D8CFB8]">
          <div className="text-[11px] font-semibold text-[#6B6457] uppercase tracking-wide">QR Assistance</div>
          <div className="text-[11px] text-[#6B6457]">TecNM Campus Celaya</div>
        </div>
      </div>
    </div>
  );
}
