"use server";

import { db } from "@/lib/db";
import { justifications, attendances } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function resolveJustification(id: number, action: "approved" | "rejected") {
  const session = await auth();
  if (!session?.user) return { ok: false, message: "No autenticado." };

  const [j] = await db
    .select({ id: justifications.id, attendanceId: justifications.attendanceId, status: justifications.status })
    .from(justifications)
    .where(eq(justifications.id, id))
    .limit(1);

  if (!j) return { ok: false, message: "Justificante no encontrado." };
  if (j.status !== "pending") return { ok: false, message: "El justificante ya fue resuelto." };

  await db
    .update(justifications)
    .set({
      status: action,
      reviewedBy: Number(session.user.id),
      reviewedAt: new Date(),
    })
    .where(eq(justifications.id, id));

  // Si se aprueba, actualizar asistencia a "justified"
  if (action === "approved") {
    await db
      .update(attendances)
      .set({ status: "justified" })
      .where(eq(attendances.id, j.attendanceId));
  }

  revalidatePath("/teacher/justifications");
  return { ok: true };
}
