"use client";

import { ReactNode } from "react";
import { Menu } from "lucide-react";
import { useSidebar } from "./sidebar-context";

interface HeaderProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}

export function Header({ title, subtitle, actions }: HeaderProps) {
  const { toggle } = useSidebar();

  return (
    <header className="flex items-center gap-3 px-4 md:px-7 py-4 bg-white border-b border-[#D8CFB8] shrink-0">
      <button
        onClick={toggle}
        className="md:hidden text-[#6B6457] hover:text-[#0A0A0A] shrink-0"
        aria-label="Abrir menú"
      >
        <Menu size={20} />
      </button>

      <div className="flex-1 min-w-0">
        <h1 className="text-base md:text-lg font-semibold text-[#0A0A0A] leading-tight truncate">
          {title}
        </h1>
        {subtitle && (
          <p className="text-xs text-[#6B6457] mt-0.5 truncate">{subtitle}</p>
        )}
      </div>

      {actions && (
        <div className="flex items-center gap-2 shrink-0">{actions}</div>
      )}
    </header>
  );
}
