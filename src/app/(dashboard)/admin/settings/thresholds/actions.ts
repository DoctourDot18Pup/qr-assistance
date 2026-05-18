"use server";

import { db } from "@/lib/db";
import { thresholdSettings } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function saveThresholds(fd: FormData) {
  const warning  = Number(fd.get("warning"));
  const critical = Number(fd.get("critical"));
  const risk     = Number(fd.get("risk"));

  if (isNaN(warning) || isNaN(critical) || isNaN(risk)) {
    return { ok: false, message: "Los valores deben ser números válidos." };
  }
  if (!(risk < critical && critical < warning)) {
    return { ok: false, message: "Los umbrales deben cumplir: riesgo < crítico < advertencia." };
  }
  if (warning > 100 || risk < 0) {
    return { ok: false, message: "Los valores deben estar entre 0 y 100." };
  }

  const updates = [
    { key: "warning_threshold",  value: String(warning),  description: "Umbral de advertencia (%)" },
    { key: "critical_threshold", value: String(critical), description: "Umbral crítico (%)" },
    { key: "risk_threshold",     value: String(risk),     description: "Umbral de riesgo de reprobación (%)" },
  ];

  for (const u of updates) {
    await db
      .insert(thresholdSettings)
      .values(u)
      .onConflictDoUpdate({
        target: thresholdSettings.key,
        set: { value: u.value, updatedAt: new Date() },
      });
  }

  revalidatePath("/admin/settings/thresholds");
  return { ok: true, message: "Umbrales guardados correctamente." };
}
