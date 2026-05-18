"use server";

import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";

export async function createUser(fd: FormData) {
  const name             = String(fd.get("name") ?? "").trim();
  const email            = String(fd.get("email") ?? "").trim().toLowerCase();
  const password         = String(fd.get("password") ?? "");
  const role             = String(fd.get("role") ?? "student");
  const enrollmentNumber = String(fd.get("enrollmentNumber") ?? "").trim() || null;
  const phone            = String(fd.get("phone") ?? "").trim() || null;

  if (!name || !email || !password || !role) {
    return { ok: false, message: "Todos los campos obligatorios deben completarse." };
  }

  const existing = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
  if (existing.length > 0) {
    return { ok: false, message: "Ya existe un usuario con ese correo." };
  }

  const hashed = await bcrypt.hash(password, 10);

  await db.insert(users).values({
    name,
    email,
    password: hashed,
    role,
    enrollmentNumber: enrollmentNumber ?? undefined,
    phone: phone ?? undefined,
  });

  return { ok: true, message: "Usuario creado." };
}
