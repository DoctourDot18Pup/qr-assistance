import { db } from '@/lib/db';
import { periods, groups } from '@/lib/db/schema';
import { eq, count, ne } from 'drizzle-orm';
import type { NewPeriod } from '@/lib/db/schema';

export async function getAllPeriods() {
  return db.select().from(periods).orderBy(periods.startDate);
}

export async function getPeriodById(id: number) {
  const [period] = await db.select().from(periods).where(eq(periods.id, id)).limit(1);
  return period ?? null;
}

export async function getActivePeriod() {
  const [period] = await db.select().from(periods).where(eq(periods.active, true)).limit(1);
  return period ?? null;
}

export async function createPeriod(data: NewPeriod) {
  if (data.active) {
    await db.update(periods).set({ active: false });
  }
  const [period] = await db.insert(periods).values(data).returning();
  return period;
}

export async function updatePeriod(id: number, data: Partial<NewPeriod>) {
  if (data.active) {
    await db.update(periods).set({ active: false }).where(ne(periods.id, id));
  }
  const [period] = await db.update(periods).set({ ...data, updatedAt: new Date() }).where(eq(periods.id, id)).returning();
  return period ?? null;
}

export async function deletePeriod(id: number) {
  const [groupCount] = await db
    .select({ count: count() })
    .from(groups)
    .where(eq(groups.periodId, id));

  if (Number(groupCount.count) > 0) {
    throw new Error('El período tiene grupos asociados y no puede eliminarse.');
  }

  await db.delete(periods).where(eq(periods.id, id));
}
