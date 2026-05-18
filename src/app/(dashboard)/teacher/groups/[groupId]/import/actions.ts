"use server";

import { db } from "@/lib/db";
import { users, groupStudents, groupSubjects, classSessions, attendances } from "@/lib/db/schema";
import bcrypt from "bcryptjs";
import { eq, and, or } from "drizzle-orm";
import { auth } from "@/lib/auth";

export type ImportRow = {
  name: string;
  email: string;
  enrollmentNumber: string;
};

export type ImportResult = {
  name: string;
  email: string;
  status: "created" | "enrolled" | "already" | "error";
  message?: string;
};

export async function importGroupStudents(
  groupId: number,
  rows: ImportRow[]
): Promise<ImportResult[]> {
  const session = await auth();
  if (!session?.user) throw new Error("No autorizado");

  const teacherId = Number(session.user.id);

  const [owned] = await db
    .select({ id: groupSubjects.id })
    .from(groupSubjects)
    .where(and(eq(groupSubjects.groupId, groupId), eq(groupSubjects.teacherId, teacherId)))
    .limit(1);

  if (!owned) throw new Error("No tienes acceso a este grupo.");

  const hashed = await bcrypt.hash("Bienvenido123", 10);

  const activeSessions = await db
    .select({ id: classSessions.id })
    .from(classSessions)
    .innerJoin(groupSubjects, eq(classSessions.groupSubjectId, groupSubjects.id))
    .where(and(eq(groupSubjects.groupId, groupId), eq(classSessions.status, "active")));

  const results: ImportResult[] = [];

  for (const row of rows) {
    const email = row.email.trim().toLowerCase();
    const name = row.name.trim();
    const enrollmentNumber = row.enrollmentNumber?.trim() || null;

    if (!name || !email) {
      results.push({ name: row.name, email: row.email, status: "error", message: "Nombre o correo vacío." });
      continue;
    }

    try {
      const conditions = [eq(users.email, email)];
      if (enrollmentNumber) conditions.push(eq(users.enrollmentNumber, enrollmentNumber));

      const existing = await db
        .select({ id: users.id })
        .from(users)
        .where(or(...conditions))
        .limit(1);

      let studentId: number;
      let userCreated = false;

      if (existing.length === 0) {
        const [newUser] = await db
          .insert(users)
          .values({ name, email, password: hashed, role: "student", enrollmentNumber: enrollmentNumber ?? undefined })
          .returning({ id: users.id });
        studentId = newUser.id;
        userCreated = true;
      } else {
        studentId = existing[0].id;
      }

      const alreadyEnrolled = await db
        .select()
        .from(groupStudents)
        .where(and(eq(groupStudents.groupId, groupId), eq(groupStudents.studentId, studentId)))
        .limit(1);

      if (alreadyEnrolled.length > 0) {
        results.push({ name, email, status: "already", message: "Ya está inscrito en este grupo." });
        continue;
      }

      await db.insert(groupStudents).values({ groupId, studentId });

      if (activeSessions.length > 0) {
        await db
          .insert(attendances)
          .values(activeSessions.map((s) => ({ classSessionId: s.id, studentId, status: "absent" })))
          .onConflictDoNothing();
      }

      results.push({
        name,
        email,
        status: userCreated ? "created" : "enrolled",
        message: userCreated ? "Usuario creado e inscrito." : "Usuario existente inscrito.",
      });
    } catch {
      results.push({ name, email, status: "error", message: "Error interno al procesar." });
    }
  }

  return results;
}
