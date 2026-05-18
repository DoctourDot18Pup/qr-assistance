import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { notificationsLog, users } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { Header } from "@/components/shell/header";
import { QrBadge } from "@/components/ui/qr-badge";
import { Bell, AlertTriangle, AlertCircle, Info } from "lucide-react";
import { markAllRead } from "./actions";

function notifIcon(type: string) {
  if (type === "critical") return <AlertCircle  size={15} className="text-[#7A1A1A] shrink-0 mt-0.5" />;
  if (type === "risk")     return <AlertTriangle size={15} className="text-[#7A5A00] shrink-0 mt-0.5" />;
  if (type === "warning")  return <AlertTriangle size={15} className="text-[#B8965A] shrink-0 mt-0.5" />;
  return <Info size={15} className="text-[#1B3A2D] shrink-0 mt-0.5" />;
}

function notifBadge(type: string) {
  if (type === "critical") return <QrBadge tone="danger">Crítico</QrBadge>;
  if (type === "risk")     return <QrBadge tone="gold">En riesgo</QrBadge>;
  if (type === "warning")  return <QrBadge tone="gold">Advertencia</QrBadge>;
  return <QrBadge tone="cream">{type}</QrBadge>;
}

export default async function NotificationsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const userId = Number(session.user.id);
  const role   = (session.user as { role?: string }).role ?? "student";
  const isAdmin = role === "admin";

  // Admin ve todas; otros solo las propias
  const notifications = isAdmin
    ? await db
        .select({
          id:        notificationsLog.id,
          userId:    notificationsLog.userId,
          type:      notificationsLog.type,
          message:   notificationsLog.message,
          read:      notificationsLog.read,
          createdAt: notificationsLog.createdAt,
          userName:  users.name,
        })
        .from(notificationsLog)
        .innerJoin(users, eq(notificationsLog.userId, users.id))
        .orderBy(desc(notificationsLog.createdAt))
    : await db
        .select({
          id:        notificationsLog.id,
          userId:    notificationsLog.userId,
          type:      notificationsLog.type,
          message:   notificationsLog.message,
          read:      notificationsLog.read,
          createdAt: notificationsLog.createdAt,
          userName:  users.name,
        })
        .from(notificationsLog)
        .innerJoin(users, eq(notificationsLog.userId, users.id))
        .where(eq(notificationsLog.userId, userId))
        .orderBy(desc(notificationsLog.createdAt));

  const unread = notifications.filter(n => !n.read).length;

  return (
    <div className="flex flex-col flex-1">
      <Header
        title="Notificaciones"
        subtitle={
          isAdmin
            ? `${unread} sin leer en todo el sistema`
            : unread > 0 ? `${unread} sin leer` : "Todo al día"
        }
        actions={
          unread > 0 && !isAdmin ? (
            <form action={markAllRead}>
              <button
                type="submit"
                className="h-8 px-4 text-[13px] font-semibold border border-[#1B3A2D] text-[#1B3A2D] rounded hover:bg-[#F5F1EA] transition-colors"
              >
                Marcar todas como leídas
              </button>
            </form>
          ) : undefined
        }
      />

      <div className="flex-1 px-4 md:px-7 py-4 md:py-6">
        {notifications.length === 0 ? (
          <div className="bg-white border border-[#D8CFB8] rounded-[6px] py-14 text-center">
            <Bell size={28} className="text-[#D8CFB8] mx-auto mb-3" />
            <div className="text-[#6B6457] text-sm">No hay notificaciones.</div>
          </div>
        ) : (
          <div className="bg-white border border-[#D8CFB8] rounded-[6px]">
            {isAdmin && (
              <div className="px-[18px] py-3 border-b border-[#D8CFB8] bg-[#F5F1EA] text-[11.5px] text-[#6B6457] font-semibold">
                Vista de administrador — alertas de todos los usuarios
              </div>
            )}
            <div className="divide-y divide-[#D8CFB8]">
              {notifications.map(n => (
                <div
                  key={n.id}
                  className={`flex items-start gap-3 px-[18px] py-4 ${!n.read ? "bg-[#FDFAF5]" : ""}`}
                >
                  {notifIcon(n.type)}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      {notifBadge(n.type)}
                      {!n.read && (
                        <span className="w-2 h-2 rounded-full bg-[#B8965A] shrink-0" title="No leída" />
                      )}
                      {isAdmin && (
                        <span className="text-[11px] text-[#6B6457] font-semibold">
                          → {n.userName}
                        </span>
                      )}
                    </div>
                    <div className="text-[13px] text-[#0A0A0A]">{n.message}</div>
                    <div className="text-[11px] text-[#6B6457] mt-1">
                      {n.createdAt?.toLocaleString("es-MX", {
                        day: "numeric", month: "long",
                        hour: "2-digit", minute: "2-digit",
                      }) ?? "—"}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
