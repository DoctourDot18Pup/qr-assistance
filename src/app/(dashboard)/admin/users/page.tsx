import { Suspense } from "react";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { ilike, or, eq, and } from "drizzle-orm";
import Link from "next/link";
import { Header } from "@/components/shell/header";
import { QrBadge } from "@/components/ui/qr-badge";
import { NewUserButton } from "./new-user-button";

// ─── types ───────────────────────────────────────────────────────────────────

type Role = "admin" | "teacher" | "student";

// ─── helpers ─────────────────────────────────────────────────────────────────

function roleBadge(role: string) {
  if (role === "admin")   return <QrBadge tone="dark">Admin</QrBadge>;
  if (role === "teacher") return <QrBadge tone="cream">Docente</QrBadge>;
  return <QrBadge tone="gold">Estudiante</QrBadge>;
}

// ─── data ────────────────────────────────────────────────────────────────────

async function getUsers(search?: string, role?: string) {
  const conditions = [];

  if (search) {
    conditions.push(
      or(
        ilike(users.name, `%${search}%`),
        ilike(users.email, `%${search}%`),
        ilike(users.enrollmentNumber, `%${search}%`)
      )
    );
  }

  if (role && role !== "all") {
    conditions.push(eq(users.role, role));
  }

  return db
    .select({
      id:               users.id,
      name:             users.name,
      email:            users.email,
      role:             users.role,
      enrollmentNumber: users.enrollmentNumber,
      createdAt:        users.createdAt,
    })
    .from(users)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(users.createdAt)
    .limit(100);
}

// ─── page ────────────────────────────────────────────────────────────────────

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; role?: string }>;
}) {
  const params = await searchParams;
  const search = params.search ?? "";
  const role = params.role ?? "all";

  const list = await getUsers(search || undefined, role);

  return (
    <div className="flex flex-col flex-1">
      <Header
        title="Gestión de usuarios"
        subtitle={`${list.length} usuario${list.length !== 1 ? "s" : ""} encontrado${list.length !== 1 ? "s" : ""}`}
        actions={
          <>
            <Link
              href="/admin/users/import"
              className="h-8 px-4 text-[13px] font-semibold border border-[#1B3A2D] text-[#1B3A2D] rounded hover:bg-[#F5F1EA] transition-colors inline-flex items-center"
            >
              Importar CSV
            </Link>
            <NewUserButton />
          </>
        }
      />

      <div className="flex-1 px-4 md:px-7 py-4 md:py-6">
        <div className="bg-white border border-[#D8CFB8] rounded-[6px]">
          {/* Filtros */}
          <form method="GET" className="flex flex-wrap items-center gap-3 px-[18px] py-4 border-b border-[#D8CFB8]">
            <div className="relative flex-1 max-w-xs">
              <input
                name="search"
                defaultValue={search}
                placeholder="Buscar por nombre, correo o matrícula…"
                className="w-full h-8 pl-3 pr-3 text-[13px] border border-[#D8CFB8] rounded bg-white focus:outline-none focus:ring-1 focus:ring-[#1B3A2D]"
              />
            </div>
            <select
              name="role"
              defaultValue={role}
              className="h-8 px-3 text-[13px] border border-[#D8CFB8] rounded bg-white focus:outline-none focus:ring-1 focus:ring-[#1B3A2D]"
            >
              <option value="all">Todos los roles</option>
              <option value="admin">Administrador</option>
              <option value="teacher">Docente</option>
              <option value="student">Estudiante</option>
            </select>
            <button
              type="submit"
              className="h-8 px-4 text-[13px] font-semibold bg-[#1B3A2D] text-white rounded hover:bg-[#163023] transition-colors"
            >
              Filtrar
            </button>
          </form>

          {/* Tabla */}
          {list.length === 0 ? (
            <div className="py-14 text-center text-[#6B6457] text-sm">
              No se encontraron usuarios con esos filtros.
            </div>
          ) : (
            <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-[#D8CFB8] text-[11px] font-semibold uppercase tracking-wide text-[#6B6457]">
                  <th className="text-left px-[18px] py-3 whitespace-nowrap">Nombre</th>
                  <th className="text-left px-4 py-3 whitespace-nowrap">Correo</th>
                  <th className="text-left px-4 py-3 whitespace-nowrap">Matrícula</th>
                  <th className="text-left px-4 py-3 whitespace-nowrap">Rol</th>
                  <th className="text-left px-4 py-3 whitespace-nowrap">Alta</th>
                </tr>
              </thead>
              <tbody>
                {list.map((u, i) => (
                  <tr
                    key={u.id}
                    className={i % 2 === 1 ? "bg-[#F5F1EA]" : ""}
                  >
                    <td className="px-[18px] py-3 font-semibold text-[#0A0A0A]">
                      {u.name}
                    </td>
                    <td className="px-4 py-3 text-[#6B6457]">{u.email}</td>
                    <td className="px-4 py-3 tabular text-[#6B6457]">
                      {u.enrollmentNumber ?? "—"}
                    </td>
                    <td className="px-4 py-3">{roleBadge(u.role)}</td>
                    <td className="px-4 py-3 tabular text-[#6B6457] text-xs">
                      {u.createdAt?.toLocaleDateString("es-MX") ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          )}

          <div className="px-[18px] py-3 border-t border-[#D8CFB8] text-xs text-[#6B6457]">
            Mostrando {list.length} de {list.length} usuarios
          </div>
        </div>
      </div>
    </div>
  );
}
