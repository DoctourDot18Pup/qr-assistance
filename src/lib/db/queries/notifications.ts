import { db } from '@/lib/db';
import { notificationsLog } from '@/lib/db/schema';
import { eq, desc, and } from 'drizzle-orm';

export async function getNotificationsForUser(userId: number, unreadOnly = false) {
  const conditions = [eq(notificationsLog.userId, userId)];
  if (unreadOnly) conditions.push(eq(notificationsLog.read, false));
  return db
    .select()
    .from(notificationsLog)
    .where(and(...conditions))
    .orderBy(desc(notificationsLog.createdAt));
}

export async function getUnreadCount(userId: number) {
  const { count } = await import('drizzle-orm');
  const [row] = await db
    .select({ count: count() })
    .from(notificationsLog)
    .where(and(eq(notificationsLog.userId, userId), eq(notificationsLog.read, false)));
  return Number(row.count);
}

export async function markNotificationRead(id: number, userId: number) {
  await db
    .update(notificationsLog)
    .set({ read: true })
    .where(and(eq(notificationsLog.id, id), eq(notificationsLog.userId, userId)));
}

export async function markAllNotificationsRead(userId: number) {
  await db
    .update(notificationsLog)
    .set({ read: true })
    .where(eq(notificationsLog.userId, userId));
}

export async function getRecentAlerts(limit = 5) {
  return db
    .select()
    .from(notificationsLog)
    .orderBy(desc(notificationsLog.createdAt))
    .limit(limit);
}

export async function insertNotification(data: {
  userId: number;
  type: string;
  message: string;
}) {
  const [n] = await db.insert(notificationsLog).values(data).returning();
  return n;
}
