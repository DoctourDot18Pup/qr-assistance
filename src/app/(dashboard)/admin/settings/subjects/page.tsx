import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { subjects } from "@/lib/db/schema";
import { asc } from "drizzle-orm";
import { Header } from "@/components/shell/header";
import { NewSubjectButton, EditSubjectButton } from "./subject-actions-client";

export default async function SubjectsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const allSubjects = await db
    .select()
    .from(subjects)
    .orderBy(asc(subjects.code));

  return (
    <div className="flex flex-col flex-1">
      <Header
        title="Materias"
        subtitle={`${allSubjects.length} materia${allSubjects.length !== 1 ? "s" : ""} registrada${allSubjects.length !== 1 ? "s" : ""}`}
        actions={<NewSubjectButton />}
      />

      <div className="flex-1 px-4 md:px-7 py-4 md:py-6">
        <div className="bg-white border border-[#D8CFB8] rounded-[6px]">
          {allSubjects.length === 0 ? (
            <div className="py-14 text-center text-[#6B6457] text-sm">
              No hay materias registradas. Crea la primera.
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
