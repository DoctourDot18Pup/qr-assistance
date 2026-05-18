import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { subjects } from "@/lib/db/schema";
import { asc, ilike, or } from "drizzle-orm";
import { Header } from "@/components/shell/header";
import { NewSubjectButton, EditSubjectButton } from "./subject-actions-client";

export default async function SubjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const params = await searchParams;
  const q = params.q?.trim() ?? "";

  const allSubjects = await db
    .select()
    .from(subjects)
    .where(
      q
        ? or(
            ilike(subjects.name, `%${q}%`),
            ilike(subjects.code, `%${q}%`),
          )
        : undefined
    )
    .orderBy(asc(subjects.code));

  return (
    <div className="flex flex-col flex-1">
      <Header
        title="Materias"
        subtitle={`${allSubjects.length} materia${allSubjects.length !== 1 ? "s" : ""} registrada${allSubjects.length !== 1 ? "s" : ""}`}
        actions={<NewSubjectButton />}
      />

      <div className="flex-1 px-4 md:px-7 py-4 md:py-6">
        {/* Filtro de búsqueda */}
        <form method="GET" className="flex gap-2 mb-4">
          <input
            name="q"
            defaultValue={q}
            placeholder="Buscar por nombre o clave…"
            className="h-8 px-3 text-[13px] border border-[#D8CFB8] rounded bg-white focus:outline-none focus:ring-1 focus:ring-[#1B3A2D] w-full max-w-xs"
          />
          <button
            type="submit"
            className="h-8 px-4 text-[13px] font-semibold bg-[#1B3A2D] text-white rounded hover:bg-[#163023] transition-colors"
          >
            Buscar
          </button>
          {q && (
            <a
              href="/admin/settings/subjects"
              className="h-8 px-4 text-[13px] font-semibold border border-[#D8CFB8] text-[#6B6457] rounded hover:bg-[#F5F1EA] transition-colors flex items-center"
            >
              Limpiar
            </a>
          )}
        </form>

        <div className="bg-white border border-[#D8CFB8] rounded-[6px]">
          {allSubjects.length === 0 ? (
            <div className="py-14 text-center text-[#6B6457] text-sm">
              {q ? `Sin resultados para "${q}".` : "No hay materias registradas. Crea la primera."}
            </div>
          ) : (
            <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-[#D8CFB8] text-[11px] font-semibold uppercase tracking-wide text-[#6B6457]">
                  <th className="text-left px-[18px] py-3 whitespace-nowrap">Clave</th>
                  <th className="text-left px-4 py-3 whitespace-nowrap">Nombre</th>
                  <th className="text-right px-4 py-3 whitespace-nowrap">Sesiones / período</th>
                  <th className="px-4 py-3 w-28" />
                </tr>
              </thead>
              <tbody>
                {allSubjects.map((s, i) => (
                  <tr key={s.id} className={i % 2 === 1 ? "bg-[#F5F1EA]" : ""}>
                    <td className="px-[18px] py-3 font-mono text-xs text-[#6B6457] font-semibold">{s.code}</td>
                    <td className="px-4 py-3 font-semibold text-[#0A0A0A]">{s.name}</td>
                    <td className="px-4 py-3 tabular text-right text-[#6B6457]">
                      {s.totalSessions > 0 ? s.totalSessions : "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <EditSubjectButton
                        id={s.id}
                        name={s.name}
                        totalSessions={s.totalSessions ?? 0}
                      />
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
