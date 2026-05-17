import { db } from '@/lib/db';
import { subjects, groupSubjects } from '@/lib/db/schema';
import { eq, count } from 'drizzle-orm';
import type { NewSubject } from '@/lib/db/schema';

export async function getAllSubjects() {
  return db.select().from(subjects).orderBy(subjects.name);
}

export async function getSubjectById(id: number) {
  const [subject] = await db.select().from(subjects).where(eq(subjects.id, id)).limit(1);
  return subject ?? null;
}

export async function createSubject(data: NewSubject) {
  const [subject] = await db.insert(subjects).values(data).returning();
  return subject;
}

export async function updateSubject(id: number, data: Partial<NewSubject>) {
  const [subject] = await db.update(subjects).set({ ...data, updatedAt: new Date() }).where(eq(subjects.id, id)).returning();
  return subject ?? null;
}

export async function deleteSubject(id: number) {
  const [gsCount] = await db
    .select({ count: count() })
    .from(groupSubjects)
    .where(eq(groupSubjects.subjectId, id));

  if (Number(gsCount.count) > 0) {
    throw new Error('La materia está asignada a grupos y no puede eliminarse.');
  }

  await db.delete(subjects).where(eq(subjects.id, id));
}
