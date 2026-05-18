"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { subjects } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function createSubject(fd: FormData): Promise<{ ok: boolean; message?: string }> {
  const session = await auth();
  if (!session?.user) return { ok: false, message: "No autenticado." };

  const name          = fd.get("name")?.toString().trim();
  const code          = fd.get("code")?.toString().trim().toUpperCase();
  const totalSessions = Number(fd.get("totalSessions") ?? 0);

  if (!name || !code) return { ok: false, message: "Nombre y clave son requeridos." };

  const [existing] = await db.select({ id: subjects.id }).from(subjects).where(eq(subjects.code, code)).limit(1);
  if (existing) return { ok: false, message: `Ya existe una materia con la clave ${code}.` };

  await db.insert(subjects).values({ name, code, totalSessions });
  revalidatePath("/admin/settings/subjects");
  return { ok: true };
}

export async function updateSubject(id: number, fd: FormData): Promise<{ ok: boolean; message?: string }> {
  const session = await auth();
  if (!session?.user) return { ok: false, message: "No autenticado." };

  const name          = fd.get("name")?.toString().trim();
  const totalSessions = Number(fd.get("totalSessions") ?? 0);

  if (!name) return { ok: false, message: "El nombre es requerido." };

  await db.update(subjects).set({ name, totalSessions }).where(eq(subjects.id, id));
  revalidatePath("/admin/settings/subjects");
  return { ok: true };
}
