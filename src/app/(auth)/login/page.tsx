"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import Image from "next/image";
import { Mail, Lock, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const res = await signIn("credentials", {
      redirect: false,
      email,
      password,
    });

    setLoading(false);

    if (!res?.ok) {
      setError("Correo o contraseña incorrectos.");
      return;
    }

    // /dashboard lee el rol server-side y redirige al panel correcto
    router.replace("/dashboard");
  }

  return (
    <main className="min-h-screen bg-[#E8E0CC] flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-[380px]">
        {/* Tarjeta */}
        <div className="bg-white border border-[#D8CFB8] rounded-[6px] px-8 pt-8 pb-7">
          {/* Logo + título */}
          <div className="flex flex-col items-center mb-6">
            <Image
              src="/logo_lince.png"
              alt="Linces TecNM Celaya"
              width={96}
              height={96}
              priority
            />
            <h1 className="text-lg font-semibold mt-4 tracking-tight text-[#0A0A0A]">
              QR Assistance
            </h1>
            <p className="text-xs text-[#6B6457] mt-1 text-center">
              Sistema de control de asistencia · TecNM Celaya
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Correo */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-[#0A0A0A]">
                Correo institucional
              </Label>
              <div className="relative">
                <Mail
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6B6457] pointer-events-none"
                />
                <Input
                  type="email"
                  placeholder="usuario@itcelaya.edu.mx"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="pl-9 h-9 text-[13px] border-[#D8CFB8] rounded focus-visible:ring-[#1B3A2D]"
                />
              </div>
            </div>

            {/* Contraseña */}
            <div className="space-y-1.5">
              <div className="flex items-baseline justify-between">
                <Label className="text-xs font-semibold text-[#0A0A0A]">
                  Contraseña
                </Label>
                <button
                  type="button"
                  className="text-[11px] text-[#1B3A2D] hover:underline"
                >
                  ¿Olvidaste tu contraseña?
                </button>
              </div>
              <div className="relative">
                <Lock
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6B6457] pointer-events-none"
                />
                <Input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="pl-9 h-9 text-[13px] border-[#D8CFB8] rounded focus-visible:ring-[#1B3A2D]"
                />
              </div>
            </div>

            {/* Error */}
            {error && (
              <p className="text-xs text-[#7A1A1A] font-semibold">{error}</p>
            )}

            {/* Botón */}
            <Button
              type="submit"
              disabled={loading}
              className="w-full h-9 text-[13px] font-semibold bg-[#1B3A2D] hover:bg-[#163023] text-white rounded border-0 mt-2"
            >
              {loading ? "Iniciando sesión…" : "Iniciar sesión"}
            </Button>

            {/* Aviso informativo */}
            <div className="flex gap-2 border border-[#D8CFB8] bg-[#F5F1EA] rounded p-3 text-[11.5px] text-[#6B6457]">
              <Info size={14} className="shrink-0 mt-0.5" />
              <span>
                El acceso es exclusivo con credenciales asignadas por la coordinación académica.
              </span>
            </div>
          </form>
        </div>

        {/* Footer */}
        <p className="text-center text-[11px] text-[#6B6457] mt-5">
          © 2026 Instituto Tecnológico de Celaya · TecNM
        </p>
      </div>
    </main>
  );
}
