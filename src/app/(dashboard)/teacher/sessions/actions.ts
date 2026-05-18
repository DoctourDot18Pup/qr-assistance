"use server";

import { db } from "@/lib/db";
import { classSessions, groupSubjects, groupStudents, attendances } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { checkAttendanceAlerts } from "@/lib/alerts";

export async function createSession(fd: FormData) {
  const session = await auth();
  if (!session?.user) return { ok: false, message: "No autenticado." };

  const gsId = Number(fd.get("gsId"));
  if (!gsId) return { ok: false, message: "Selecciona un grupo y materia." };

  // Verificar que el docente owns este group-subject
  const teacherId = Number(session.user.id);
  const [gs] = await db
    .select()
    .from(groupSubjects)
    .where(and(eq(groupSubjects.id, gsId), eq(groupSubjects.teacherId, teacherId)))
    .limit(1);

  if (!gs) return { ok: false, message: "Grupo no encontrado." };

  const [newSession] = await db
    .insert(classSessions)
    .values({
      groupSubjectId: gsId,
      date: new Date(),
      status: "active",
    })
    .returning();

  // Pre-insertar registros absent para todos los estudiantes del grupo
  const students = await db
    .select({ studentId: groupStudents.studentId })
    .from(groupStudents)
    .where(eq(groupStudents.groupId, gs.groupId));

  if (students.length > 0) {
    await db
      .insert(attendances)
      .values(students.map(s => ({ classSessionId: newSession.id, studentId: s.studentId, status: "absent" })))
      .onConflictDoNothing();
  }

  revalidatePath("/teacher/sessions");
  return { ok: true, sessionId: newSession.id };
}

export async function closeSession(sessionId: number) {
  const session = await auth();
  if (!session?.user) return { ok: false, message: "No autenticado." };

  const [cs] = await db
    .select({ id: classSessions.id, groupSubjectId: classSessions.groupSubjectId, status: classSessions.status })
    .from(classSessions)
    .where(eq(classSessions.id, sessionId))
    .limit(1);

  if (!cs || cs.status !== "active") return { ok: false, message: "Sesión no encontrada o ya cerrada." };

  // Obtener grupo desde groupSubjects
  const [gs] = await db
    .select({ groupId: groupSubjects.groupId })
    .from(groupSubjects)
    .where(eq(groupSubjects.id, cs.groupSubjectId))
    .limit(1);

  if (!gs) return { ok: false, message: "Error al obtener el grupo." };

  // Marcar ausentes a los estudiantes que no escanearon
  const students = await db
    .select({ studentId: groupStudents.studentId })
    .from(groupStudents)
    .where(eq(groupStudents.groupId, gs.groupId));

  for (const s of students) {
    await db
      .insert(attendances)
      .values({ classSessionId: sessionId, studentId: s.studentId, status: "absent" })
      .onConflictDoNothing();
  }

  // Cerrar sesión
  await db
    .update(classSessions)
    .set({ status: "closed", closedAt: new Date() })
    .where(eq(classSessions.id, sessionId));

  // Calcular alertas de asistencia (no bloqueante)
  checkAttendanceAlerts(sessionId).catch(() => {});

  revalidatePath("/teacher/sessions");
  return { ok: true };
}
