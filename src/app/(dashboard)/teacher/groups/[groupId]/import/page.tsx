import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { groups, groupSubjects, subjects } from "@/lib/db/schema";
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
  const gsId = Number(rawId);

  if (!gsId) notFound();

  const [gsRow] = await db
    .select({ groupName: groups.name, subjectName: subjects.name })
    .from(groupSubjects)
    .innerJoin(groups,   eq(groupSubjects.groupId,   groups.id))
    .innerJoin(subjects, eq(groupSubjects.subjectId, subjects.id))
    .where(and(eq(groupSubjects.id, gsId), eq(groupSubjects.teacherId, teacherId)))
    .limit(1);

  if (!gsRow) notFound();

  return (
    <div className="flex flex-col flex-1">
      <Header
        title={`Importar alumnos — ${gsRow.groupName} · ${gsRow.subjectName}`}
        subtitle="Inscribir estudiantes a esta materia desde un archivo CSV"
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
        <ImportGroupStudentsClient groupId={gsId} />
      </div>
    </div>
  );
}
