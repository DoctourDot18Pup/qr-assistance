"use server";

import { db } from "@/lib/db";
import { groups } from "@/lib/db/schema";

export async function createGroup(fd: FormData) {
  const name     = String(fd.get("name") ?? "").trim();
  const careerId = Number(fd.get("careerId"));
  const periodId = Number(fd.get("periodId"));

  if (!name || !careerId || !periodId) {
    return { ok: false, message: "Nombre, carrera y período son obligatorios." };
  }

  try {
    await db.insert(groups).values({ name, careerId, periodId });
    return { ok: true, message: "Grupo creado." };
  } catch {
    return { ok: false, message: "Ya existe un grupo con ese nombre en el período." };
  }
}
