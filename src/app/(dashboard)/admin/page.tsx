import { db } from "@/lib/db";
import {
  users,
  groups,
  periods,
  classSessions,
  groupSubjects,
  subjects,
  notificationsLog,
} from "@/lib/db/schema";
import { eq, count, and, gte, lt, sql } from "drizzle-orm";
import { Header } from "@/components/shell/header";
import { QrBadge } from "@/components/ui/qr-badge";
import {
  Users,
  LayoutGrid,
  CalendarCheck,
  AlertTriangle,
} from "lucide-react";

// ─── helpers ────────────────────────────────────────────────────────────────

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}
function startOfTomorrow() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatTime(d: Date | null) {
  if (!d) return "—";
  return d.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" });
}

// ─── data ───────────────────────────────────────────────────────────────────

async function getKpis() {
  const today = startOfToday();
  const tomorrow = startOfTomorrow();

  const [totalUsers] = await db.select({ n: count() }).from(users);

  const [activeGroups] = await db
    .select({ n: count() })
    .from(groups)
    .innerJoin(periods, eq(groups.periodId, periods.id))
    .where(eq(periods.active, true));

  const [sessionsToday] = await db
    .select({ n: count() })
    .from(classSessions)
    .where(and(gte(classSessions.date, today), lt(classSessions.date, tomorrow)));

  const [activeSessions] = await db
    .select({ n: count() })
    .from(classSessions)
    .where(
      and(
        gte(classSessions.date, today),
        lt(classSessions.date, tomorrow),
        eq(classSessions.status, "active")
      )
    );

  const [alerts] = await db
    .select({ n: count() })
    .from(notificationsLog)
    .where(eq(notificationsLog.read, false));

  return {
    totalUsers: totalUsers.n,
    activeGroups: activeGroups.n,
    sessionsToday: sessionsToday.n,
    activeSessions: activeSessions.n,
    alerts: alerts.n,
  };
}

async function getTodaySessions() {
  const today = startOfToday();
  const tomorrow = startOfTomorrow();

  return db
    .select({
      id:        classSessions.id,
      date:      classSessions.date,
      status:    classSessions.status,
      groupName: groups.name,
      subject:   subjects.name,
      teacher:   users.name,
    })
    .from(classSessions)
    .innerJoin(groupSubjects, eq(classSessions.groupSubjectId, groupSubjects.id))
    .innerJoin(groups,   eq(groupSubjects.groupId,   groups.id))
    .innerJoin(subjects, eq(groupSubjects.subjectId, subjects.id))
    .innerJoin(users,    eq(groupSubjects.teacherId,  users.id))
    .where(and(gte(classSessions.date, today), lt(classSessions.date, tomorrow)))
    .orderBy(sql`${classSessions.date} desc`)
    .limit(20);
}

// ─── components ─────────────────────────────────────────────────────────────

function KpiCard({
  icon: Icon,
  label,
  value,
  hint,
  hintDanger = false,
}: {
  icon: React.ElementType;
  label: string;
  value: number | string;
  hint: string;
  hintDanger?: boolean;
}) {
  return (
    <div className="bg-white border border-[#D8CFB8] rounded-[6px] p-[18px] flex items-start gap-4">
      <div className="w-9 h-9 rounded bg-[#F5F1EA] flex items-center justify-center shrink-0">
        <Icon size={18} className="text-[#1B3A2D]" strokeWidth={1.75} />
      </div>
      <div className="min-w-0">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-[#6B6457] mb-1">
          {label}
        </div>
        <div className="text-3xl font-semibold text-[#0A0A0A] tabular leading-none">
          {value.toLocaleString("es-MX")}
        </div>
        <div
          className={`text-xs mt-1 ${hintDanger ? "text-[#7A1A1A] font-semibold" : "text-[#6B6457]"}`}
        >
          {hint}
        </div>
      </div>
    </div>
  );
}

function statusBadge(status: string | null) {
  if (status === "active")   return <QrBadge tone="gold">Activa</QrBadge>;
  if (status === "closed")   return <QrBadge tone="gray">Cerrada</QrBadge>;
  return <QrBadge tone="cream">Pendiente</QrBadge>;
}

// ─── page ────────────────────────────────────────────────────────────────────

export default async function AdminHomePage() {
  const [kpis, sessions] = await Promise.all([getKpis(), getTodaySessions()]);

  return (
    <div className="flex flex-col flex-1">
      <Header
        title="Panel de administración"
        subtitle="Vista general del sistema"
      />

      <div className="flex-1 px-4 md:px-7 py-4 md:py-6 space-y-[18px]">
        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-[14px]">
          <KpiCard
            icon={Users}
            label="Usuarios totales"
            value={kpis.totalUsers}
            hint="Docentes, estudiantes y admins"
          />
          <KpiCard
            icon={LayoutGrid}
            label="Grupos activos"
            value={kpis.activeGroups}
            hint="Período vigente"
          />
          <KpiCard
            icon={CalendarCheck}
            label="Sesiones hoy"
            value={kpis.sessionsToday}
            hint={`${kpis.activeSessions} activas · ${Number(kpis.sessionsToday) - Number(kpis.activeSessions)} cerradas`}
          />
          <KpiCard
            icon={AlertTriangle}
            label="Alertas pendientes"
            value={kpis.alerts}
            hint={kpis.alerts > 0 ? "Notificaciones sin leer" : "Sin alertas activas"}
            hintDanger={Number(kpis.alerts) > 0}
          />
        </div>

        {/* Tabla sesiones del día */}
        <div className="bg-white border border-[#D8CFB8] rounded-[6px]">
          <div className="flex items-center justify-between px-[18px] py-4 border-b border-[#D8CFB8]">
            <span className="text-sm font-semibold text-[#0A0A0A]">
              Sesiones del día
            </span>
            <span className="text-xs text-[#6B6457]">
              {new Date().toLocaleDateString("es-MX", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </span>
          </div>

          {sessions.length === 0 ? (
            <div className="py-14 text-center text-[#6B6457] text-sm">
              No hay sesiones programadas para hoy.
            </div>
          ) : (
            <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-[#D8CFB8] text-[11px] font-semibold uppercase tracking-wide text-[#6B6457]">
                  <th className="text-left px-[18px] py-3">Grupo</th>
                  <th className="text-left px-4 py-3">Materia</th>
                  <th className="text-left px-4 py-3">Docente</th>
                  <th className="text-left px-4 py-3">Hora inicio</th>
                  <th className="text-left px-4 py-3">Estado</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((s, i) => (
                  <tr
                    key={s.id}
                    className={i % 2 === 1 ? "bg-[#F5F1EA]" : ""}
                  >
                    <td className="px-[18px] py-3">
                      <QrBadge tone="dark">{s.groupName}</QrBadge>
                    </td>
                    <td className="px-4 py-3 text-[#0A0A0A]">{s.subject}</td>
                    <td className="px-4 py-3 text-[#6B6457]">{s.teacher}</td>
                    <td className="px-4 py-3 tabular text-[#0A0A0A]">
                      {formatTime(s.date)}
                    </td>
                    <td className="px-4 py-3">{statusBadge(s.status)}</td>
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
