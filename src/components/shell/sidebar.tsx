"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { signOut, useSession } from "next-auth/react";
import {
  Home,
  Users,
  BookOpen,
  Calendar,
  LayoutGrid,
  AlertTriangle,
  BarChart2,
  Bell,
  QrCode,
  FileText,
  LogOut,
  X,
  GraduationCap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSidebar } from "./sidebar-context";

type NavItem = {
  href: string;
  label: string;
  icon: React.ElementType;
  badge?: number;
};

const adminNav: NavItem[] = [
  { href: "/admin",                       label: "Inicio",              icon: Home },
  { href: "/admin/users",                 label: "Usuarios",            icon: Users },
  { href: "/admin/groups",               label: "Grupos",              icon: LayoutGrid },
  { href: "/admin/settings/careers",     label: "Carreras",            icon: GraduationCap },
  { href: "/admin/settings/periods",     label: "Períodos",            icon: Calendar },
  { href: "/admin/settings/subjects",    label: "Materias",            icon: BookOpen },
  { href: "/admin/settings/thresholds",  label: "Umbrales de alerta",  icon: AlertTriangle },
  { href: "/reports",                     label: "Reportes",            icon: BarChart2 },
  { href: "/notifications",              label: "Notificaciones",      icon: Bell },
];

const teacherNav: NavItem[] = [
  { href: "/teacher",                     label: "Inicio",              icon: Home },
  { href: "/teacher/groups",             label: "Mis grupos",          icon: LayoutGrid },
  { href: "/teacher/sessions",           label: "Sesiones",            icon: Calendar },
  { href: "/teacher/justifications",     label: "Justificantes",       icon: FileText },
  { href: "/teacher/reports",            label: "Reportes",            icon: BarChart2 },
  { href: "/notifications",              label: "Notificaciones",      icon: Bell },
];

const studentNav: NavItem[] = [
  { href: "/student",                    label: "Inicio",              icon: Home },
  { href: "/student/subjects",           label: "Mis materias",        icon: BookOpen },
  { href: "/student/scan",              label: "Escanear QR",         icon: QrCode },
  { href: "/student/justifications",    label: "Justificantes",       icon: FileText },
  { href: "/notifications",             label: "Notificaciones",      icon: Bell },
];

const roleLabel: Record<string, string> = {
  admin:   "ADMINISTRADOR",
  teacher: "DOCENTE",
  student: "ESTUDIANTE",
};

function getInitials(name?: string | null) {
  if (!name) return "U";
  return name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function Sidebar() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const { open, close } = useSidebar();

  // Cerrar el drawer al navegar
  useEffect(() => {
    close();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  const role = (session?.user as { role?: string } | undefined)?.role ?? "student";

  const nav =
    role === "admin"   ? adminNav   :
    role === "teacher" ? teacherNav :
    studentNav;

  const isActive = (href: string) =>
    href === "/admin" || href === "/teacher" || href === "/student"
      ? pathname === href
      : pathname.startsWith(href);

  return (
    <>
      {/* Overlay móvil */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
          onClick={close}
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-[236px] flex flex-col bg-[#1B3A2D] text-white",
          "transition-transform duration-200",
          "md:static md:translate-x-0 md:min-h-screen md:shrink-0",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Botón cerrar — solo móvil */}
        <button
          onClick={close}
          className="absolute top-4 right-4 md:hidden text-white/60 hover:text-white"
          aria-label="Cerrar menú"
        >
          <X size={18} />
        </button>

        {/* Logo + título */}
        <div className="flex items-center gap-3 px-5 py-5 border-b border-white/10">
          <Image
            src="/logo_lince.png"
            alt="Linces TecNM Celaya"
            width={40}
            height={40}
            className="rounded"
          />
          <div>
            <div className="text-sm font-semibold leading-tight">QR Assistance</div>
            <div className="text-[10px] text-white/60 uppercase tracking-wide mt-0.5">
              {roleLabel[role]}
            </div>
          </div>
        </div>

        {/* Navegación */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {nav.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded text-[13px] font-semibold transition-colors",
                  active
                    ? "bg-[#B8965A] text-white"
                    : "text-white/78 hover:bg-white/10 hover:text-white"
                )}
              >
                <item.icon size={16} strokeWidth={1.75} />
                <span className="flex-1">{item.label}</span>
                {item.badge ? (
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-[#B8965A] text-white text-[10px] font-semibold tabular">
                    {item.badge}
                  </span>
                ) : null}
              </Link>
            );
          })}
        </nav>

        {/* Footer de usuario */}
        <div className="px-4 py-4 border-t border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-[#B8965A] flex items-center justify-center text-white text-xs font-semibold shrink-0">
              {getInitials(session?.user?.name)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[12px] font-semibold truncate">
                {session?.user?.name ?? "Usuario"}
              </div>
              <div className="text-[11px] text-white/55 truncate">
                {session?.user?.email}
              </div>
            </div>
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="text-white/55 hover:text-white transition-colors shrink-0"
              title="Cerrar sesión"
            >
              <LogOut size={15} />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
