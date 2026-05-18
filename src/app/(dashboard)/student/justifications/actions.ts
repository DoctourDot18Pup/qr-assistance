"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { attendances, justifications } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function submitJustification(fd: FormData): Promise<{ ok: boolean; message?: string }> {
  const session = await auth();
  if (!session?.user) return { ok: false, message: "No autenticado." };

  const studentId = Number(session.user.id);
  const attendanceId = Number(fd.get("attendanceId"));
  const description = fd.get("description")?.toString().trim() || undefined;
  const file = fd.get("file") as File | null;

  if (!attendanceId || isNaN(attendanceId))
    return { ok: false, message: "Datos inválidos." };

  const [att] = await db
    .select({ id: attendances.id, studentId: attendances.studentId, status: attendances.status })
    .from(attendances)
    .where(eq(attendances.id, attendanceId))
    .limit(1);

  if (!att) return { ok: false, message: "Registro no encontrado." };
  if (att.studentId !== studentId) return { ok: false, message: "Acceso denegado." };
  if (att.status !== "absent") return { ok: false, message: "Solo puedes justificar faltas." };

  const [existing] = await db
    .select({ id: justifications.id })
    .from(justifications)
    .where(eq(justifications.attendanceId, attendanceId))
    .limit(1);

  if (existing) return { ok: false, message: "Ya enviaste un justificante para esta falta." };

  let filePath: string | undefined;
  if (file && file.size > 0 && process.env.BLOB_READ_WRITE_TOKEN) {
    try {
      const { put } = await import("@vercel/blob");
      const blob = await put(`justifications/${Date.now()}-${file.name}`, file, { access: "private" });
      filePath = blob.url;
    } catch (e) {
      console.error("Blob upload error:", e);
      return { ok: false, message: "No se pudo subir el archivo. Intenta sin adjunto o contacta al administrador." };
    }
  }

  await db.insert(justifications).values({ attendanceId, description, filePath });
  revalidatePath("/student/justifications");
  return { ok: true };
}
