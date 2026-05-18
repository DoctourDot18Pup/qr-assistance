import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { ilike, or, eq, and, count } from "drizzle-orm";
import Link from "next/link";
import { Header } from "@/components/shell/header";
import { QrBadge } from "@/components/ui/qr-badge";
import { NewUserButton } from "./new-user-button";

const PAGE_SIZE = 25;

type Role = "admin" | "teacher" | "student";

function roleBadge(role: string) {
  if (role === "admin")   return <QrBadge tone="dark">Admin</QrBadge>;
  if (role === "teacher") return <QrBadge tone="cream">Docente</QrBadge>;
  return <QrBadge tone="gold">Estudiante</QrBadge>;
}

function buildWhere(search?: string, role?: string) {
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
  return conditions.length > 0 ? and(...conditions) : undefined;
}

async function getUsers(search: string, role: string, page: number) {
  const where = buildWhere(search || undefined, role);

  const [{ total }] = await db
    .select({ total: count() })
    .from(users)
    .where(where);

  const list = await db
    .select({
      id:               users.id,
      name:             users.name,
      email:            users.email,
      role:             users.role,
      enrollmentNumber: users.enrollmentNumber,
      createdAt:        users.createdAt,
    })
    .from(users)
    .where(where)
    .orderBy(users.createdAt)
    .limit(PAGE_SIZE)
    .offset((page - 1) * PAGE_SIZE);

  return { list, total: Number(total) };
}

function pageLink(search: string, role: string, page: number) {
  const p = new URLSearchParams();
  if (search) p.set("search", search);
  if (role && role !== "all") p.set("role", role);
  if (page > 1) p.set("page", String(page));
  return `/admin/users?${p.toString()}`;
}

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; role?: string; page?: string }>;
}) {
  const params = await searchParams;
  const search = params.search ?? "";
  const role   = params.role   ?? "all";
  const page   = Math.max(1, Number(params.page ?? 1));

  const { list, total } = await getUsers(search, role, page);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const from = (page - 1) * PAGE_SIZE + 1;
  const to   = Math.min(page * PAGE_SIZE, total);

  return (
    <div className="flex flex-col flex-1">
      <Header
        title="Gestión de usuarios"
        subtitle={`${total} usuario${total !== 1 ? "s" : ""} registrado${total !== 1 ? "s" : ""}`}
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
                    <tr key={u.id} className={i % 2 === 1 ? "bg-[#F5F1EA]" : ""}>
                      <td className="px-[18px] py-3 font-semibold text-[#0A0A0A]">{u.name}</td>
                      <td className="px-4 py-3 text-[#6B6457]">{u.email}</td>
                      <td className="px-4 py-3 tabular text-[#6B6457]">{u.enrollmentNumber ?? "—"}</td>
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

          {/* Paginación */}
          <div className="flex items-center justify-between px-[18px] py-3 border-t border-[#D8CFB8]">
            <span className="text-xs text-[#6B6457]">
              {total === 0 ? "Sin resultados" : `Mostrando ${from}–${to} de ${total} usuarios`}
            </span>
            {totalPages > 1 && (
              <div className="flex items-center gap-1">
                {page > 1 && (
                  <Link
                    href={pageLink(search, role, page - 1)}
                    className="h-7 px-3 text-xs font-semibold border border-[#D8CFB8] text-[#6B6457] rounded hover:bg-[#F5F1EA] transition-colors"
                  >
                    ← Anterior
                  </Link>
                )}
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                  .reduce<(number | "…")[]>((acc, p, idx, arr) => {
                    if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push("…");
                    acc.push(p);
                    return acc;
                  }, [])
                  .map((p, i) =>
                    p === "…" ? (
                      <span key={`ellipsis-${i}`} className="px-2 text-xs text-[#6B6457]">…</span>
                    ) : (
                      <Link
                        key={p}
                        href={pageLink(search, role, p as number)}
                        className={[
                          "h-7 min-w-[28px] px-2 text-xs font-semibold rounded transition-colors flex items-center justify-center",
                          p === page
                            ? "bg-[#1B3A2D] text-white"
                            : "border border-[#D8CFB8] text-[#6B6457] hover:bg-[#F5F1EA]",
                        ].join(" ")}
                      >
                        {p}
                      </Link>
                    )
                  )}
                {page < totalPages && (
                  <Link
                    href={pageLink(search, role, page + 1)}
                    className="h-7 px-3 text-xs font-semibold border border-[#D8CFB8] text-[#6B6457] rounded hover:bg-[#F5F1EA] transition-colors"
                  >
                    Siguiente →
                  </Link>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
