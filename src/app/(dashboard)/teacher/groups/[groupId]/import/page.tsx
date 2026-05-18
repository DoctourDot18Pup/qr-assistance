import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { groups, groupSubjects } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { Header } from "@/components/shell/header";
import { ImportGroupStudentsClient } from "./import-client";

export default async function TeacherGroupImportPage({
  params,
}: {
  params: Promise<{ groupId: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const teacherId = Number(session.user.id);

  const { groupId: rawId } = await params;
  const groupId = Number(rawId);

  if (!groupId) notFound();

  const [groupRow] = await db
    .select({ name: groups.name })
    .from(groups)
    .innerJoin(groupSubjects, eq(groupSubjects.groupId, groups.id))
    .where(and(eq(groups.id, groupId), eq(groupSubjects.teacherId, teacherId)))
    .limit(1);

  if (!groupRow) notFound();

  return (
    <div className="flex flex-col flex-1">
      <Header
        title={`Importar alumnos — ${groupRow.name}`}
        subtitle="Inscribir estudiantes al grupo desde un archivo CSV"
        actions={
          <Link
            href="/teacher/groups"
            className="h-8 px-4 text-[13px] font-semibold border border-[#1B3A2D] text-[#1B3A2D] rounded hover:bg-[#F5F1EA] transition-colors inline-flex items-center"
          >
            ← Volver
          </Link>
        }
      />
      <div className="flex-1 px-4 md:px-7 py-4 md:py-6">
        <ImportGroupStudentsClient groupId={groupId} />
      </div>
    </div>
  );
}
