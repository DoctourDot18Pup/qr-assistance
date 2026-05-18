"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { careers } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function createCareer(fd: FormData): Promise<{ ok: boolean; message?: string }> {
  const session = await auth();
  if (!session?.user) return { ok: false, message: "No autenticado." };

  const name = fd.get("name")?.toString().trim();
  const code = fd.get("code")?.toString().trim().toUpperCase();

  if (!name || !code) return { ok: false, message: "Nombre y clave son requeridos." };

  const [existing] = await db.select({ id: careers.id }).from(careers).where(eq(careers.code, code)).limit(1);
  if (existing) return { ok: false, message: `Ya existe una carrera con la clave ${code}.` };

  await db.insert(careers).values({ name, code, active: true });
  revalidatePath("/admin/settings/careers");
  return { ok: true };
}

export async function updateCareer(id: number, fd: FormData): Promise<{ ok: boolean; message?: string }> {
  const session = await auth();
  if (!session?.user) return { ok: false, message: "No autenticado." };

  const name = fd.get("name")?.toString().trim();
  if (!name) return { ok: false, message: "El nombre es requerido." };

  await db.update(careers).set({ name }).where(eq(careers.id, id));
  revalidatePath("/admin/settings/careers");
  return { ok: true };
}

export async function toggleCareerActive(id: number, active: boolean): Promise<{ ok: boolean; message?: string }> {
  const session = await auth();
  if (!session?.user) return { ok: false, message: "No autenticado." };

  await db.update(careers).set({ active }).where(eq(careers.id, id));
  revalidatePath("/admin/settings/careers");
  return { ok: true };
}
