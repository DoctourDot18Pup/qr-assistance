import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Header } from "@/components/shell/header";
import { ImportUsersClient } from "./import-client";

export default async function AdminUsersImportPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if ((session.user as { role?: string }).role !== "admin") redirect("/dashboard");

  return (
    <div className="flex flex-col flex-1">
      <Header
        title="Importar usuarios"
        subtitle="Carga masiva de estudiantes y docentes desde un archivo CSV"
        actions={
          <Link
            href="/admin/users"
            className="h-8 px-4 text-[13px] font-semibold border border-[#1B3A2D] text-[#1B3A2D] rounded hover:bg-[#F5F1EA] transition-colors inline-flex items-center"
          >
            ← Volver
          </Link>
        }
      />
      <div className="flex-1 px-4 md:px-7 py-4 md:py-6">
        <ImportUsersClient />
      </div>
    </div>
  );
}
