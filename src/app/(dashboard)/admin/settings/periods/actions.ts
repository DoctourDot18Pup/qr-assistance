"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { periods } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function createPeriod(fd: FormData): Promise<{ ok: boolean; message?: string }> {
  const session = await auth();
  if (!session?.user) return { ok: false, message: "No autenticado." };

  const name      = fd.get("name")?.toString().trim();
  const startDate = fd.get("startDate")?.toString();
  const endDate   = fd.get("endDate")?.toString();

  if (!name || !startDate || !endDate)
    return { ok: false, message: "Todos los campos son requeridos." };
  if (startDate >= endDate)
    return { ok: false, message: "La fecha de inicio debe ser anterior a la de fin." };

  await db.insert(periods).values({ name, startDate, endDate, active: false });
  revalidatePath("/admin/settings/periods");
  return { ok: true };
}

export async function setActivePeriod(periodId: number): Promise<{ ok: boolean; message?: string }> {
  const session = await auth();
  if (!session?.user) return { ok: false, message: "No autenticado." };

  await db.update(periods).set({ active: false });
  await db.update(periods).set({ active: true }).where(eq(periods.id, periodId));

  revalidatePath("/admin/settings/periods");
  return { ok: true };
}

export async function deletePeriod(periodId: number): Promise<{ ok: boolean; message?: string }> {
  const session = await auth();
  if (!session?.user) return { ok: false, message: "No autenticado." };

  const [p] = await db.select({ active: periods.active }).from(periods).where(eq(periods.id, periodId)).limit(1);
  if (p?.active) return { ok: false, message: "No puedes eliminar el período activo." };

  await db.delete(periods).where(eq(periods.id, periodId));
  revalidatePath("/admin/settings/periods");
  return { ok: true };
}
