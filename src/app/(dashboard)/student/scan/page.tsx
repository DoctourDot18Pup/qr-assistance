import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Header } from "@/components/shell/header";
import { ScanWrapper } from "./scan-wrapper";

export default async function StudentScanPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <div className="flex flex-col flex-1">
      <Header
        title="Escanear QR"
        subtitle="Registra tu asistencia escaneando el código de tu docente"
      />

      <div className="flex-1 px-4 md:px-7 py-4 md:py-6 flex flex-col items-center">
        <div className="bg-white border border-[#D8CFB8] rounded-[6px] w-full max-w-md">
          <div className="px-[18px] py-4 border-b border-[#D8CFB8]">
            <span className="text-sm font-semibold text-[#0A0A0A]">Cámara</span>
          </div>
          <div className="px-6 pb-6">
            <ScanWrapper />
          </div>
        </div>

        <p className="text-xs text-[#6B6457] mt-4 text-center max-w-xs">
          Si la cámara no abre, verifica que el navegador tenga permiso de acceso a cámara.
          En dispositivos móviles se requiere conexión HTTPS.
        </p>
      </div>
    </div>
  );
}
