import { requireRole } from '@/lib/auth-helpers';
import { db } from '@/lib/db';
import { users, groups, classSessions, attendances } from '@/lib/db/schema';
import { eq, count, and, gte, lte, sql } from 'drizzle-orm';
import { getActivePeriod } from '@/lib/db/queries/periods';
import { getRecentAlerts } from '@/lib/db/queries/notifications';
import { ok, fail } from '@/lib/utils';

export async function GET() {
  try {
    await requireRole(['admin']);

    const [students] = await db.select({ count: count() }).from(users).where(eq(users.role, 'student'));
    const [teachers] = await db.select({ count: count() }).from(users).where(eq(users.role, 'teacher'));
    const [totalGroups] = await db.select({ count: count() }).from(groups);

    const activePeriod = await getActivePeriod();

    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

    const [sessionsToday] = await db
      .select({ count: count() })
      .from(classSessions)
      .where(and(gte(classSessions.date, startOfDay), lte(classSessions.date, endOfDay)));

    const todaySessions = await db
      .select({ id: classSessions.id })
      .from(classSessions)
      .where(and(gte(classSessions.date, startOfDay), lte(classSessions.date, endOfDay)));

    let attendanceRateToday = 0;
    if (todaySessions.length > 0) {
      const sessionIds = todaySessions.map((s) => s.id);
      const [total] = await db.select({ count: count() }).from(attendances)
        .where(sql`${attendances.classSessionId} = ANY(${sessionIds})`);
      const [present] = await db.select({ count: count() }).from(attendances)
        .where(and(sql`${attendances.classSessionId} = ANY(${sessionIds})`, eq(attendances.status, 'present')));
      if (Number(total.count) > 0) {
        attendanceRateToday = Math.round((Number(present.count) / Number(total.count)) * 100);
      }
    }

    const recentAlerts = await getRecentAlerts(5);

    return ok({
      totalStudents: Number(students.count),
      totalTeachers: Number(teachers.count),
      totalGroups: Number(totalGroups.count),
      activePeriod: activePeriod ? { id: activePeriod.id, name: activePeriod.name } : null,
      attendanceRateToday,
      sessionsToday: Number(sessionsToday.count),
      recentAlerts,
    });
  } catch (e) {
    if (e instanceof Response) return e;
    return fail('Error interno del servidor.', 500);
  }
}
