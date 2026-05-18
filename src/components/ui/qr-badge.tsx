import { cn } from "@/lib/utils";

type Tone = "green" | "gold" | "danger" | "cream" | "gray" | "dark";

const toneClasses: Record<Tone, string> = {
  green:  "bg-[#2F6A4B] text-white border-[#2F6A4B]",
  gold:   "bg-[#B8965A] text-white border-[#B8965A]",
  danger: "bg-[#7A1A1A] text-white border-[#7A1A1A]",
  cream:  "bg-[#E8E0CC] text-[#1B3A2D] border-[#D8CFB8]",
  gray:   "bg-[#E5E1D7] text-[#3D362A] border-[#D8CFB8]",
  dark:   "bg-[#1B3A2D] text-white border-[#1B3A2D]",
};

interface QrBadgeProps {
  tone?: Tone;
  children: React.ReactNode;
  className?: string;
}

export function QrBadge({ tone = "gray", children, className }: QrBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 border px-2 py-0.5 rounded text-[11px] font-semibold tracking-wide whitespace-nowrap tabular",
        toneClasses[tone],
        className
      )}
    >
      {children}
    </span>
  );
}

export function attendanceTone(pct: number): Tone {
  if (pct >= 85) return "green";
  if (pct >= 70) return "gold";
  return "danger";
}
