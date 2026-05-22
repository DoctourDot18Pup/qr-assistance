"use server";

import { db } from "@/lib/db";
import { classSessions, groupSubjects, groupStudents, attendances } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { checkAttendanceAlerts } from "@/lib/alerts";
import { markPresent } from "@/lib/db/queries/attendance";

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

  // Pre-insertar registros absent para todos los estudiantes de esta materia
  const students = await db
    .select({ studentId: groupStudents.studentId })
    .from(groupStudents)
    .where(eq(groupStudents.groupSubjectId, gsId));

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

  // Marcar ausentes a los estudiantes de esta materia que no escanearon
  const students = await db
    .select({ studentId: groupStudents.studentId })
    .from(groupStudents)
    .where(eq(groupStudents.groupSubjectId, cs.groupSubjectId));

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

export async function markManualAttendance(
  sessionId: number,
  studentId: number,
): Promise<{ ok: boolean; message?: string }> {
  const session = await auth();
  if (!session?.user) return { ok: false, message: "No autenticado." };

  const teacherId = Number(session.user.id);

  const [cs] = await db
    .select({ teacherId: groupSubjects.teacherId })
    .from(classSessions)
    .innerJoin(groupSubjects, eq(classSessions.groupSubjectId, groupSubjects.id))
    .where(eq(classSessions.id, sessionId))
    .limit(1);

  if (!cs) return { ok: false, message: "Sesión no encontrada." };
  if (cs.teacherId !== teacherId) return { ok: false, message: "Acceso denegado." };

  const [att] = await db
    .select({ status: attendances.status })
    .from(attendances)
    .where(and(
      eq(attendances.classSessionId, sessionId),
      eq(attendances.studentId, studentId),
    ))
    .limit(1);

  if (!att) return { ok: false, message: "Registro no encontrado." };
  if (att.status !== "absent") return { ok: false, message: "El alumno ya tiene asistencia registrada." };

  const result = await markPresent(sessionId, studentId, "manual");
  if (!result) return { ok: false, message: "No se pudo actualizar la asistencia." };

  revalidatePath(`/teacher/sessions/${sessionId}`);
  return { ok: true };
}
