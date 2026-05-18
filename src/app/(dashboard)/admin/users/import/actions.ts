"use server";

import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import bcrypt from "bcryptjs";
import { eq, or } from "drizzle-orm";
import { auth } from "@/lib/auth";

export type ImportRow = {
  name: string;
  email: string;
  enrollmentNumber: string;
  role: string;
};

export type ImportResult = {
  name: string;
  email: string;
  status: "created" | "skipped" | "error";
  message?: string;
};

export async function importUsers(rows: ImportRow[]): Promise<ImportResult[]> {
  const session = await auth();
  if (!session?.user || (session.user as { role?: string }).role !== "admin") {
    throw new Error("No autorizado");
  }

  const results: ImportResult[] = [];
  const hashed = await bcrypt.hash("Bienvenido123", 10);

  for (const row of rows) {
    const email = row.email.trim().toLowerCase();
    const name = row.name.trim();
    const role = row.role.trim().toLowerCase();
    const enrollmentNumber = row.enrollmentNumber?.trim() || null;

    if (!name || !email) {
      results.push({ name: row.name, email: row.email, status: "error", message: "Nombre o correo vacío." });
      continue;
    }

    if (!["student", "teacher", "admin"].includes(role)) {
      results.push({ name, email, status: "error", message: `Rol inválido: "${role}".` });
      continue;
    }

    try {
      const conditions = [eq(users.email, email)];
      if (enrollmentNumber) conditions.push(eq(users.enrollmentNumber, enrollmentNumber));

      const existing = await db
        .select({ id: users.id, email: users.email })
        .from(users)
        .where(or(...conditions))
        .limit(1);

      if (existing.length > 0) {
        const reason = existing[0].email === email ? "Correo ya registrado." : "Matrícula ya registrada.";
        results.push({ name, email, status: "skipped", message: reason });
        continue;
      }

      await db.insert(users).values({
        name,
        email,
        password: hashed,
        role,
        enrollmentNumber: enrollmentNumber ?? undefined,
      });

      results.push({ name, email, status: "created" });
    } catch {
      results.push({ name, email, status: "error", message: "Error interno al insertar." });
    }
  }

  return results;
}
