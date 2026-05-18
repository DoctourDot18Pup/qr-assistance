import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { periods } from "@/lib/db/schema";
import { desc } from "drizzle-orm";
import { Header } from "@/components/shell/header";
import { QrBadge } from "@/components/ui/qr-badge";
import { NewPeriodButton, PeriodRowActions } from "./period-actions-client";

export default async function PeriodsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const allPeriods = await db
    .select()
    .from(periods)
    .orderBy(desc(periods.startDate));

  const active = allPeriods.find(p => p.active);

  return (
    <div className="flex flex-col flex-1">
      <Header
        title="Períodos académicos"
        subtitle={active ? `Período activo: ${active.name}` : "Ningún período activo"}
        actions={<NewPeriodButton />}
      />

      <div className="flex-1 px-4 md:px-7 py-4 md:py-6">
        <div className="bg-white border border-[#D8CFB8] rounded-[6px]">
          {allPeriods.length === 0 ? (
            <div className="py-14 text-center text-[#6B6457] text-sm">
              No hay períodos registrados. Crea el primero.
            </div>
          ) : (
            <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-[#D8CFB8] text-[11px] font-semibold uppercase tracking-wide text-[#6B6457]">
                  <th className="text-left px-[18px] py-3 whitespace-nowrap">Nombre</th>
                  <th className="text-left px-4 py-3 whitespace-nowrap">Inicio</th>
                  <th className="text-left px-4 py-3 whitespace-nowrap">Fin</th>
                  <th className="text-left px-4 py-3 whitespace-nowrap">Estado</th>
                  <th className="px-4 py-3 w-48" />
                </tr>
              </thead>
              <tbody>
                {allPeriods.map((p, i) => (
                  <tr key={p.id} className={i % 2 === 1 ? "bg-[#F5F1EA]" : ""}>
                    <td className="px-[18px] py-3 font-semibold text-[#0A0A0A]">{p.name}</td>
                    <td className="px-4 py-3 tabular text-[#6B6457]">
                      {new Date(p.startDate + "T12:00:00").toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" })}
                    </td>
                    <td className="px-4 py-3 tabular text-[#6B6457]">
                      {new Date(p.endDate + "T12:00:00").toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" })}
                    </td>
                    <td className="px-4 py-3">
                      {p.active
                        ? <QrBadge tone="green">Activo</QrBadge>
                        : <QrBadge tone="gray">Inactivo</QrBadge>}
                    </td>
                    <td className="px-4 py-3">
                      <PeriodRowActions periodId={p.id} isActive={p.active ?? false} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
