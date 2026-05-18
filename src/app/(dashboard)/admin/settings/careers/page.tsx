import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { careers } from "@/lib/db/schema";
import { asc } from "drizzle-orm";
import { Header } from "@/components/shell/header";
import { QrBadge } from "@/components/ui/qr-badge";
import { NewCareerButton, EditCareerButton, ToggleCareerButton } from "./career-actions-client";

export default async function CareersPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const allCareers = await db
    .select()
    .from(careers)
    .orderBy(asc(careers.code));

  return (
    <div className="flex flex-col flex-1">
      <Header
        title="Carreras"
        subtitle={`${allCareers.length} carrera${allCareers.length !== 1 ? "s" : ""} registrada${allCareers.length !== 1 ? "s" : ""}`}
        actions={<NewCareerButton />}
      />

      <div className="flex-1 px-4 md:px-7 py-4 md:py-6">
        <div className="bg-white border border-[#D8CFB8] rounded-[6px]">
          {allCareers.length === 0 ? (
            <div className="py-14 text-center text-[#6B6457] text-sm">
              No hay carreras registradas. Crea la primera.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="border-b border-[#D8CFB8] text-[11px] font-semibold uppercase tracking-wide text-[#6B6457]">
                    <th className="text-left px-[18px] py-3 whitespace-nowrap">Clave</th>
                    <th className="text-left px-4 py-3 whitespace-nowrap">Nombre</th>
                    <th className="text-left px-4 py-3 whitespace-nowrap">Estado</th>
                    <th className="px-4 py-3 w-40" />
                  </tr>
                </thead>
                <tbody>
                  {allCareers.map((c, i) => (
                    <tr key={c.id} className={i % 2 === 1 ? "bg-[#F5F1EA]" : ""}>
                      <td className="px-[18px] py-3 font-mono text-xs text-[#6B6457] font-semibold">{c.code}</td>
                      <td className="px-4 py-3 font-semibold text-[#0A0A0A]">{c.name}</td>
                      <td className="px-4 py-3">
                        {c.active
                          ? <QrBadge tone="green">Activa</QrBadge>
                          : <QrBadge tone="gray">Inactiva</QrBadge>}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          <EditCareerButton id={c.id} name={c.name} />
                          <ToggleCareerButton id={c.id} active={c.active ?? true} />
                        </div>
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
