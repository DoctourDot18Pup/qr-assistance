"use server";

import { db } from "@/lib/db";
import { groupSubjects, groupStudents, classSessions } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";

async function requireAdmin(): Promise<{ ok: false; message: string } | null> {
  const session = await auth();
  const user = session?.user as { role?: string } | undefined;
  if (!session?.user || user?.role !== "admin")
    return { ok: false, message: "No autorizado." };
  return null;
}

export async function assignSubject(
  groupId: number,
  subjectId: number,
  teacherId: number,
): Promise<{ ok: boolean; message?: string }> {
  const err = await requireAdmin();
  if (err) return err;

  try {
    await db.insert(groupSubjects).values({ groupId, subjectId, teacherId });
    revalidatePath(`/admin/groups/${groupId}`);
    return { ok: true };
  } catch {
    return { ok: false, message: "Esta materia ya está asignada a este grupo." };
  }
}

export async function removeSubject(
  gsId: number,
  groupId: number,
): Promise<{ ok: boolean; message?: string }> {
  const err = await requireAdmin();
  if (err) return err;

  const [existing] = await db
    .select({ id: classSessions.id })
    .from(classSessions)
    .where(eq(classSessions.groupSubjectId, gsId))
    .limit(1);

  if (existing)
    return { ok: false, message: "No se puede quitar: ya existen sesiones registradas para esta materia." };

  await db.delete(groupSubjects).where(eq(groupSubjects.id, gsId));
  revalidatePath(`/admin/groups/${groupId}`);
  return { ok: true };
}

export async function enrollStudent(
  groupId: number,
  studentId: number,
): Promise<{ ok: boolean; message?: string }> {
  const err = await requireAdmin();
  if (err) return err;

  try {
    await db.insert(groupStudents).values({ groupId, studentId });
    revalidatePath(`/admin/groups/${groupId}`);
    return { ok: true };
  } catch {
    return { ok: false, message: "El alumno ya está inscrito en este grupo." };
  }
}

export async function removeStudent(
  groupId: number,
  studentId: number,
): Promise<{ ok: boolean; message?: string }> {
  const err = await requireAdmin();
  if (err) return err;

  await db
    .delete(groupStudents)
    .where(and(eq(groupStudents.groupId, groupId), eq(groupStudents.studentId, studentId)));

  revalidatePath(`/admin/groups/${groupId}`);
  return { ok: true };
}
