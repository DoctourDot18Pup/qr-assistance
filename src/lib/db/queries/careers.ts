import { db } from '@/lib/db';
import { careers, groups } from '@/lib/db/schema';
import { eq, count } from 'drizzle-orm';
import type { NewCareer } from '@/lib/db/schema';

export async function getAllCareers() {
  return db.select().from(careers).orderBy(careers.name);
}

export async function getCareerById(id: number) {
  const [career] = await db.select().from(careers).where(eq(careers.id, id)).limit(1);
  return career ?? null;
}

export async function createCareer(data: NewCareer) {
  const [career] = await db.insert(careers).values(data).returning();
  return career;
}

export async function updateCareer(id: number, data: Partial<NewCareer>) {
  const [career] = await db.update(careers).set({ ...data, updatedAt: new Date() }).where(eq(careers.id, id)).returning();
  return career ?? null;
}

export async function deleteCareer(id: number) {
  const [groupCount] = await db
    .select({ count: count() })
    .from(groups)
    .where(eq(groups.careerId, id));

  if (Number(groupCount.count) > 0) {
    throw new Error('La carrera tiene grupos asociados y no puede eliminarse.');
  }

  await db.delete(careers).where(eq(careers.id, id));
}
