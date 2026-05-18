import { ReactNode } from "react";

interface HeaderProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}

export function Header({ title, subtitle, actions }: HeaderProps) {
  return (
    <header className="flex items-center justify-between px-7 py-4 bg-white border-b border-[#D8CFB8] shrink-0">
      <div>
        <h1 className="text-lg font-semibold text-[#0A0A0A] leading-tight">{title}</h1>
        {subtitle && (
          <p className="text-xs text-[#6B6457] mt-0.5">{subtitle}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </header>
  );
}
