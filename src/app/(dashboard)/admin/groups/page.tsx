import { db } from "@/lib/db";
import { groups, careers, periods } from "@/lib/db/schema";
import { eq, and, ilike } from "drizzle-orm";
import { Header } from "@/components/shell/header";
import { QrBadge } from "@/components/ui/qr-badge";
import { NewGroupButton } from "./new-group-button";

async function getGroups(search?: string, careerId?: string, periodId?: string) {
  const rows = await db
    .select({
      id:         groups.id,
      name:       groups.name,
      career:     careers.name,
      careerCode: careers.code,
      period:     periods.name,
      periodId:   groups.periodId,
      careerId:   groups.careerId,
    })
    .from(groups)
    .innerJoin(careers, eq(groups.careerId, careers.id))
    .innerJoin(periods, eq(groups.periodId, periods.id))
    .orderBy(groups.name)
    .limit(200);

  return rows.filter((r) => {
    if (search && !r.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (careerId && careerId !== "all" && String(r.careerId) !== careerId) return false;
    if (periodId && periodId !== "all" && String(r.periodId) !== periodId) return false;
    return true;
  });
}

async function getFilters() {
  const [careerList, periodList] = await Promise.all([
    db.select({ id: careers.id, name: careers.name }).from(careers).orderBy(careers.name),
    db.select({ id: periods.id, name: periods.name }).from(periods).orderBy(periods.name),
  ]);
  return { careerList, periodList };
}

export default async function GroupsPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; career?: string; period?: string }>;
}) {
  const params = await searchParams;
  const search   = params.search ?? "";
  const careerId = params.career ?? "all";
  const periodId = params.period ?? "all";

  const [list, { careerList, periodList }] = await Promise.all([
    getGroups(search || undefined, careerId, periodId),
    getFilters(),
  ]);

  return (
    <div className="flex flex-col flex-1">
      <Header
        title="Gestión de grupos"
        subtitle={`${list.length} grupo${list.length !== 1 ? "s" : ""} encontrado${list.length !== 1 ? "s" : ""}`}
        actions={<NewGroupButton careers={careerList} periods={periodList} />}
      />

      <div className="flex-1 px-4 md:px-7 py-4 md:py-6">
        <div className="bg-white border border-[#D8CFB8] rounded-[6px]">
          {/* Filtros */}
          <form method="GET" className="flex flex-wrap items-center gap-3 px-[18px] py-4 border-b border-[#D8CFB8]">
            <input
              name="search"
              defaultValue={search}
              placeholder="Buscar grupo…"
              className="h-8 px-3 text-[13px] border border-[#D8CFB8] rounded bg-white focus:outline-none focus:ring-1 focus:ring-[#1B3A2D] w-48"
            />
            <select
              name="career"
              defaultValue={careerId}
              className="h-8 px-3 text-[13px] border border-[#D8CFB8] rounded bg-white focus:outline-none focus:ring-1 focus:ring-[#1B3A2D]"
            >
              <option value="all">Todas las carreras</option>
              {careerList.map((c) => (
                <option key={c.id} value={String(c.id)}>{c.name}</option>
              ))}
            </select>
            <select
              name="period"
              defaultValue={periodId}
              className="h-8 px-3 text-[13px] border border-[#D8CFB8] rounded bg-white focus:outline-none focus:ring-1 focus:ring-[#1B3A2D]"
            >
              <option value="all">Todos los períodos</option>
              {periodList.map((p) => (
                <option key={p.id} value={String(p.id)}>{p.name}</option>
              ))}
            </select>
            <button
              type="submit"
              className="h-8 px-4 text-[13px] font-semibold bg-[#1B3A2D] text-white rounded hover:bg-[#163023] transition-colors"
            >
              Filtrar
            </button>
          </form>

          {list.length === 0 ? (
            <div className="py-14 text-center text-[#6B6457] text-sm">
              No se encontraron grupos con esos filtros.
            </div>
          ) : (
            <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-[#D8CFB8] text-[11px] font-semibold uppercase tracking-wide text-[#6B6457]">
                  <th className="text-left px-[18px] py-3 whitespace-nowrap">Grupo</th>
                  <th className="text-left px-4 py-3 whitespace-nowrap">Carrera</th>
                  <th className="text-left px-4 py-3 whitespace-nowrap">Período</th>
                </tr>
              </thead>
              <tbody>
                {list.map((g, i) => (
                  <tr key={g.id} className={i % 2 === 1 ? "bg-[#F5F1EA]" : ""}>
                    <td className="px-[18px] py-3">
                      <QrBadge tone="dark">{g.name}</QrBadge>
                    </td>
                    <td className="px-4 py-3 text-[#0A0A0A]">{g.career}</td>
                    <td className="px-4 py-3 text-[#6B6457]">{g.period}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          )}

          <div className="px-[18px] py-3 border-t border-[#D8CFB8] text-xs text-[#6B6457]">
            Mostrando {list.length} grupo{list.length !== 1 ? "s" : ""}
          </div>
        </div>
      </div>
    </div>
  );
}
